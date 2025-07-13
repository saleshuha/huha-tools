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
              <header className="h-12 flex items-center border-b px-4 bg-background/95 backdrop-blur-sm">
                <div className="ml-6">
                  <SidebarTrigger className="bg-primary hover:bg-primary/90 text-primary-foreground border-primary" />
                </div>
                <div className="ml-8 flex items-center gap-3">
                  <img 
                    src="/lovable-uploads/4f9a15c5-2d12-4ee0-b0bd-e982c5b4ece7.png" 
                    alt="HuHa Logo" 
                    className="h-8 w-8 object-contain"
                  />
                  <h1 className="font-semibold text-lg text-foreground">HuHa Excel Tools</h1>
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
