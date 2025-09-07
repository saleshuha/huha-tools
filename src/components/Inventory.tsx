import { AsinInventory } from './AsinInventory';
import { Package } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export function Inventory() {
  console.log('Inventory component loaded, current view:', 'main');
  
  return <AsinInventory />;
}