import { AsinInventory } from './AsinInventory';
import { Package } from 'lucide-react';

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
      
      <div className="relative z-10 w-full space-y-8 p-4 md:p-8">
        {/* Enhanced Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-glow">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-sky to-cyan bg-clip-text text-transparent">
                  Instock Inventory Management
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
    </div>
  );
}