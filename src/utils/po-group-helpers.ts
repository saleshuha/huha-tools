import { POGroupWithMembers } from '@/types/po-groups';

export const consolidatePOGroupQuantity = (group: POGroupWithMembers): number => {
  return group.total_quantity;
};

export const getPriorityLabel = (priority?: number): string => {
  if (!priority) return '📦 3rd Nearest Shipment';
  
  switch (priority) {
    case 1:
      return '🚀 1st Nearest Shipment';
    case 2:
      return '🔥 2nd Nearest Shipment';
    case 3:
      return '📦 3rd Nearest Shipment';
    case 4:
      return '📅 4th Nearest Shipment';
    case 5:
      return '⏰ 5th Nearest Shipment';
    default:
      return '📦 3rd Nearest Shipment';
  }
};

export const getPriorityColor = (priority?: number): string => {
  if (!priority) return 'secondary';
  
  switch (priority) {
    case 1:
      return 'destructive';
    case 2:
      return 'destructive';
    case 3:
      return 'secondary';
    case 4:
      return 'outline';
    case 5:
      return 'outline';
    default:
      return 'secondary';
  }
};

export const sortPOsByPriority = (pos: any[]): any[] => {
  return [...pos].sort((a, b) => {
    const priorityA = a.priority || 3;
    const priorityB = b.priority || 3;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB; // Lower number = higher priority
    }
    
    // If priority is the same, sort by expected_delivery
    if (a.expected_delivery && b.expected_delivery) {
      return new Date(a.expected_delivery).getTime() - new Date(b.expected_delivery).getTime();
    }
    
    return 0;
  });
};

export const isAutoPriority = (priority?: number): boolean => {
  return (priority || 0) >= 6;
};

export const getAutoPriorityLabel = (priority?: number): string => {
  if (!priority || priority < 6) return '';
  return `📋 Unassigned (Priority ${priority})`;
};
