import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Upload, ExternalLink, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NFTCreationFormProps {
  user: any;
  walletAddress?: string;
}

const SUPPORTED_CHAINS = [
  { value: "polygon-amoy", label: "Polygon Amoy Testnet", currency: "MATIC" },
  { value: "ethereum-sepolia", label: "Ethereum Sepolia", currency: "ETH" },
  { value: "base-sepolia", label: "Base Sepolia", currency: "ETH" },
];

const NFTCreationForm = ({ user, walletAddress }: NFTCreationFormProps) => {
  const [prompt, setPrompt] = useState("");
  const [selectedChain, setSelectedChain] = useState("polygon-amoy");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintedNFT, setMintedNFT] = useState<any>(null);
  const { toast } = useToast();

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt to generate an image",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: { prompt }
      });

      if (error) throw error;

      setGeneratedImage(data.imageUrl);
      
      // Generate metadata
      const metadataResponse = await supabase.functions.invoke('generate-ai-metadata', {
        body: { prompt, imageUrl: data.imageUrl }
      });

      if (metadataResponse.error) throw metadataResponse.error;

      setMetadata(metadataResponse.data);
      
      toast({
        title: "Success!",
        description: "Image and metadata generated successfully",
      });
    } catch (error: any) {
      console.error('Error generating image:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const mintNFT = async () => {
    if (!generatedImage || !metadata || !walletAddress) {
      toast({
        title: "Error",
        description: "Missing required data for minting",
        variant: "destructive",
      });
      return;
    }

    setIsMinting(true);
    try {
      // Create NFT record in database first
      const { data: nftData, error: dbError } = await supabase
        .from('nft_assets')
        .insert({
          owner_id: user.id,
          owner_address: walletAddress,
          prompt: prompt,
          ai_image_url: generatedImage,
          chain: selectedChain,
          name: metadata.name,
          description: metadata.description,
          attributes: metadata.attributes,
          status: 'minting'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Upload to IPFS and mint
      const { data, error } = await supabase.functions.invoke('mint-nft', {
        body: {
          nftId: nftData.id,
          imageUrl: generatedImage,
          metadata: metadata,
          chain: selectedChain,
          toAddress: walletAddress
        }
      });

      if (error) throw error;

      setMintedNFT(data);
      toast({
        title: "NFT Minted!",
        description: "Your NFT has been successfully minted on the blockchain",
      });
    } catch (error: any) {
      console.error('Error minting NFT:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mint NFT",
        variant: "destructive",
      });
    } finally {
      setIsMinting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      {/* Creation Form */}
      <Card className="glass-card neon-glow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-neon-purple" />
            <span>Create Your AI NFT</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prompt">Describe your NFT</Label>
            <Textarea
              id="prompt"
              placeholder="A cyberpunk cityscape with neon lights and flying cars, digital art style..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] bg-glass-bg/30 border-glass-border/50 focus:border-neon-purple/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chain">Blockchain</Label>
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger className="bg-glass-bg/30 border-glass-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CHAINS.map((chain) => (
                    <SelectItem key={chain.value} value={chain.value}>
                      {chain.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={generateImage}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-gradient-to-r from-neon-purple to-neon-blue text-white neon-glow"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isGenerating ? "Generating..." : "Generate Image"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Image & Metadata */}
      {generatedImage && metadata && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Generated NFT Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <img
                  src={generatedImage}
                  alt="Generated NFT"
                  className="w-full rounded-lg border border-glass-border/50 neon-glow"
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={metadata.name}
                    onChange={(e) => setMetadata({...metadata, name: e.target.value})}
                    className="bg-glass-bg/30 border-glass-border/50"
                  />
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={metadata.description}
                    onChange={(e) => setMetadata({...metadata, description: e.target.value})}
                    className="bg-glass-bg/30 border-glass-border/50"
                  />
                </div>

                <div>
                  <Label>Attributes</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {metadata.attributes?.map((attr: any, index: number) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <span className="text-muted-foreground">{attr.trait_type}:</span>
                        <span className="text-neon-blue">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={mintNFT}
                  disabled={isMinting || !walletAddress}
                  className="w-full bg-gradient-to-r from-neon-blue to-neon-pink text-white neon-glow"
                >
                  {isMinting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isMinting ? "Minting..." : "Mint NFT"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Minted NFT Success */}
      {mintedNFT && (
        <Card className="glass-card border-neon-blue/50">
          <CardHeader>
            <CardTitle className="text-neon-blue">🎉 NFT Successfully Minted!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Contract Address</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="bg-glass-bg/50 px-2 py-1 rounded font-mono text-xs">
                    {mintedNFT.contractAddress}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(mintedNFT.contractAddress)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Token ID</Label>
                <div className="mt-1">
                  <code className="bg-glass-bg/50 px-2 py-1 rounded font-mono text-xs">
                    {mintedNFT.tokenId}
                  </code>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {mintedNFT.txHash && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={`https://polygonscan.com/tx/${mintedNFT.txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="border-neon-blue/50 hover:bg-neon-blue/10"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Transaction
                  </a>
                </Button>
              )}
              
              {mintedNFT.ipfsImageUri && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={mintedNFT.ipfsImageUri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="border-neon-purple/50 hover:bg-neon-purple/10"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View on IPFS
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NFTCreationForm;