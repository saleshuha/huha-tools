import { POGroupWithMembers } from '@/types/po-groups';

export const consolidatePOGroupQuantity = (group: POGroupWithMembers): number => {
  return group.total_quantity;
};

export const getPriorityLabel = (priority?: number): string => {
  if (!priority) return '📦 P3 - Medium';
  
  const labels: Record<number, string> = {
    1: '🚀 P1 - Critical',
    2: '🔥 P2 - High',
    3: '📦 P3 - Medium',
    4: '📅 P4 - Low',
    5: '⏰ P5 - Minimal',
    6: '📋 P6 - Deferred',
    7: '🗂️ P7 - Backlog',
    8: '📁 P8 - Archive',
    9: '🔖 P9 - Reserve',
    10: '⬇️ P10 - Lowest',
  };
  return labels[priority] || `📦 P${priority}`;
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
