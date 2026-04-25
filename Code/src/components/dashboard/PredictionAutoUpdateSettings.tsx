import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Clock, Link2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useStore } from '@/store/useStore';

export const PredictionAutoUpdateSettings: React.FC = () => {
  const {
    autoUpdateEnabled,
    autoUpdateInterval,
    autoLogToBlockchain,
    setAutoUpdateEnabled,
    setAutoUpdateInterval,
    setAutoLogToBlockchain,
  } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [tempInterval, setTempInterval] = useState(autoUpdateInterval);

  const handleSave = () => {
    setAutoUpdateInterval(tempInterval);
    setIsOpen(false);
  };

  const handleReset = () => {
    setTempInterval(autoUpdateInterval);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          title="Configure automatic prediction updates"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Prediction Auto-Update Settings</DialogTitle>
          <DialogDescription>
            Configure how predictions are automatically generated and logged to the blockchain network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable/Disable Auto-Update */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
            <div className="space-y-1">
              <div className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Enable Auto-Updates
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically generate predictions at regular intervals
              </p>
            </div>
            <button
              onClick={() => setAutoUpdateEnabled(!autoUpdateEnabled)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                autoUpdateEnabled ? 'bg-primary' : 'bg-muted-foreground'
              }`}
            >
              {autoUpdateEnabled ? (
                <ToggleRight className="w-4 h-4 text-white ml-1" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-white ml-1" />
              )}
            </button>
          </div>

          {/* Update Interval Selector */}
          {autoUpdateEnabled && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold">
                Update Interval: <span className="text-primary">{tempInterval} minutes</span>
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={tempInterval}
                  onChange={(e) => setTempInterval(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 min</span>
                  <span>120 min</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[5, 15, 30, 60].map((interval) => (
                  <Button
                    key={interval}
                    variant={tempInterval === interval ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTempInterval(interval)}
                    className="text-xs"
                  >
                    {interval}m
                  </Button>
                ))}
              </div>

              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
                <p>
                  New predictions will be generated and verified every <strong>{tempInterval} minutes</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Blockchain Logging Option */}
          {autoUpdateEnabled && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
              <div className="space-y-1">
                <div className="font-semibold flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-success" />
                  Log to Blockchain
                </div>
                <p className="text-sm text-muted-foreground">
                  Automatically record predictions on-chain with IPFS backup
                </p>
              </div>
              <button
                onClick={() => setAutoLogToBlockchain(!autoLogToBlockchain)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  autoLogToBlockchain ? 'bg-success' : 'bg-muted-foreground'
                }`}
              >
                {autoLogToBlockchain ? (
                  <ToggleRight className="w-4 h-4 text-white ml-1" />
                ) : (
                  <ToggleLeft className="w-4 h-4 text-white ml-1" />
                )}
              </button>
            </div>
          )}

          {/* Status Summary */}
          <div className="p-4 bg-card border border-border rounded-lg">
            <h4 className="font-semibold text-sm mb-3">Current Configuration</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auto-Update Status:</span>
                <Badge variant={autoUpdateEnabled ? 'default' : 'secondary'}>
                  {autoUpdateEnabled ? '● Active' : '○ Disabled'}
                </Badge>
              </div>
              {autoUpdateEnabled && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Update Frequency:</span>
                    <Badge variant="outline">Every {tempInterval} minutes</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Blockchain Logging:</span>
                    <Badge variant={autoLogToBlockchain ? 'default' : 'secondary'}>
                      {autoLogToBlockchain ? '● Enabled' : '○ Disabled'}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => {
              handleReset();
              setIsOpen(false);
            }}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PredictionAutoUpdateSettings;
