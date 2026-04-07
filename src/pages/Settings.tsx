import { User, Bell, Key, Palette, Shield, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Settings() {
  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="profile" className="text-xs sm:text-sm">
            <User className="w-4 h-4 mr-2 hidden sm:block" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="trading" className="text-xs sm:text-sm">
            Trading
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm">
            <Bell className="w-4 h-4 mr-2 hidden sm:block" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="api" className="text-xs sm:text-sm">
            <Key className="w-4 h-4 mr-2 hidden sm:block" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm">
            <Shield className="w-4 h-4 mr-2 hidden sm:block" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">JD</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">Change Avatar</Button>
                  <p className="text-xs text-muted-foreground">JPG, GIF or PNG. Max size 2MB.</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time (EST)</SelectItem>
                      <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                      <SelectItem value="gmt">GMT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Display Currency</Label>
                  <Select defaultValue="usd">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                      <SelectItem value="gbp">GBP (£)</SelectItem>
                      <SelectItem value="btc">BTC (₿)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trading Settings */}
        <TabsContent value="trading">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Trading Preferences</CardTitle>
              <CardDescription>Configure your default trading settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultSize">Default Order Size (BTC)</Label>
                  <Input id="defaultSize" type="number" defaultValue="0.1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Conservative)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="high">High (Aggressive)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stopLoss">Default Stop Loss (%)</Label>
                  <Input id="stopLoss" type="number" defaultValue="5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="takeProfit">Default Take Profit (%)</Label>
                  <Input id="takeProfit" type="number" defaultValue="10" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Auto-Trading Settings</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Auto-Trading</Label>
                    <p className="text-sm text-muted-foreground">Automatically execute trades based on AI predictions</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Minimum Confidence Threshold</Label>
                    <p className="text-sm text-muted-foreground">Only trade when confidence is above this level</p>
                  </div>
                  <Input type="number" defaultValue="75" className="w-20" />
                </div>
              </div>

              <Button>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Browser push notifications</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Alerts</Label>
                    <p className="text-sm text-muted-foreground">Critical alerts via SMS</p>
                  </div>
                  <Switch />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Notification Triggers</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Price Alerts</Label>
                    <p className="text-sm text-muted-foreground">When price changes significantly</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Prediction Updates</Label>
                    <p className="text-sm text-muted-foreground">New predictions generated</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Security Alerts</Label>
                    <p className="text-sm text-muted-foreground">High-risk transaction detected</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Trade Executions</Label>
                    <p className="text-sm text-muted-foreground">When trades are executed</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Button>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Settings */}
        <TabsContent value="api">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>API Keys Management</CardTitle>
              <CardDescription>Connect external services and APIs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Kraken API</Label>
                      <p className="text-sm text-muted-foreground">Connected</p>
                    </div>
                    <Button variant="outline" size="sm">Update</Button>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    Key: ****************************1234
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Alpha Vantage API</Label>
                      <p className="text-sm text-muted-foreground">Connected</p>
                    </div>
                    <Button variant="outline" size="sm">Update</Button>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    Key: ****************************5678
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Etherscan API</Label>
                      <p className="text-sm text-destructive">Not Connected</p>
                    </div>
                    <Button size="sm">Connect</Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Webhooks</h4>
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input placeholder="https://your-server.com/webhook" />
                </div>
                <Button variant="outline">Add Webhook</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" />
                </div>
                <Button variant="outline">Change Password</Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline" size="sm">Enable 2FA</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Active Sessions</h4>
                <div className="p-4 rounded-lg bg-muted/30 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Current Session</p>
                    <p className="text-sm text-muted-foreground">Chrome on MacOS • San Francisco, CA</p>
                  </div>
                  <span className="text-xs text-success">Active now</span>
                </div>
                <Button variant="destructive" size="sm">Sign Out All Other Sessions</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
