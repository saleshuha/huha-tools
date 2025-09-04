import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Package, Archive, ArrowRight, FileSpreadsheet } from 'lucide-react';
import { AsinInventory } from './AsinInventory';
import { SSInventory } from './SSInventory';
import { OrderProcessor } from './OrderProcessor';

type InventoryView = 'main' | 'asin' | 'ss' | 'orders';

export function Inventory() {
  console.log('Inventory component loaded, current view:', 'main');
  const [currentView, setCurrentView] = useState<InventoryView>('main');

  if (currentView === 'asin') {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-gradient-to-br from-indigo-400/5 to-purple-400/5 rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative z-10 w-full space-y-8 p-4 md:p-8">
          {/* Enhanced Header with Back Button */}
          <div className="flex items-start justify-between mb-8">
            <Button 
              variant="outline" 
              onClick={() => setCurrentView('main')} 
              className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-orange-200/50 dark:border-orange-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform duration-300" />
              Back to Menu
            </Button>
            
            <div className="text-center mx-auto">
              <div className="flex items-center justify-center gap-4 mb-2">
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
          
          {/* Enhanced Content Container */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-700/30 shadow-2xl shadow-blue-500/10">
            <AsinInventory />
          </div>
        </div>
      </div>;
  }

  if (currentView === 'ss') {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/10 to-amber-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-0 w-64 h-64 bg-gradient-to-br from-amber-400/5 to-yellow-400/5 rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative z-10 w-full space-y-8 p-4 md:p-8">
          {/* Enhanced Header with Back Button */}
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
                  <Archive className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
                    SKU Inventory Management
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">Advanced SKU tracking with bin management</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Content Container */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-700/30 shadow-2xl shadow-orange-500/10">
            <SSInventory />
          </div>
        </div>
      </div>;
  }

  if (currentView === 'orders') {
    return <div className="min-h-screen bg-gradient-surface p-4 md:p-6">
        <div className="w-full space-y-6">
        <div className="flex items-start justify-between mb-8">
          <Button 
            variant="outline" 
            onClick={() => setCurrentView('main')} 
            className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-orange-200/50 dark:border-orange-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Menu
          </Button>
        </div>
          <OrderProcessor />
        </div>
      </div>;
  }

  return <div className="min-h-screen bg-gradient-surface">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
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

        {/* Cards Grid - All in one row */}
        <div className="grid md:grid-cols-3 gap-6 px-8 mb-6">
          {/* ASIN Inventory */}
          <Card className="relative overflow-hidden p-8 hover:shadow-xl transition-all duration-700 cursor-pointer group border-0 hover:scale-[1.02] bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-800/50 backdrop-blur-xl" onClick={() => setCurrentView('asin')}>
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            </div>
            
            <div className="relative z-10 text-center space-y-6">
              {/* Enhanced Icon */}
              <div className="relative mx-auto w-fit">
                <div className="absolute -inset-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-700"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-12 group-hover:scale-110 transition-all duration-700 shadow-xl shadow-orange-500/25 group-hover:shadow-orange-500/50">
                  <Package className="w-10 h-10 text-white drop-shadow-lg" />
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-white/20 to-transparent"></div>
                </div>
              </div>
              
              {/* Enhanced Title */}
              <div className="space-y-3">
                <h2 className="text-2xl font-black bg-gradient-to-r from-slate-900 via-orange-800 to-slate-900 dark:from-white dark:via-orange-200 dark:to-white bg-clip-text text-transparent">
                  ASIN Inventory
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <div className="w-8 h-0.5 bg-gradient-to-r from-orange-500 via-transparent to-orange-500"></div>
                </div>
              </div>
              
              {/* Enhanced Description */}
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base font-medium h-12 flex items-center justify-center">
                Advanced Amazon ASIN tracking with real-time management
              </p>
              
              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span className="font-semibold">Real-time</span>
                </div>
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                  <span className="font-semibold">Auto sync</span>
                </div>
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                  <span className="font-semibold">Alerts</span>
                </div>
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div>
                  <span className="font-semibold">Analytics</span>
                </div>
              </div>
              
              {/* Enhanced CTA */}
              <div className="pt-3">
                <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 group-hover:gap-4 transition-all duration-500 font-bold">
                  <span>Open ASIN</span>
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center group-hover:translate-x-1 group-hover:rotate-90 transition-all duration-500">
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* SKU Inventory */}
          <Card className="relative overflow-hidden p-8 hover:shadow-xl transition-all duration-700 cursor-pointer group border-0 hover:scale-[1.02] bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-800/50 backdrop-blur-xl" onClick={() => setCurrentView('ss')}>
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            </div>
            
            <div className="relative z-10 text-center space-y-6">
              {/* Enhanced Icon */}
              <div className="relative mx-auto w-fit">
                <div className="absolute -inset-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-700"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-12 group-hover:scale-110 transition-all duration-700 shadow-xl shadow-orange-500/25 group-hover:shadow-orange-500/50">
                  <Archive className="w-10 h-10 text-white drop-shadow-lg" />
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-white/20 to-transparent"></div>
                </div>
              </div>
              
              {/* Enhanced Title */}
              <div className="space-y-3">
                <h2 className="text-2xl font-black bg-gradient-to-r from-slate-900 via-orange-800 to-slate-900 dark:from-white dark:via-orange-200 dark:to-white bg-clip-text text-transparent">
                  SKU Inventory
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <div className="w-8 h-0.5 bg-gradient-to-r from-orange-500 via-transparent to-orange-500"></div>
                </div>
              </div>
              
              {/* Enhanced Description */}
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base font-medium h-12 flex items-center justify-center">
                SKU management with bin tracking and warehouse organization
              </p>
              
              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span className="font-semibold">Bin tracking</span>
                </div>
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                  <span className="font-semibold">Serial numbers</span>
                </div>
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                  <span className="font-semibold">Warehouse</span>
                </div>
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div>
                  <span className="font-semibold">Multi-location</span>
                </div>
              </div>
              
              {/* Enhanced CTA */}
              <div className="pt-3">
                <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 group-hover:gap-4 transition-all duration-500 font-bold">
                  <span>Open SKU</span>
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center group-hover:translate-x-1 group-hover:rotate-90 transition-all duration-500">
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Order Processing */}
          <Card className="relative overflow-hidden p-8 hover:shadow-xl transition-all duration-700 cursor-pointer group border-0 hover:scale-[1.02] bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-800/50 backdrop-blur-xl" onClick={() => setCurrentView('orders')}>
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-400/20 to-emerald-400/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            </div>
            
            <div className="relative z-10 text-center space-y-6">
              {/* Enhanced Icon */}
              <div className="relative mx-auto w-fit">
                <div className="absolute -inset-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-700"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-12 group-hover:scale-110 transition-all duration-700 shadow-xl shadow-emerald-500/25 group-hover:shadow-emerald-500/50">
                  <FileSpreadsheet className="w-10 h-10 text-white drop-shadow-lg" />
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-white/20 to-transparent"></div>
                </div>
              </div>
              
              {/* Enhanced Title */}
              <div className="space-y-3">
                <h2 className="text-2xl font-black bg-gradient-to-r from-slate-900 via-emerald-800 to-slate-900 dark:from-white dark:via-emerald-200 dark:to-white bg-clip-text text-transparent">
                  Order Processing
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  <div className="w-8 h-0.5 bg-gradient-to-r from-emerald-500 via-transparent to-emerald-500"></div>
                </div>
              </div>
              
              {/* Enhanced Description */}
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base font-medium h-12 flex items-center justify-center">
                Automated order fulfillment with intelligent matching
              </p>
              
              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  <span className="font-semibold">Auto match</span>
                </div>
                <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                  <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                  <span className="font-semibold">Bulk process</span>
                </div>
                <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                  <span className="font-semibold">Real-time</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                  <span className="font-semibold">Alerts</span>
                </div>
              </div>
              
              {/* Enhanced CTA */}
              <div className="pt-3">
                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 group-hover:gap-4 transition-all duration-500 font-bold">
                  <span>Process Orders</span>
                  <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center group-hover:translate-x-1 group-hover:rotate-90 transition-all duration-500">
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        
      </div>
    </div>;
}