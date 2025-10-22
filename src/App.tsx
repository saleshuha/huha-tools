import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

import { CountryProvider } from "@/contexts/CountryContext";
import { BackgroundTasksProvider } from "@/contexts/BackgroundTasksContext";
import { ThemeConfigProvider } from "@/contexts/ThemeConfigContext";
import { FloatingProgressIndicator } from "@/components/FloatingProgressIndicator";
import { AppSidebar } from "@/components/AppSidebar";
import { CountrySwitcher } from "@/components/CountrySwitcher";
import { BackgroundTasksPanel } from "@/components/BackgroundTasksPanel";
import { ThemeColorWidget } from "@/components/theme/ThemeColorWidget";
import { Button } from "@/components/ui/button";
import { QZTrayStatusIndicator } from "@/components/QZTrayStatusIndicator";
import { Activity } from "lucide-react";
import Index from "./pages/Index";

import ExcelMapperPage from "./pages/ExcelMapper";
import BatchProcessor from "./pages/BatchProcessor";
import AsinQtySum from "./pages/AsinQtySum";
import ZipSplitter from "./pages/ZipSplitter";
import FileMergerPage from "./pages/FileMerger";
import Inventory from "./pages/Inventory";
import UserManagementPage from "./pages/UserManagement";
import ReplenishmentPage from "./pages/Replenishment";
import OrderProcessingPage from "./pages/OrderProcessing";
import POTrackerPage from "./pages/POTracker";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ExcelEditorPage from "./pages/ExcelEditor";
import NoonSalesTracker from "./pages/NoonSalesTracker";
import NoonDashboard from "./pages/NoonDashboard";
import NoonStores from "./pages/NoonStores";
import NoonSalesData from "./pages/NoonSalesData";
import NoonFeesReports from "./pages/NoonFeesReports";
import NoonAnalytics from "./pages/NoonAnalytics";
import PaymentReports from "./pages/PaymentReports";
import CarrefourSalesTracker from "./pages/CarrefourPayments";
import StoreSelection from "./pages/StoreSelection";
import SKUCostManagement from "./pages/SKUCostManagement";
import NoonOrderAnalysis from "./pages/NoonOrderAnalysis";
import ProcessedOrders from "./pages/ProcessedOrders";
import PODetailsPage from "./pages/PODetails";
import AmazonFulfillmentTracker from "./pages/AmazonFulfillmentTracker";
import AmazonImageUploader from "./pages/AmazonImageUploader";
import AmazonReturnsAnalysis from "./pages/AmazonReturnsAnalysis";
import AddSKUPage from "./pages/AddSKUPage";
import BulkColumnEditor from "./pages/BulkColumnEditor";
import SunskySKUImporterPage from "./pages/SunskySKUImporter";
import SunskyOrderTrackingPage from "./pages/SunskyOrderTracking";
import SunskyOrderDetails from "./pages/SunskyOrderDetails";
import SunskyApiDocumentation from "./pages/SunskyApiDocumentation";
import GlobalSources from "./pages/GlobalSources";
import NoonFileCleaner from "./pages/NoonFileCleaner";
import AmazonVendorCentral from "./pages/AmazonVendorCentral";
import LabelDesigner from "./pages/LabelDesigner";
import NoonOrderTrackingPage from "./pages/NoonOrderTracking";
import NoonOrderProcessingPage from "./pages/NoonOrderProcessing";
import PreviewSettings from "./pages/PreviewSettings";
import QZTrayPage from "./pages/QZTrayPage";
import { VelocityAnalyticsSimple } from "@/components/VelocityAnalyticsSimple";

import { useState as useReactState } from "react";
import { useToast } from "@/components/ui/use-toast";

