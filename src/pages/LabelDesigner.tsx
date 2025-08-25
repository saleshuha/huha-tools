import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Palette, Printer, Settings } from "lucide-react";
import { LabelDashboard } from "@/components/label/LabelDashboard";
import { LabelDesigner } from "@/components/label/LabelDesigner";
import { PrintManager } from "@/components/label/PrintManager";
import { LabelSettings } from "@/components/label/LabelSettings";

export default function LabelDesignerPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Label Design & Print System
              </h1>
              <p className="text-muted-foreground text-lg">
                Create professional labels with drag-and-drop design tools
              </p>
            </div>
            <Badge variant="secondary" className="bg-gradient-accent text-accent-foreground">
              Professional Edition
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-xl p-1">
            <TabsTrigger 
              value="dashboard" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="designer" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Palette className="h-4 w-4" />
              Designer
            </TabsTrigger>
            <TabsTrigger 
              value="print" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Printer className="h-4 w-4" />
              Print Manager
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <LabelDashboard />
          </TabsContent>

          <TabsContent value="designer" className="space-y-4">
            <LabelDesigner />
          </TabsContent>

          <TabsContent value="print" className="space-y-4">
            <PrintManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <LabelSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}