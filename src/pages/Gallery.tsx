import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image as ImageIcon, Send, DollarSign, Loader2, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import NFTCard from "@/components/NFTCard";

const Gallery = () => {
  const [user, setUser] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [nfts, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; nftId: string }>({ open: false, nftId: '' });
  const [listDialog, setListDialog] = useState<{ open: boolean; nftId: string }>({ open: false, nftId: '' });
  const [transferForm, setTransferForm] = useState({ toAddress: '', chain: 'polygon-amoy' });
  const [listForm, setListForm] = useState({ price: '', currency: 'MATIC' });
  const [isTransferring, setIsTransferring] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChain, setFilterChain] = useState('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  const connectWallet = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!window.ethereum) {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to connect your wallet",
        variant: "destructive",
      });
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);

        const { error } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            wallet_address: address,
          });

        if (error) throw error;

        toast({
          title: "Wallet connected!",
          description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            loadUserProfile(session.user.id);
            loadUserNFTs(session.user.id);
          }, 0);
        } else {
          setNfts([]);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          loadUserProfile(session.user.id);
          loadUserNFTs(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('user_id', userId)
        .single();

      if (!error && data?.wallet_address) {
        setWalletAddress(data.wallet_address);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadUserNFTs = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nft_assets')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNfts(data || []);
    } catch (error: any) {
      console.error('Error loading NFTs:', error);
      toast({
        title: "Error",
        description: "Failed to load your NFTs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (nftId: string) => {
    if (!transferForm.toAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter a destination address",
        variant: "destructive",
      });
      return;
    }

    setIsTransferring(true);
    try {
      const { data, error } = await supabase.functions.invoke('transfer-nft', {
        body: {
          nftId,
          toAddress: transferForm.toAddress,
          chain: transferForm.chain
        }
      });

      if (error) throw error;

      toast({
        title: "Transfer initiated!",
        description: "Your NFT transfer has been submitted to the blockchain",
      });

      setTransferDialog({ open: false, nftId: '' });
      setTransferForm({ toAddress: '', chain: 'polygon-amoy' });
      
      // Reload NFTs
      if (user) {
        loadUserNFTs(user.id);
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast({
        title: "Transfer failed",
        description: error.message || "Failed to transfer NFT",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleList = async (nftId: string) => {
    if (!listForm.price.trim() || parseFloat(listForm.price) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    setIsListing(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .insert({
          nft_id: nftId,
          seller_id: user.id,
          seller_address: walletAddress,
          price: parseFloat(listForm.price),
          currency: listForm.currency,
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: "NFT listed!",
        description: "Your NFT has been listed on the marketplace",
      });

      setListDialog({ open: false, nftId: '' });
      setListForm({ price: '', currency: 'MATIC' });
    } catch (error: any) {
      console.error('Listing error:', error);
      toast({
        title: "Listing failed",
        description: error.message || "Failed to list NFT",
        variant: "destructive",
      });
    } finally {
      setIsListing(false);
    }
  };

  const filteredNFTs = nfts.filter(nft => {
    if (filterStatus !== 'all' && nft.status !== filterStatus) return false;
    if (filterChain !== 'all' && nft.chain !== filterChain) return false;
    return true;
  });

  if (!user) {
    return (
      <div className="min-h-screen hero-bg ai-pattern">
        <Navigation user={user} onConnect={connectWallet} walletAddress={walletAddress} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="glass-card w-full max-w-md">
            <CardHeader className="text-center">
              <ImageIcon className="w-12 h-12 mx-auto text-neon-purple mb-4" />
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to view your NFT gallery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/auth')}
                className="w-full bg-gradient-to-r from-neon-purple to-neon-blue text-white neon-glow"
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-bg ai-pattern">
      <Navigation user={user} onConnect={connectWallet} walletAddress={walletAddress} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">My NFT Gallery</h1>
            <p className="text-xl text-muted-foreground">
              Your collection of AI-generated NFTs
            </p>
          </div>

          {/* Filters */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="bg-glass-bg/30 border-glass-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="generating">Generating</SelectItem>
                      <SelectItem value="minting">Minting</SelectItem>
                      <SelectItem value="minted">Minted</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Chain</Label>
                  <Select value={filterChain} onValueChange={setFilterChain}>
                    <SelectTrigger className="bg-glass-bg/30 border-glass-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Chains</SelectItem>
                      <SelectItem value="polygon-amoy">Polygon Amoy</SelectItem>
                      <SelectItem value="ethereum-sepolia">Ethereum Sepolia</SelectItem>
                      <SelectItem value="base-sepolia">Base Sepolia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NFTs Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
            </div>
          ) : filteredNFTs.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <ImageIcon className="w-16 h-16 text-muted-foreground" />
                <h3 className="text-xl font-semibold">No NFTs found</h3>
                <p className="text-muted-foreground text-center">
                  {nfts.length === 0 
                    ? "You haven't created any NFTs yet. Start by creating your first one!"
                    : "No NFTs match your current filters. Try adjusting the filters above."
                  }
                </p>
                {nfts.length === 0 && (
                  <Button 
                    onClick={() => navigate('/')}
                    className="bg-gradient-to-r from-neon-purple to-neon-blue text-white neon-glow"
                  >
                    Create Your First NFT
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredNFTs.map((nft) => (
                <NFTCard
                  key={nft.id}
                  nft={nft}
                  onTransfer={(nftId) => setTransferDialog({ open: true, nftId })}
                  onList={(nftId) => setListDialog({ open: true, nftId })}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Transfer Dialog */}
      <Dialog open={transferDialog.open} onOpenChange={(open) => setTransferDialog({ open, nftId: '' })}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Transfer NFT</DialogTitle>
            <DialogDescription>
              Transfer your NFT to another wallet address
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Destination Address</Label>
              <Input
                placeholder="0x..."
                value={transferForm.toAddress}
                onChange={(e) => setTransferForm({ ...transferForm, toAddress: e.target.value })}
                className="bg-glass-bg/30 border-glass-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Chain</Label>
              <Select value={transferForm.chain} onValueChange={(value) => setTransferForm({ ...transferForm, chain: value })}>
                <SelectTrigger className="bg-glass-bg/30 border-glass-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="polygon-amoy">Polygon Amoy</SelectItem>
                  <SelectItem value="ethereum-sepolia">Ethereum Sepolia</SelectItem>
                  <SelectItem value="base-sepolia">Base Sepolia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => handleTransfer(transferDialog.nftId)}
              disabled={isTransferring}
              className="w-full bg-gradient-to-r from-neon-blue to-neon-pink text-white neon-glow"
            >
              {isTransferring ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {isTransferring ? "Transferring..." : "Transfer NFT"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* List Dialog */}
      <Dialog open={listDialog.open} onOpenChange={(open) => setListDialog({ open, nftId: '' })}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>List NFT for Sale</DialogTitle>
            <DialogDescription>
              Set a price and list your NFT on the marketplace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                type="number"
                step="0.001"
                placeholder="0.05"
                value={listForm.price}
                onChange={(e) => setListForm({ ...listForm, price: e.target.value })}
                className="bg-glass-bg/30 border-glass-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={listForm.currency} onValueChange={(value) => setListForm({ ...listForm, currency: value })}>
                <SelectTrigger className="bg-glass-bg/30 border-glass-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MATIC">MATIC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => handleList(listDialog.nftId)}
              disabled={isListing}
              className="w-full bg-gradient-to-r from-neon-purple to-neon-blue text-white neon-glow"
            >
              {isListing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="w-4 h-4 mr-2" />
              )}
              {isListing ? "Listing..." : "List for Sale"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gallery;