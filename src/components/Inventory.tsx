import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Package, Archive, ArrowRight, FileSpreadsheet } from 'lucide-react';
import { AsinInventory } from './AsinInventory';

type InventoryView = 'main' | 'asin';

export function Inventory() {
  console.log('Inventory component loaded, current view:', 'main');
  const [currentView, setCurrentView] = useState<InventoryView>('main');

  if (currentView === 'asin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 w-full space-y-8 p-4 md:p-8">
          <div className="flex items-start justify-between mb-8">
            <Button 
              variant="outline" 
              onClick={() => setCurrentView('main')} 
              className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-orange-200/50 dark:border-orange-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform duration-300" />
              Back to Menu
            </Button>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <Package className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
                    ASIN Inventory Management
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">Advanced Amazon ASIN tracking and analytics</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-700/30 shadow-2xl shadow-blue-500/10">
            <AsinInventory />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full space-y-6">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg">
              <Package className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Instock Inventory
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive inventory management system with real-time tracking
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 px-8 mb-12">
          {/* ASIN Inventory */}
          <Card className="relative overflow-hidden p-8 hover:shadow-xl transition-all duration-700 cursor-pointer group border-0 hover:scale-[1.02] bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-800/50 backdrop-blur-xl" onClick={() => setCurrentView('asin')}>
            <div className="relative z-10 text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-3xl flex items-center justify-center mx-auto">
                <Package className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold">ASIN Inventory</h2>
              <p className="text-muted-foreground">Advanced Amazon ASIN tracking</p>
            </div>
          </Card>

          {/* SKU Inventory - Disabled */}
          <Card className="relative overflow-hidden p-8 opacity-50 cursor-not-allowed border-0 bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-800/50 backdrop-blur-xl">
            <div className="relative z-10 text-center space-y-6">
              <div className="w-20 h-20 bg-gray-400 rounded-3xl flex items-center justify-center mx-auto">
                <Archive className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-600">SKU Inventory</h2>
              <p className="text-gray-500">SKU management has been removed</p>
            </div>
          </Card>

          {/* Order Processing - Disabled */}
          <Card className="relative overflow-hidden p-8 opacity-50 cursor-not-allowed border-0 bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-800/50 backdrop-blur-xl">
            <div className="relative z-10 text-center space-y-6">
              <div className="w-20 h-20 bg-gray-400 rounded-3xl flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-600">Order Processing</h2>
              <p className="text-gray-500">Order processing has been removed</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}