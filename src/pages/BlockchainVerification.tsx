import { useState } from "react";
import { Blocks, Search, CheckCircle, XCircle, ExternalLink, Database, CloudOff, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function BlockchainVerification() {
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const handleVerify = () => {
    // Mock verification result
    setVerificationResult({
      verified: true,
      blockchainHash: "0x7a8f3b2c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
      blockNumber: 18542367,
      timestamp: new Date().toISOString(),
      prediction: {
        id: "PRED-2024-001234",
        timeframe: "1 hour",
        predictedPrice: 52680,
        actualPrice: 52745,
        accuracy: 99.88,
        confidence: 81,
      },
      cryptoProof: {
        originalHash: "sha256:a1b2c3d4e5f6...",
        ipfsHash: "QmX7y8z9A0B1C2D3E4F5...",
        contractRef: "0x1234...5678",
      },
    });
  };

  const recentVerifications = [
    { block: 18542367, hash: "0x7a8f...3b2c", predId: "PRED-001234", time: "5 min ago", status: "verified" },
    { block: 18542340, hash: "0x9c4e...8d1a", predId: "PRED-001233", time: "20 min ago", status: "verified" },
    { block: 18542312, hash: "0x3f2b...7e9c", predId: "PRED-001232", time: "35 min ago", status: "verified" },
    { block: 18542290, hash: "0x1d8a...4f6b", predId: "PRED-001231", time: "50 min ago", status: "verified" },
    { block: 18542268, hash: "0x5e7c...2a9d", predId: "PRED-001230", time: "1 hr ago", status: "verified" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Blockchain Verification</h1>
        <p className="text-muted-foreground text-sm">
          Verify prediction authenticity on-chain
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">12,847</div>
                <div className="text-sm text-muted-foreground">Total Predictions Logged</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Since Jan 1, 2024 • Latest: 5 min ago
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <Blocks className="w-6 h-6 text-success" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success pulse-live" />
                  <span className="text-lg font-semibold text-success">Ethereum Sepolia</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">
                  Contract: 0x7a8f...3b2c
                </div>
                <div className="text-xs text-muted-foreground">
                  Gas: 12 Gwei • Block: 18,542,367
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-chart-volume/10 flex items-center justify-center">
                <CloudOff className="w-6 h-6 text-chart-volume" />
              </div>
              <div>
                <div className="text-lg font-semibold">IPFS Storage</div>
                <div className="text-sm text-muted-foreground">2.4 GB / 5 GB used</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs text-success">Gateway: Operational</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Interface */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Prediction Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Prediction ID or Blockchain Hash..."
                className="pl-9 font-mono h-12"
              />
            </div>
            <Button onClick={handleVerify} className="h-12 px-8">
              Verify
            </Button>
          </div>

          {verificationResult && (
            <div className="space-y-6 animate-fade-in">
              {/* Verification Status */}
              <div className={cn(
                "p-6 rounded-lg border-2",
                verificationResult.verified 
                  ? "bg-success/5 border-success/30" 
                  : "bg-destructive/5 border-destructive/30"
              )}>
                <div className="flex items-center gap-4">
                  {verificationResult.verified ? (
                    <CheckCircle className="w-12 h-12 text-success" />
                  ) : (
                    <XCircle className="w-12 h-12 text-destructive" />
                  )}
                  <div>
                    <div className={cn(
                      "text-2xl font-bold",
                      verificationResult.verified ? "text-success" : "text-destructive"
                    )}>
                      {verificationResult.verified ? "✓ Verified" : "✗ Not Found"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Prediction logged on Ethereum blockchain
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Blockchain Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Blockchain Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Blockchain Hash</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{verificationResult.blockchainHash.slice(0, 18)}...</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Block Number</span>
                      <span className="font-mono">{verificationResult.blockNumber.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Timestamp</span>
                      <span className="font-mono text-sm">
                        {new Date(verificationResult.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prediction Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Prediction Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Prediction ID</span>
                      <Badge variant="outline">{verificationResult.prediction.id}</Badge>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Timeframe</span>
                      <span>{verificationResult.prediction.timeframe}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Predicted Price</span>
                      <span className="font-mono text-primary">
                        ${verificationResult.prediction.predictedPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Actual Price</span>
                      <span className="font-mono">
                        ${verificationResult.prediction.actualPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-semibold text-success">
                        {verificationResult.prediction.accuracy}%
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Confidence</span>
                      <Badge className="bg-success/20 text-success border-success/30">
                        {verificationResult.prediction.confidence}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cryptographic Proof */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Cryptographic Proof</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Original Hash</div>
                    <div className="font-mono text-sm break-all">{verificationResult.cryptoProof.originalHash}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">IPFS Hash</div>
                    <div className="font-mono text-sm break-all">{verificationResult.cryptoProof.ipfsHash}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Contract Reference</div>
                    <div className="font-mono text-sm">{verificationResult.cryptoProof.contractRef}</div>
                  </div>
                </div>
              </div>

              {/* Action Links */}
              <div className="flex gap-4">
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Etherscan
                </Button>
                <Button variant="outline">
                  <CloudOff className="w-4 h-4 mr-2" />
                  View on IPFS
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Verifications */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Blockchain Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Block</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Hash</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Prediction ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Timestamp</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentVerifications.map((item, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono">{item.block.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{item.hash}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-foreground" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{item.predId}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{item.time}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge className="bg-success/20 text-success border-success/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
