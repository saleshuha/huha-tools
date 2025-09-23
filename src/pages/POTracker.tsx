import { POTracker } from '@/components/POTracker';
import { ShoppingCart } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export default function POTrackerPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full animate-fade-in">
        <POTracker />
      </div>
    </div>
  );
}