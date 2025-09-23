import { AsinInventory } from './AsinInventory';
import { Package } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export function Inventory() {
  console.log('Inventory component loaded, current view:', 'main');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-gradient-to-br from-indigo-400/5 to-purple-400/5 rounded-full blur-2xl"></div>
      </div>
      
      <div className="relative z-10 w-full space-y-3 sm:space-y-6">
        {/* Enhanced Header */}
        <HuhaHeader01
          icon={<Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />}
          title="Instock Inventory Management"
          subtitle="Advanced Amazon ASIN tracking and analytics"
        />
        
        {/* Enhanced Content Container */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/20 dark:border-slate-700/30 shadow-2xl shadow-blue-500/10 mx-2 sm:mx-6">
          <AsinInventory />
        </div>
      </div>
    </div>
  );
}