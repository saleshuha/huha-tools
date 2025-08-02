import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Package, Hash, ArrowRight } from 'lucide-react';
import { AsinInventory } from './AsinInventory';
import { SSInventory } from './SSInventory';
type InventoryView = 'main' | 'asin' | 'ss';
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
  return <div className="min-h-screen bg-gradient-surface">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Package className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Instock Inventory</h1>
          </div>
          <p className="text-muted-foreground">
            Choose your inventory management system
          </p>
        </div>

        {/* Inventory Type Selection */}
        <div className="grid md:grid-cols-2 gap-8 px-8">
          {/* ASIN Inventory */}
          <Card className="glass-container p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-primary/30" onClick={() => setCurrentView('asin')}>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">ASIN Inventory</h2>
              <p className="text-muted-foreground">
                Track product inventory using Amazon ASINs and serial numbers. Perfect for Amazon sellers managing their stock.
              </p>
              
            </div>
          </Card>

          {/* SS Inventory */}
          <Card className="glass-container p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-secondary/30" onClick={() => setCurrentView('ss')}>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-secondary/20 transition-colors">
                <Hash className="w-8 h-8 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">SKU Inventory</h2>
              <p className="text-muted-foreground">
                Manage inventory using SKU numbers with bin/serial number tracking. Ideal for warehouse management.
              </p>
              <div className="flex items-center justify-center gap-2 text-secondary group-hover:gap-3 transition-all">
                <span className="font-medium">Open SKU Inventory</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Card>
        </div>

        
      </div>
    </div>;
}