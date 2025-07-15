import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import BatchProcessor from "./pages/BatchProcessor";
import AsinQtySum from "./pages/AsinQtySum";
import Inventory from "./pages/Inventory";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
                  <Route path="/batch" element={<BatchProcessor />} />
                  <Route path="/asin-sum" element={<AsinQtySum />} />
                  <Route path="/inventory" element={<Inventory />} />
                  
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

export default App;
