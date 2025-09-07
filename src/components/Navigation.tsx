import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wallet, Sparkles, Image, ShoppingBag, User, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NavigationProps {
  user: any;
  onConnect: () => void;
  walletAddress?: string;
}

const Navigation = ({ user, onConnect, walletAddress }: NavigationProps) => {
  const location = useLocation();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const navItems = [
    { href: "/", label: "Create", icon: Sparkles },
    { href: "/gallery", label: "Gallery", icon: Image },
    { href: "/marketplace", label: "Market", icon: ShoppingBag },
  ];

  return (
    <nav className="glass-card border-b border-glass-border/30 sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-purple to-neon-blue neon-glow flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AI NFT Forge</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`flex items-center space-x-2 ${
                      isActive 
                        ? "bg-gradient-to-r from-neon-purple to-neon-blue text-white neon-glow" 
                        : "hover:bg-glass-bg/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Auth & Wallet */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                {/* Wallet Connection */}
                {walletAddress ? (
                  <div className="hidden sm:flex items-center space-x-2 px-3 py-2 rounded-lg bg-glass-bg/50 border border-glass-border/50">
                    <Wallet className="w-4 h-4 text-neon-blue" />
                    <span className="text-sm font-mono">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                  </div>
                ) : (
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    variant="outline"
                    className="border-neon-purple/50 hover:bg-neon-purple/10 hover:border-neon-purple"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </Button>
                )}

                {/* Profile Menu */}
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  className="hover:bg-glass-bg/50"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button 
                  variant="default"
                  className="bg-gradient-to-r from-neon-purple to-neon-blue text-white neon-glow hover:shadow-lg"
                >
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;