import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Package, Archive, ArrowRight, FileSpreadsheet } from 'lucide-react';
import { AsinInventory } from './AsinInventory';
import { SSInventory } from './SSInventory';
import { OrderProcessor } from './OrderProcessor';
type InventoryView = 'main' | 'asin' | 'ss' | 'orders';
export function Inventory() {
  console.log('Inventory component loaded, current view:', 'main');
  const [currentView, setCurrentView] = useState<InventoryView>('main');
  if (currentView === 'asin') {
    return <div className="min-h-screen bg-gradient-surface p-4 md:p-6">
        <div className="w-full space-y-6">
        <div className="flex justify-end">
          <Button variant="default" onClick={() => setCurrentView('main')} className="mb-4 bg-primary hover:bg-primary/90 text-primary-foreground">
            ← Back to Inventory Menu
          </Button>
        </div>
          <AsinInventory />
        </div>
      </div>;
  }
  if (currentView === 'ss') {
    return <div className="min-h-screen bg-gradient-surface p-4 md:p-6">
        <div className="w-full space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setCurrentView('main')} className="mb-4">
            ← Back to Inventory Menu
          </Button>
        </div>
          <SSInventory />
        </div>
      </div>;
  }
  if (currentView === 'orders') {
    return <div className="min-h-screen bg-gradient-surface p-4 md:p-6">
        <div className="w-full space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setCurrentView('main')} className="mb-4">
            ← Back to Inventory Menu
          </Button>
        </div>
          <OrderProcessor />
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-surface">
      <div className="w-full space-y-6">
        {/* Header */}
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
            Comprehensive inventory management system with real-time tracking and automated order processing
          </p>
        </div>

        {/* First Row - Inventory Type Selection */}
        <div className="grid md:grid-cols-2 gap-8 px-8 mb-12">
          {/* ASIN Inventory */}
          <Card className="relative overflow-hidden p-12 hover:shadow-2xl transition-all duration-700 cursor-pointer group border-0 hover:scale-[1.03] bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-800/50 backdrop-blur-xl" onClick={() => setCurrentView('asin')}>
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            </div>
            
            <div className="relative z-10 text-center space-y-8">
              {/* Enhanced Icon */}
              <div className="relative mx-auto w-fit">
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-700"></div>
                <div className="relative w-28 h-28 bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-12 group-hover:scale-110 transition-all duration-700 shadow-2xl shadow-purple-500/25 group-hover:shadow-purple-500/50">
                  <Package className="w-14 h-14 text-white drop-shadow-lg" />
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-white/20 to-transparent"></div>
                </div>
              </div>
              
              {/* Enhanced Title */}
              <div className="space-y-4">
                <h2 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-purple-800 to-slate-900 dark:from-white dark:via-purple-200 dark:to-white bg-clip-text text-transparent">
                  ASIN Inventory
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="w-12 h-0.5 bg-gradient-to-r from-purple-500 via-transparent to-purple-500"></div>
                </div>
              </div>
              
              {/* Enhanced Description */}
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg font-medium max-w-sm mx-auto">
                Advanced Amazon ASIN tracking with real-time inventory management and automated stock control
              </p>
              
              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="font-semibold">Real-time tracking</span>
                </div>
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-semibold">Auto sync</span>
                </div>
                <div className="flex items-center gap-2 text-pink-700 dark:text-pink-300">
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                  <span className="font-semibold">Smart alerts</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="font-semibold">Analytics</span>
                </div>
              </div>
              
              {/* Enhanced CTA */}
              <div className="pt-4">
                <div className="flex items-center justify-center gap-3 text-purple-600 dark:text-purple-400 group-hover:gap-6 transition-all duration-500 font-bold text-lg">
                  <span>Access ASIN Inventory</span>
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center group-hover:translate-x-2 group-hover:rotate-90 transition-all duration-500">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* SKU Inventory */}
          <Card className="glass-container p-10 hover:shadow-xl transition-all duration-500 cursor-pointer group border-2 hover:border-secondary/40 hover:scale-[1.02] bg-gradient-to-br from-background to-background/50" onClick={() => setCurrentView('ss')}>
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-6 transition-transform duration-300 shadow-lg group-hover:bg-orange-500/20">
                <Archive className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">SKU Inventory</h2>
              <p className="text-muted-foreground leading-relaxed">
                Manage inventory using SKU numbers with bin/serial number tracking. Ideal for warehouse management.
              </p>
              <div className="flex items-center justify-center gap-2 text-secondary group-hover:gap-4 transition-all duration-300">
                <span className="font-semibold">Open SKU Inventory</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>
        </div>

        {/* Second Row - Order Processing */}
        <div className="px-8">
          <Card className="glass-container p-10 hover:shadow-xl transition-all duration-500 cursor-pointer group border-2 hover:border-accent/40 hover:scale-[1.01] bg-gradient-to-br from-background to-background/50" onClick={() => setCurrentView('orders')}>
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-6 transition-transform duration-300 shadow-lg group-hover:bg-accent/20">
                <FileSpreadsheet className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-3xl font-bold text-foreground">Order Processing</h2>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
                Upload order files to automatically match ASINs/SKUs with your inventory and update stock levels in real-time. Streamline your fulfillment process.
              </p>
              <div className="flex items-center justify-center gap-3 text-accent group-hover:gap-5 transition-all duration-300">
                <span className="font-semibold text-lg">Process Orders</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Card>
        </div>

        
      </div>
    </div>;
}