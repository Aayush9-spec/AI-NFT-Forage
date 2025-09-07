import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const verbwireApiKey = Deno.env.get('VERBWIRE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!verbwireApiKey) {
      throw new Error('Verbwire API key not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const { nftId, imageUrl, metadata, chain, toAddress } = await req.json();

    if (!nftId || !imageUrl || !metadata || !chain || !toAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Starting NFT minting process for NFT ID:', nftId);

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Upload image to IPFS via Verbwire
    console.log('Uploading image to IPFS...');
    
    const ipfsImageResponse = await fetch('https://api.verbwire.com/v1/nft/store/file', {
      method: 'POST',
      headers: {
        'X-API-Key': verbwireApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath: imageUrl,
        fileName: `${metadata.name.replace(/[^a-zA-Z0-9]/g, '_')}.webp`
      }),
    });

    if (!ipfsImageResponse.ok) {
      const errorText = await ipfsImageResponse.text();
      console.error('IPFS image upload error:', errorText);
      throw new Error('Failed to upload image to IPFS');
    }

    const ipfsImageData = await ipfsImageResponse.json();
    const ipfsImageUri = ipfsImageData.ipfs_storage?.ipfs_url || ipfsImageData.ipfs_url;
    
    console.log('Image uploaded to IPFS:', ipfsImageUri);

    // Step 2: Create and upload metadata to IPFS
    const nftMetadata = {
      name: metadata.name,
      description: metadata.description,
      image: ipfsImageUri,
      attributes: metadata.attributes || [],
      external_url: '',
      background_color: '',
      animation_url: '',
    };

    console.log('Uploading metadata to IPFS...');

    const ipfsMetadataResponse = await fetch('https://api.verbwire.com/v1/nft/store/metadata', {
      method: 'POST',
      headers: {
        'X-API-Key': verbwireApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nftMetadata),
    });

    if (!ipfsMetadataResponse.ok) {
      const errorText = await ipfsMetadataResponse.text();
      console.error('IPFS metadata upload error:', errorText);
      throw new Error('Failed to upload metadata to IPFS');
    }

    const ipfsMetadataData = await ipfsMetadataResponse.json();
    const ipfsMetadataUri = ipfsMetadataData.ipfs_storage?.ipfs_url || ipfsMetadataData.ipfs_url;

    console.log('Metadata uploaded to IPFS:', ipfsMetadataUri);

    // Step 3: Mint NFT using Verbwire QuickMint
    console.log('Minting NFT on chain:', chain);

    const chainMapping: { [key: string]: string } = {
      'polygon-amoy': 'polygon-amoy',
      'ethereum-sepolia': 'sepolia',
      'base-sepolia': 'base-sepolia'
    };

    const verbwireChain = chainMapping[chain] || 'polygon-amoy';

    const mintResponse = await fetch('https://api.verbwire.com/v1/nft/mint/quickMintFromMetadataUrl', {
      method: 'POST',
      headers: {
        'X-API-Key': verbwireApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientAddress: toAddress,
        metadataUrl: ipfsMetadataUri,
        name: metadata.name,
        description: metadata.description,
        chain: verbwireChain
      }),
    });

    if (!mintResponse.ok) {
      const errorText = await mintResponse.text();
      console.error('NFT minting error:', errorText);
      throw new Error('Failed to mint NFT on blockchain');
    }

    const mintData = await mintResponse.json();
    console.log('NFT minted successfully:', mintData);

    // Step 4: Update database with minting results
    const { error: updateError } = await supabase
      .from('nft_assets')
      .update({
        ipfs_image_uri: ipfsImageUri,
        ipfs_metadata_uri: ipfsMetadataUri,
        token_id: mintData.token_id || mintData.tokenId,
        contract_address: mintData.contract_address || mintData.contractAddress,
        tx_hash: mintData.transaction_hash || mintData.transactionHash,
        status: 'minted',
        price_suggestion: metadata.price_suggestion
      })
      .eq('id', nftId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to update NFT record');
    }

    console.log('NFT record updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        nftId,
        ipfsImageUri,
        ipfsMetadataUri,
        tokenId: mintData.token_id || mintData.tokenId,
        contractAddress: mintData.contract_address || mintData.contractAddress,
        txHash: mintData.transaction_hash || mintData.transactionHash,
        chain
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in mint-nft function:', error);
    
    // Try to update NFT status to failed if we have the nftId
    const { nftId } = await req.json().catch(() => ({}));
    if (nftId && supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('nft_assets')
          .update({ status: 'failed' })
          .eq('id', nftId);
      } catch (dbError) {
        console.error('Failed to update NFT status to failed:', dbError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: 'Failed to mint NFT',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});