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
          <Card className="glass-container p-10 hover:shadow-xl transition-all duration-500 cursor-pointer group border-2 hover:border-primary/40 hover:scale-[1.02] bg-gradient-to-br from-background to-background/50" onClick={() => setCurrentView('asin')}>
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-6 transition-transform duration-300 shadow-lg">
                <Package className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">ASIN Inventory</h2>
              <p className="text-muted-foreground leading-relaxed">
                Track product inventory using Amazon ASINs and serial numbers. Perfect for Amazon sellers managing their stock.
              </p>
              
            </div>
          </Card>

          {/* SKU Inventory */}
          <Card className="glass-container p-10 hover:shadow-xl transition-all duration-500 cursor-pointer group border-2 hover:border-secondary/40 hover:scale-[1.02] bg-gradient-to-br from-background to-background/50" onClick={() => setCurrentView('ss')}>
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-secondary/10 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-6 transition-transform duration-300 shadow-lg group-hover:bg-secondary/20">
                <Archive className="w-10 h-10 text-secondary" />
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
              <div className="w-20 h-20 bg-gradient-to-br from-accent to-accent/70 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-6 transition-transform duration-300 shadow-lg">
                <FileSpreadsheet className="w-10 h-10 text-white" />
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