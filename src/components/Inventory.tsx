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
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setCurrentView('main')}
          className="mb-4"
        >
          ← Back to Inventory Menu
        </Button>
        <AsinInventory />
      </div>
    );
  }

  if (currentView === 'ss') {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setCurrentView('main')}
          className="mb-4"
        >
          ← Back to Inventory Menu
        </Button>
        <SSInventory />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-4xl mx-auto space-y-6">
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
        <div className="grid md:grid-cols-2 gap-6">
          {/* ASIN Inventory */}
          <Card className="glass-container p-8 hover:shadow-lg transition-shadow cursor-pointer group" 
                onClick={() => setCurrentView('asin')}>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">ASIN Inventory</h2>
              <p className="text-muted-foreground">
                Track product inventory using Amazon ASINs and serial numbers. Perfect for Amazon sellers managing their stock.
              </p>
              <div className="flex items-center justify-center gap-2 text-primary group-hover:gap-3 transition-all">
                <span className="font-medium">Open ASIN Inventory</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Card>

          {/* SS Inventory */}
          <Card className="glass-container p-8 hover:shadow-lg transition-shadow cursor-pointer group" 
                onClick={() => setCurrentView('ss')}>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-secondary/20 transition-colors">
                <Hash className="w-8 h-8 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">SS Inventory</h2>
              <p className="text-muted-foreground">
                Manage inventory using SS numbers with product names and location tracking. Ideal for warehouse management.
              </p>
              <div className="flex items-center justify-center gap-2 text-secondary group-hover:gap-3 transition-all">
                <span className="font-medium">Open SS Inventory</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">ASIN Items</div>
                <div className="text-xl font-bold">
                  {(() => {
                    try {
                      const asinInventory = JSON.parse(localStorage.getItem('huha-inventory') || '[]');
                      return asinInventory.length;
                    } catch {
                      return 0;
                    }
                  })()}
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-secondary" />
              <div>
                <div className="text-sm text-muted-foreground">SS Items</div>
                <div className="text-xl font-bold">
                  {(() => {
                    try {
                      const ssInventory = JSON.parse(localStorage.getItem('huha-ss-inventory') || '[]');
                      return ssInventory.length;
                    } catch {
                      return 0;
                    }
                  })()}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}