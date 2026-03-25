import { AsinInventory } from './AsinInventory';
import { Package } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export function Inventory() {
  console.log('Inventory component loaded, current view:', 'main');
  
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/3 rounded-full blur-2xl"></div>
      </div>
      
      <div className="relative z-10 w-full space-y-6">
        {/* Enhanced Header */}
        <HuhaHeader01
          icon={<Package className="w-5 h-5 text-primary-foreground" />}
          title="Instock Inventory Management"
          subtitle="Advanced Amazon ASIN tracking and analytics"
        />
        
        {/* Enhanced Content Container */}
        <div className="bg-card/60 dark:bg-card/60 backdrop-blur-xl rounded-3xl border border-border/20 shadow-xl mx-6">
          <AsinInventory />
        </div>
      </div>
    </div>
  );
}