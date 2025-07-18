import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import ExcelMapperPage from "./pages/ExcelMapper";
import BatchProcessor from "./pages/BatchProcessor";
import AsinQtySum from "./pages/AsinQtySum";
import ZipSplitter from "./pages/ZipSplitter";
import Inventory from "./pages/Inventory";
import Payments from "./pages/Payments";
import SalesTracking from "./pages/SalesTracking";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <AppSidebar />
              <div className="flex-1 flex flex-col">
                <header className="h-12 flex items-center border-b bg-white shadow-sm">
                  <div className="flex items-center gap-3 pl-8 pr-4">
                    <SidebarTrigger className="bg-primary hover:bg-primary/90 text-primary-foreground border-primary" />
                    <div className="bg-primary/10 rounded-md p-1.5">
                      <img 
                        src="/lovable-uploads/4f9a15c5-2d12-4ee0-b0bd-e982c5b4ece7.png" 
                        alt="HuHa Logo" 
                        className="h-6 w-6 object-contain"
                      />
                    </div>
                    <div className="flex flex-col">
                      <h1 className="font-semibold text-base text-foreground tracking-wide">HuHa Product Management System</h1>
                      <p className="text-[10px] text-muted-foreground font-medium leading-tight">Professional Inventory & Analytics Platform</p>
                    </div>
                  </div>
                </header>
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/excel-mapper" element={<ExcelMapperPage />} />
                    <Route path="/batch" element={<BatchProcessor />} />
                    <Route path="/asin-sum" element={<AsinQtySum />} />
                    <Route path="/zip-splitter" element={<ZipSplitter />} />
                    <Route path="/sales-tracking" element={<SalesTracking />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/auth" element={<Navigate to="/" replace />} />
                    
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
