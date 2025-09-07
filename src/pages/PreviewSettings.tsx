import React from 'react';
import { Settings, Palette, Layout, Square, Type, Table, RotateCcw, Save } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { HuhaTab01 } from '@/components/ui/huha-tab-01';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useThemeConfig } from '@/contexts/ThemeConfigContext';
import { useAccentTheme } from '@/hooks/useAccentTheme';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PreviewSettings = () => {
  const { config, setConfig, resetToDefaults } = useThemeConfig();
  const { themeColors } = useAccentTheme();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState('colors');

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your theme preferences have been saved successfully.",
    });
  };

  const handleReset = () => {
    resetToDefaults();
    toast({
      title: "Settings Reset",
      description: "All theme settings have been reset to defaults.",
    });
  };

  // Color Controls
  const ColorSettings = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Accent Colors
          </CardTitle>
          <CardDescription>
            Choose your primary accent color that will be used throughout the interface
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="grid grid-cols-4 gap-3">
            {themeColors.map((color) => (
              <button
                key={color.name}
                onClick={() => setConfig({ colorScheme: color.name })}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                  config.colorScheme === color.name 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <div
                  className="w-8 h-8 rounded-full shadow-md"
                  style={{ backgroundColor: `hsl(${color.primary})` }}
                />
                <span className="text-xs font-medium">{color.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Color Preview</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="flex gap-3">
            <Button>Primary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Badge>Sample Badge</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Header Controls
  const HeaderSettings = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Header Style
          </CardTitle>
          <CardDescription>
            Customize the appearance and spacing of page headers
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 space-y-4">
          <div className="space-y-2">
            <Label>Header Density</Label>
            <Select value={config.headerStyle} onValueChange={(value: any) => setConfig({ headerStyle: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact (80px)</SelectItem>
                <SelectItem value="default">Default (120px)</SelectItem>
                <SelectItem value="spacious">Spacious (160px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="header-gradient">Enable Gradient Background</Label>
            <Switch
              id="header-gradient"
              checked={config.headerGradient}
              onCheckedChange={(checked) => setConfig({ headerGradient: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Header Preview */}
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Header Preview</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="border-2 border-dashed border-border rounded-lg">
            <HuhaHeader01
              icon={<Settings className="h-6 w-6 text-white" />}
              title="Sample Header"
              subtitle="This is how your headers will look"
              actions={[
                { label: "Action", onClick: () => {} }
              ]}
              badges={[
                { label: "Status", icon: <Square className="h-3 w-3 mr-1" /> }
              ]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Button Settings
  const ButtonSettings = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Square className="h-5 w-5" />
            Button Styles
          </CardTitle>
          <CardDescription>
            Customize button appearance and effects
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 space-y-4">
          <div className="space-y-2">
            <Label>Button Style</Label>
            <Select value={config.buttonStyle} onValueChange={(value: any) => setConfig({ buttonStyle: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Rounded)</SelectItem>
                <SelectItem value="rounded">Extra Rounded</SelectItem>
                <SelectItem value="sharp">Sharp Corners</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="button-shadow">Enable Button Shadows</Label>
            <Switch
              id="button-shadow"
              checked={config.buttonShadow}
              onCheckedChange={(checked) => setConfig({ buttonShadow: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Button Preview */}
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Button Preview</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Field Settings
  const FieldSettings = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Form Fields
          </CardTitle>
          <CardDescription>
            Customize input fields and form elements
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 space-y-4">
          <div className="space-y-2">
            <Label>Field Style</Label>
            <Select value={config.fieldStyle} onValueChange={(value: any) => setConfig({ fieldStyle: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Outline)</SelectItem>
                <SelectItem value="filled">Filled Background</SelectItem>
                <SelectItem value="subtle">Subtle Border</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Focus Style</Label>
            <Select value={config.fieldFocus} onValueChange={(value: any) => setConfig({ fieldFocus: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Ring</SelectItem>
                <SelectItem value="glow">Glow Effect</SelectItem>
                <SelectItem value="underline">Underline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Field Preview */}
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Field Preview</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="space-y-4 max-w-sm">
            <div>
              <Label htmlFor="sample-input">Sample Input</Label>
              <Input id="sample-input" placeholder="Type something..." />
            </div>
            <div>
              <Label>Sample Select</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose option..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Option 1</SelectItem>
                  <SelectItem value="2">Option 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Table Settings
  const TableSettings = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            Table Styles
          </CardTitle>
          <CardDescription>
            Customize table appearance and density
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 space-y-4">
          <div className="space-y-2">
            <Label>Table Density</Label>
            <Select value={config.tableDensity} onValueChange={(value: any) => setConfig({ tableDensity: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="table-stripes">Zebra Stripes</Label>
            <Switch
              id="table-stripes"
              checked={config.tableStripes}
              onCheckedChange={(checked) => setConfig({ tableStripes: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="table-hover">Row Hover Effect</Label>
            <Switch
              id="table-hover"
              checked={config.tableHover}
              onCheckedChange={(checked) => setConfig({ tableHover: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Global Settings
  const GlobalSettings = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Global Settings</CardTitle>
          <CardDescription>
            Overall interface preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 space-y-4">
          <div className="space-y-2">
            <Label>Border Radius</Label>
            <Select value={config.borderRadius} onValueChange={(value: any) => setConfig({ borderRadius: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (0px)</SelectItem>
                <SelectItem value="small">Small (4px)</SelectItem>
                <SelectItem value="medium">Medium (8px)</SelectItem>
                <SelectItem value="large">Large (16px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="animations">Enable Animations</Label>
            <Switch
              id="animations"
              checked={config.animations}
              onCheckedChange={(checked) => setConfig({ animations: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const tabItems = [
    { value: 'colors', label: 'Colors', content: <ColorSettings /> },
    { value: 'header', label: 'Header', content: <HeaderSettings /> },
    { value: 'buttons', label: 'Buttons', content: <ButtonSettings /> },
    { value: 'fields', label: 'Fields', content: <FieldSettings /> },
    { value: 'tables', label: 'Tables', content: <TableSettings /> },
    { value: 'global', label: 'Global', content: <GlobalSettings /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <HuhaHeader01
        icon={<Settings className="h-6 w-6 text-white" />}
        title="Preview Settings"
        subtitle="Customize your interface design and appearance"
        actions={[
          {
            label: "Reset to Defaults",
            icon: <RotateCcw className="h-4 w-4 mr-2" />,
            onClick: handleReset,
            variant: "outline"
          },
          {
            label: "Save Settings",
            icon: <Save className="h-4 w-4 mr-2" />,
            onClick: handleSave,
            variant: "default"
          }
        ]}
        badges={[
          {
            label: `Theme: ${config.colorScheme}`,
            icon: <Palette className="h-3 w-3 mr-1" />
          }
        ]}
      />

      <div className="container mx-auto px-8 py-6">
        <HuhaTab01
          items={tabItems}
          value={activeTab}
          onValueChange={setActiveTab}
        />
      </div>
    </div>
  );
};

export default PreviewSettings;