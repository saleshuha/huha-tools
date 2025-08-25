import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Printer, 
  Palette,
  Database,
  Bell,
  Shield,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Save
} from "lucide-react";

export const LabelSettings = () => {
  const [settings, setSettings] = useState({
    autoSave: true,
    notifications: true,
    highQualityPreview: false,
    darkMode: false,
    backupEnabled: true,
    defaultLabelSize: "50x30",
    defaultPrinter: "zebra-1",
    gridSnap: true,
    showRuler: true
  });

  const updateSetting = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const printerPresets = [
    { id: "zebra-420", name: "Zebra ZD420", dpi: "203", type: "Thermal" },
    { id: "dymo-450", name: "DYMO LabelWriter 450", dpi: "300", type: "Direct Thermal" },
    { id: "brother-820", name: "Brother QL-820NWB", dpi: "300", type: "Thermal" },
  ];

  const labelSizePresets = [
    { value: "50x30", label: "50mm × 30mm (Standard Product)" },
    { value: "100x50", label: "100mm × 50mm (Large Product)" },
    { value: "75x40", label: "75mm × 40mm (Medium)" },
    { value: "25x15", label: "25mm × 15mm (Small Barcode)" },
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Design
          </TabsTrigger>
          <TabsTrigger value="printing" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Printing
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Auto-save Templates</Label>
                  <p className="text-xs text-muted-foreground">Automatically save template changes</p>
                </div>
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(checked) => updateSetting("autoSave", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Notifications</Label>
                  <p className="text-xs text-muted-foreground">Show print job and error notifications</p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(checked) => updateSetting("notifications", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">High Quality Previews</Label>
                  <p className="text-xs text-muted-foreground">Generate high-resolution preview images</p>
                </div>
                <Switch
                  checked={settings.highQualityPreview}
                  onCheckedChange={(checked) => updateSetting("highQualityPreview", checked)}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Default Label Size</Label>
                <select 
                  className="w-full p-2 border rounded"
                  value={settings.defaultLabelSize}
                  onChange={(e) => updateSetting("defaultLabelSize", e.target.value)}
                >
                  {labelSizePresets.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="space-y-6">
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-accent" />
                Design Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Grid Snap</Label>
                  <p className="text-xs text-muted-foreground">Snap elements to grid for precise alignment</p>
                </div>
                <Switch
                  checked={settings.gridSnap}
                  onCheckedChange={(checked) => updateSetting("gridSnap", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Show Ruler</Label>
                  <p className="text-xs text-muted-foreground">Display rulers around the canvas</p>
                </div>
                <Switch
                  checked={settings.showRuler}
                  onCheckedChange={(checked) => updateSetting("showRuler", checked)}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Default Font Settings</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Font Family</Label>
                    <select className="w-full p-2 border rounded text-sm">
                      <option>Arial</option>
                      <option>Helvetica</option>
                      <option>Times New Roman</option>
                      <option>Courier</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Font Size</Label>
                    <Input type="number" defaultValue="12" className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Font Color</Label>
                    <Input type="color" defaultValue="#000000" className="h-9" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Canvas Background</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm">White</Button>
                  <Button variant="outline" size="sm">Transparent</Button>
                  <Button variant="outline" size="sm">Grid</Button>
                  <Input type="color" defaultValue="#ffffff" className="w-12 h-9" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printing" className="space-y-6">
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-emerald" />
                Printer Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Default Printer</Label>
                <select 
                  className="w-full p-2 border rounded"
                  value={settings.defaultPrinter}
                  onChange={(e) => updateSetting("defaultPrinter", e.target.value)}
                >
                  {printerPresets.map((printer) => (
                    <option key={printer.id} value={printer.id}>
                      {printer.name} ({printer.type}, {printer.dpi} DPI)
                    </option>
                  ))}
                </select>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-sm font-medium">Print Quality Settings</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Default Quality</Label>
                    <select className="w-full p-2 border rounded">
                      <option>Standard (203 DPI)</option>
                      <option>High (300 DPI)</option>
                      <option>Draft (150 DPI)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Print Speed</Label>
                    <select className="w-full p-2 border rounded">
                      <option>Fast</option>
                      <option>Medium</option>
                      <option>Slow (High Quality)</option>
                    </select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Print Margins (mm)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Top</Label>
                    <Input type="number" defaultValue="2" step="0.1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Right</Label>
                    <Input type="number" defaultValue="2" step="0.1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bottom</Label>
                    <Input type="number" defaultValue="2" step="0.1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Left</Label>
                    <Input type="number" defaultValue="2" step="0.1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-sky" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Auto-backup Templates</Label>
                  <p className="text-xs text-muted-foreground">Automatically backup templates daily</p>
                </div>
                <Switch
                  checked={settings.backupEnabled}
                  onCheckedChange={(checked) => updateSetting("backupEnabled", checked)}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-sm font-medium">Import/Export</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button variant="outline" className="h-12">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Templates
                  </Button>
                  <Button variant="outline" className="h-12">
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-sm font-medium">Storage Information</Label>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Templates stored</span>
                    <Badge variant="secondary">12 templates</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Data files uploaded</span>
                    <Badge variant="secondary">8 files</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Storage used</span>
                    <Badge variant="secondary">2.4 GB</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-sm font-medium">System Actions</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button variant="outline" className="h-12 justify-start">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                  <Button variant="outline" className="h-12 justify-start text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Data
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Debug Information</Label>
                <div className="bg-muted/20 rounded-lg p-4 space-y-2 text-sm font-mono">
                  <div>Version: 1.0.0</div>
                  <div>Build: 2024.01.15</div>
                  <div>Browser: Chrome 120.0.0</div>
                  <div>Platform: Web</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Performance</Label>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Canvas rendering</span>
                    <Badge variant="secondary" className="bg-success/10 text-success">Optimal</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Memory usage</span>
                    <Badge variant="secondary">45 MB</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Print queue</span>
                    <Badge variant="secondary" className="bg-success/10 text-success">Active</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Settings */}
      <Card className="glass-container">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Settings are automatically saved as you make changes
            </p>
            <Button className="bg-gradient-primary hover:shadow-medium">
              <Save className="h-4 w-4 mr-2" />
              Save All Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};