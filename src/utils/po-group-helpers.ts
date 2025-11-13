import { POGroupWithMembers } from '@/types/po-groups';

export const consolidatePOGroupQuantity = (group: POGroupWithMembers): number => {
  return group.total_quantity;
};

export const getPriorityLabel = (priority?: number): string => {
  if (!priority) return 'Normal';
  
  switch (priority) {
    case 1:
      return '⚡ Highest';
    case 2:
      return '🔴 High';
    case 3:
      return 'Normal';
    case 4:
      return 'Low';
    case 5:
      return 'Lowest';
    default:
      return 'Normal';
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
