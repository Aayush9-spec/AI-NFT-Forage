import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Send, DollarSign, Copy, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NFTCardProps {
  nft: {
    id: string;
    name: string;
    description: string;
    ai_image_url: string;
    ipfs_image_uri?: string;
    ipfs_metadata_uri?: string;
    chain: string;
    token_id?: string;
    contract_address?: string;
    tx_hash?: string;
    attributes: any[];
    price_suggestion?: {
      min: number;
      mid: number;
      max: number;
      currency: string;
    };
    status: string;
    created_at: string;
  };
  onTransfer?: (nftId: string) => void;
  onList?: (nftId: string) => void;
  showActions?: boolean;
}

const NFTCard = ({ nft, onTransfer, onList, showActions = true }: NFTCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'minted':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'minting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'generating':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getChainColor = (chain: string) => {
    switch (chain) {
      case 'polygon-amoy':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'ethereum-sepolia':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'base-sepolia':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getExplorerUrl = (chain: string, txHash: string) => {
    switch (chain) {
      case 'polygon-amoy':
        return `https://amoy.polygonscan.com/tx/${txHash}`;
      case 'ethereum-sepolia':
        return `https://sepolia.etherscan.io/tx/${txHash}`;
      case 'base-sepolia':
        return `https://sepolia.basescan.org/tx/${txHash}`;
      default:
        return `https://polygonscan.com/tx/${txHash}`;
    }
  };

  return (
    <Card className="glass-card hover:neon-glow transition-all duration-300 overflow-hidden">
      <CardHeader className="p-0">
        <div className="relative">
          <img
            src={nft.ai_image_url}
            alt={nft.name}
            className="w-full h-64 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <div className="absolute top-2 left-2 flex gap-2">
            <Badge className={getStatusColor(nft.status)}>
              {nft.status}
            </Badge>
            <Badge className={getChainColor(nft.chain)}>
              {nft.chain.replace('-', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-lg truncate">{nft.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {nft.description}
          </p>
        </div>

        {/* Token Info */}
        {nft.token_id && nft.contract_address && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Token ID:</span>
              <code className="bg-glass-bg/50 px-2 py-1 rounded">
                {nft.token_id}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Contract:</span>
              <div className="flex items-center space-x-1">
                <code className="bg-glass-bg/50 px-2 py-1 rounded text-xs">
                  {nft.contract_address.slice(0, 6)}...{nft.contract_address.slice(-4)}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(nft.contract_address!, "Contract address")}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Price Suggestion */}
        {nft.price_suggestion && (
          <div className="space-y-2">
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI Price Range:</span>
              <div className="text-neon-blue font-mono">
                {nft.price_suggestion.min} - {nft.price_suggestion.max} {nft.price_suggestion.currency}
              </div>
            </div>
          </div>
        )}

        {/* Attributes */}
        {nft.attributes && nft.attributes.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-between text-sm"
            >
              <span>Attributes ({nft.attributes.length})</span>
              <Eye className="w-4 h-4" />
            </Button>
            
            {isExpanded && (
              <div className="grid grid-cols-2 gap-2">
                {nft.attributes.slice(0, 6).map((attr: any, index: number) => (
                  <div key={index} className="bg-glass-bg/30 rounded p-2 text-xs">
                    <div className="text-muted-foreground">{attr.trait_type}</div>
                    <div className="text-neon-blue font-medium">{attr.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && nft.status === 'minted' && (
          <div className="space-y-2">
            <Separator />
            <div className="flex gap-2">
              {onTransfer && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTransfer(nft.id)}
                  className="flex-1 border-neon-blue/50 hover:bg-neon-blue/10"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Transfer
                </Button>
              )}
              
              {onList && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onList(nft.id)}
                  className="flex-1 border-neon-purple/50 hover:bg-neon-purple/10"
                >
                  <DollarSign className="w-3 h-3 mr-1" />
                  List
                </Button>
              )}
            </div>
          </div>
        )}

        {/* External Links */}
        {(nft.tx_hash || nft.ipfs_image_uri) && (
          <div className="flex gap-2">
            {nft.tx_hash && (
              <Button
                size="sm"
                variant="ghost"
                asChild
                className="flex-1 text-xs hover:bg-glass-bg/50"
              >
                <a 
                  href={getExplorerUrl(nft.chain, nft.tx_hash)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Explorer
                </a>
              </Button>
            )}
            
            {nft.ipfs_image_uri && (
              <Button
                size="sm"
                variant="ghost"
                asChild
                className="flex-1 text-xs hover:bg-glass-bg/50"
              >
                <a 
                  href={nft.ipfs_image_uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  IPFS
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NFTCard;