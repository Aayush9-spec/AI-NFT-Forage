import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Wallet, Image, Zap, Shield, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import NFTCreationForm from "@/components/NFTCreationForm";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        // Load wallet address from profile if available
        if (session?.user) {
          setTimeout(() => {
            loadUserProfile(session.user.id);
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          loadUserProfile(session.user.id);
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

  const connectWallet = async () => {
    if (!user) {
      toast({
        title: "Please sign in first",
        description: "You need to be authenticated to connect a wallet",
        variant: "destructive",
      });
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

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);

        // Save to database
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
      console.error('Wallet connection error:', error);
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Generation",
      description: "Transform text prompts into stunning digital art using advanced AI models"
    },
    {
      icon: Shield,
      title: "IPFS Storage",
      description: "Your NFTs are stored permanently on IPFS for decentralized, reliable access"
    },
    {
      icon: Globe,
      title: "Multi-Chain Support",
      description: "Mint on Polygon, Ethereum, Base, and transfer between chains seamlessly"
    },
    {
      icon: Zap,
      title: "Smart Pricing",
      description: "AI-powered price recommendations based on rarity and market analysis"
    }
  ];

  return (
    <div className="min-h-screen hero-bg ai-pattern">
      <Navigation 
        user={user} 
        onConnect={connectWallet} 
        walletAddress={walletAddress}
      />

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-8 py-12">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold gradient-text">
              AI NFT Forge
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Transform your imagination into valuable NFTs using cutting-edge AI technology. 
              Create, mint, and trade across multiple blockchains.
            </p>
          </div>

          {!user ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-gradient-to-r from-neon-purple to-neon-blue text-white neon-glow text-lg px-8 py-3"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Get Started
              </Button>
            </div>
          ) : !walletAddress ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg"
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-gradient-to-r from-neon-blue to-neon-pink text-white neon-glow text-lg px-8 py-3"
              >
                <Wallet className="w-5 h-5 mr-2" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            </div>
          ) : null}
        </section>

        {/* Features Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="glass-card hover:neon-glow transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-lg bg-gradient-to-br from-neon-purple to-neon-blue neon-glow flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* NFT Creation Form */}
        {user && walletAddress && (
          <section>
            <NFTCreationForm user={user} walletAddress={walletAddress} />
          </section>
        )}

        {/* Stats Section */}
        <section className="glass-card p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold gradient-text">∞</div>
              <div className="text-muted-foreground">Possibilities</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold gradient-text">3+</div>
              <div className="text-muted-foreground">Supported Chains</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold gradient-text">AI</div>
              <div className="text-muted-foreground">Powered</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