// Wrapper component for AddSKUPage with proper onAddSKUs implementation
function AddSKUPageWrapper() {
  const [isLoading, setIsLoading] = useReactState(false);
  const { toast } = useToast();

  const handleAddSKUs = async (skus: any[]) => {
    console.log('=== AddSKUPageWrapper: handleAddSKUs called ===');
    console.log('SKUs to save:', skus.length);
    console.log('Sample SKUs:', skus.slice(0, 3));
    
    setIsLoading(true);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      console.log('Current user ID:', user.id);

      // Add user_id to each SKU
      const skusWithUserId = skus.map(sku => ({
        ...sku,
        user_id: user.id
      }));

      console.log('SKUs with user_id added:', skusWithUserId.slice(0, 3));

      const { data, error } = await supabase
        .from('sunsky_skus')
        .insert(skusWithUserId)
        .select();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }

      console.log('✅ Successfully inserted SKUs:', data?.length || 0);
      
      toast({
        title: "SKUs Saved Successfully",
        description: `${skus.length} SKUs have been saved to the database`,
      });
    } catch (error) {
      console.error('❌ Failed to save SKUs:', error);
      
      toast({
        title: "Save Failed",
        description: `Failed to save SKUs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      
      throw error; // Re-throw to let the caller handle it
    } finally {
      setIsLoading(false);
    }
  };

  return <AddSKUPage onAddSKUs={handleAddSKUs} isLoading={isLoading} />;
}

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBackgroundTasks, setShowBackgroundTasks] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, show auth page
  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // If user is authenticated, show main app
  return (
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <ThemeConfigProvider>
                <CountryProvider>
                  <BackgroundTasksProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SidebarProvider>
                <div className="min-h-screen flex w-full">
                  <AppSidebar />
                  <div className="flex-1 flex flex-col">
                    <header className="h-12 flex items-center border-b bg-background shadow-sm">
                      <div className="flex items-center justify-between w-full gap-4 px-4">
                        <div className="flex items-center gap-3">
                          <SidebarTrigger className="h-8 w-8" />
                          <div className="flex items-center gap-2">
                            <img 
                              src="/lovable-uploads/4f9a15c5-2d12-4ee0-b0bd-e982c5b4ece7.png" 
                              alt="HuHa Logo" 
                              className="h-6 w-6 object-contain"
                            />
                            <div className="flex flex-col">
                              <h1 className="font-semibold text-sm text-foreground">HuHa Product Management System</h1>
                              <p className="text-xs text-muted-foreground">Professional Inventory & Analytics Platform</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 flex justify-center">
                          <span className="text-xs font-medium text-muted-foreground">اللَّهُمَّ صل عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ</span>
                        </div>
                         <div className="flex items-center gap-2">
                           <QZTrayStatusIndicator />
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setShowBackgroundTasks(true)}
                             className="flex items-center gap-2"
                           >
                             <Activity className="h-4 w-4" />
                             Tasks
                           </Button>
                          <ThemeColorWidget />
                          <CountrySwitcher />
                        </div>
                      </div>
                    </header>
                    <main className="flex-1">
                      <div className="app-container">
                        <Routes>
                        <Route path="/" element={<Index />} />
                        
                        {/* Tools Routes - Hide in native app */}
                        {!isNative && (
                          <>
                            <Route path="/excel-mapper" element={<ExcelMapperPage />} />
                            <Route path="/batch" element={<BatchProcessor />} />
                            <Route path="/asin-sum" element={<AsinQtySum />} />
                            <Route path="/zip-splitter" element={<ZipSplitter />} />
                            <Route path="/file-merger" element={<FileMergerPage />} />
                            <Route path="/bulk-column-editor" element={<BulkColumnEditor />} />
                            <Route path="/excel-editor" element={<ExcelEditorPage />} />
                            <Route path="/noon-file-cleaner" element={<NoonFileCleaner />} />
                          </>
                        )}

                        {/* Main App Routes - Available in both web and mobile */}
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/processed-orders" element={<ProcessedOrders />} />
                        <Route path="/order-processing" element={<OrderProcessingPage />} />
                        <Route path="/users" element={<UserManagementPage />} />
                        <Route path="/preview-settings" element={<PreviewSettings />} />
                        <Route path="/replenishment" element={<ReplenishmentPage />} />
                        <Route path="/velocity-analytics" element={<VelocityAnalyticsSimple />} />
                        <Route path="/po-tracker" element={<POTrackerPage />} />
                        <Route path="/po-details/:poNumber" element={<PODetailsPage />} />
                         <Route path="/add-sku" element={<AddSKUPageWrapper />} />
                         <Route path="/sunsky-importer" element={<SunskySKUImporterPage />} />
                         <Route path="/sunsky-order-tracking" element={<SunskyOrderTrackingPage />} />
                         <Route path="/sunsky-order-details/:orderNumber" element={<SunskyOrderDetails />} />
                         <Route path="/sunsky-api-docs" element={<SunskyApiDocumentation />} />
                         <Route path="/global-sources" element={<GlobalSources />} />
                         <Route path="/source-order-tracking" element={<SunskyOrderTrackingPage />} />
                         <Route path="/noon-order-processing" element={<NoonOrderProcessingPage />} />
                         <Route path="/noon-order-tracking" element={<NoonOrderTrackingPage />} />
                         <Route path="/amazon-fulfillment" element={<AmazonFulfillmentTracker />} />
                         <Route path="/amazon-image-uploader" element={<AmazonImageUploader />} />
                         <Route path="/label-designer" element={<LabelDesigner />} />
                         <Route path="/qz-tray" element={<QZTrayPage />} />

                        {/* Desktop-only Routes - Hide in native app */}
                        {!isNative && (
                          <>
                            <Route path="/amazon-vendor-central" element={<AmazonVendorCentral />} />
                            <Route path="/amazon-returns-analysis" element={<AmazonReturnsAnalysis />} />
                          </>
                        )}

                        {/* Noon & Payment Routes - Available in both web and mobile */}
                        <Route path="/noon-sales-tracker" element={<NoonSalesTracker />} />
                        <Route path="/noon-dashboard" element={<NoonDashboard />} />
                        <Route path="/noon-stores" element={<NoonStores />} />
                        <Route path="/noon-sales-data" element={<NoonSalesData />} />
                        <Route path="/noon-fees-reports" element={<NoonFeesReports />} />
                        <Route path="/noon-analytics" element={<NoonAnalytics />} />
                        <Route path="/noon-order-analysis" element={<NoonOrderAnalysis />} />
                        <Route path="/payment-reports" element={<PaymentReports />} />
                        <Route path="/noon-sku-costs" element={<SKUCostManagement />} />
                        <Route path="/sku-costs" element={<SKUCostManagement />} />
                        <Route path="/carrefour-payments" element={<Navigate to="/stores" replace />} />
                        <Route path="/stores" element={<StoreSelection />} />
                        <Route path="/carrefour-payments/:storeId" element={<CarrefourSalesTracker />} />
                        
                        <Route path="/auth" element={<Navigate to="/" replace />} />
                        
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                        </Routes>
                      </div>
                    </main>
                  </div>
                </div>
                <FloatingProgressIndicator />
                <BackgroundTasksPanel 
                  isOpen={showBackgroundTasks} 
                  onClose={() => setShowBackgroundTasks(false)} 
                />
              </SidebarProvider>
            </BrowserRouter>
                  </BackgroundTasksProvider>
                </CountryProvider>
              </ThemeConfigProvider>
            </TooltipProvider>
          </QueryClientProvider>
  );
};

export default App;
