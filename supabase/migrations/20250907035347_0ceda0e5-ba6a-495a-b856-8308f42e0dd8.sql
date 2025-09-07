-- Create users profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT UNIQUE,
  preferred_chain TEXT DEFAULT 'polygon-amoy',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create NFT assets table
CREATE TABLE public.nft_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_address TEXT NOT NULL,
  prompt TEXT NOT NULL,
  ai_image_url TEXT,
  ipfs_image_uri TEXT,
  ipfs_metadata_uri TEXT,
  chain TEXT NOT NULL,
  token_id TEXT,
  contract_address TEXT,
  tx_hash TEXT,
  name TEXT NOT NULL,
  description TEXT,
  attributes JSONB DEFAULT '[]'::jsonb,
  price_suggestion JSONB,
  status TEXT DEFAULT 'minting' CHECK (status IN ('generating', 'minting', 'minted', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create marketplace listings table
CREATE TABLE public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nft_id UUID NOT NULL REFERENCES public.nft_assets(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_address TEXT NOT NULL,
  price DECIMAL(18,8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MATIC',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transfer history table
CREATE TABLE public.transfer_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nft_id UUID NOT NULL REFERENCES public.nft_assets(id) ON DELETE CASCADE,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  from_chain TEXT NOT NULL,
  to_chain TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- NFT assets policies
CREATE POLICY "Users can view all NFTs" 
ON public.nft_assets FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own NFTs" 
ON public.nft_assets FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own NFTs" 
ON public.nft_assets FOR UPDATE 
USING (auth.uid() = owner_id);

-- Marketplace listings policies
CREATE POLICY "Everyone can view active listings" 
ON public.marketplace_listings FOR SELECT 
USING (status = 'active');

CREATE POLICY "Users can create their own listings" 
ON public.marketplace_listings FOR INSERT 
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own listings" 
ON public.marketplace_listings FOR UPDATE 
USING (auth.uid() = seller_id);

-- Transfer history policies
CREATE POLICY "Users can view transfers of their NFTs" 
ON public.transfer_history FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.nft_assets 
    WHERE id = nft_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create transfer records for their NFTs" 
ON public.transfer_history FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nft_assets 
    WHERE id = nft_id AND owner_id = auth.uid()
  )
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nft_assets_updated_at
  BEFORE UPDATE ON public.nft_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_nft_assets_owner_id ON public.nft_assets(owner_id);
CREATE INDEX idx_nft_assets_owner_address ON public.nft_assets(owner_address);
CREATE INDEX idx_nft_assets_chain ON public.nft_assets(chain);
CREATE INDEX idx_nft_assets_status ON public.nft_assets(status);
CREATE INDEX idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX idx_profiles_wallet_address ON public.profiles(wallet_address);