import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  LayoutDashboard, 
  Palette, 
  Printer, 
  Settings,
  Loader2,
  CheckCircle
} from "lucide-react";
import { LabelDashboard } from "@/components/label/LabelDashboard";
import { LabelDesigner } from "@/components/label/LabelDesigner";
import { PrintManager } from "@/components/label/PrintManager";
import { LabelSettings } from "@/components/label/LabelSettings";
import { motion, AnimatePresence } from "framer-motion";

interface AppState {
  isLoading: boolean;
  loadingProgress: number;
  isInitialized: boolean;
}

export default function LabelDesignerPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [appState, setAppState] = useState<AppState>({
    isLoading: true,
    loadingProgress: 0,
    isInitialized: false
  });

  // Initialize app with loading sequence
  useEffect(() => {
    const initializeApp = async () => {
      const steps = [
        { name: "Loading canvas engine...", duration: 800 },
        { name: "Initializing print drivers...", duration: 600 },
        { name: "Loading templates...", duration: 500 },
        { name: "Setting up workspace...", duration: 400 },
      ];

      let progress = 0;
      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.duration));
        progress += 25;
        setAppState(prev => ({ ...prev, loadingProgress: progress }));
      }

      setAppState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isInitialized: true 
      }));
    };

    initializeApp();
  }, []);

  if (appState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-container p-12 max-w-md w-full mx-4 text-center"
        >
          <div className="mb-8">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Palette className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Label Designer Pro
            </h2>
            <p className="text-muted-foreground">
              Initializing advanced design studio...
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">{appState.loadingProgress}%</span>
            </div>
            <Progress value={appState.loadingProgress} className="h-2" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-6 py-8"
        >
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
                  <Palette className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Label Designer Pro
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Professional label design & printing studio
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Studio Ready
                </Badge>
                <Badge variant="outline" className="border-primary/20 text-primary">
                  Professional Edition
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Navigation Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <div className="flex justify-center">
                <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 shadow-lg rounded-2xl p-1">
                  <TabsTrigger 
                    value="dashboard" 
                    className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="designer" 
                    className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                  >
                    <Palette className="h-4 w-4" />
                    <span className="hidden sm:inline">Designer</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="print" 
                    className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                  >
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">Print</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings" 
                    className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <TabsContent value="dashboard" className="space-y-6 mt-8">
                    <LabelDashboard />
                  </TabsContent>

                  <TabsContent value="designer" className="space-y-6 mt-8">
                    <LabelDesigner />
                  </TabsContent>

                  <TabsContent value="print" className="space-y-6 mt-8">
                    <PrintManager />
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-6 mt-8">
                    <LabelSettings />
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}