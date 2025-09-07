import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import NFTCard from "@/components/NFTCard";

const Marketplace = () => {
  const [user, setUser] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          loadUserProfile(session.user.id);
        }, 0);
      }
    });

    loadMarketplaceListings();

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

  const loadMarketplaceListings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(`
          *,
          nft_assets (*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error: any) {
      console.error('Error loading marketplace:', error);
      toast({
        title: "Error",
        description: "Failed to load marketplace listings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-bg ai-pattern">
      <Navigation user={user} onConnect={connectWallet} walletAddress={walletAddress} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">NFT Marketplace</h1>
            <p className="text-xl text-muted-foreground">
              Discover and collect unique AI-generated NFTs
            </p>
          </div>

          {/* Listings */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
            </div>
          ) : listings.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <ShoppingBag className="w-16 h-16 text-muted-foreground" />
                <h3 className="text-xl font-semibold">No listings available</h3>
                <p className="text-muted-foreground text-center">
                  Be the first to list your NFT on the marketplace!
                </p>
                <Button 
                  onClick={() => navigate('/gallery')}
                  className="bg-gradient-to-r from-neon-purple to-neon-blue text-white neon-glow"
                >
                  View Your Gallery
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <div key={listing.id} className="relative">
                  <NFTCard
                    nft={listing.nft_assets}
                    showActions={false}
                  />
                  <div className="absolute bottom-2 left-2 right-2">
                    <Card className="glass-card">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">Price</div>
                            <div className="font-bold text-neon-blue">
                              {listing.price} {listing.currency}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-neon-blue to-neon-pink text-white neon-glow"
                            disabled={!user || !walletAddress}
                          >
                            Buy Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Marketplace;