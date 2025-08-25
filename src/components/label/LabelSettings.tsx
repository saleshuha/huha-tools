import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Settings, Printer, Database, Shield, Save } from "lucide-react";

export const LabelSettings = () => {
  const [settings, setSettings] = useState({
    autoSave: true,
    notifications: true,
    highQuality: false,
    gridSnap: true,
    showRuler: true,
    backupEnabled: true
  });

  const updateSetting = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(settings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                <Switch
                  checked={value}
                  onCheckedChange={(checked) => updateSetting(key, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald" />
              System Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Version</span>
              <Badge>v1.2.0</Badge>
            </div>
            <div className="flex justify-between">
              <span>Templates</span>
              <Badge>24 saved</Badge>
            </div>
            <div className="flex justify-between">
              <span>Storage</span>
              <Badge>2.4 GB used</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <Button className="bg-gradient-primary hover:shadow-lg">
            <Save className="h-4 w-4 mr-2" />
            Save All Settings
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};