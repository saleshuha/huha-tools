// Utility functions for calculating Sunsky order progress

export interface OrderProgressData {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  statusLabel: string;
  statusColor: string;
  isCompleted: boolean;
}

// Order status progression mapping
const ORDER_STATUS_PROGRESSION = {
  unpaid: { step: 1, label: 'Unpaid', color: 'bg-orange-500' },
  pending: { step: 2, label: 'Pending', color: 'bg-yellow-500' },
  ordered: { step: 2, label: 'Ordered', color: 'bg-yellow-500' },
  paid: { step: 3, label: 'Paid', color: 'bg-blue-500' },
  ready_to_ship: { step: 4, label: 'Ready to Ship', color: 'bg-cyan-500' },
  shipped: { step: 5, label: 'Shipped', color: 'bg-purple-500' },
  delivered: { step: 6, label: 'Delivered', color: 'bg-green-500' },
  cancelled: { step: 0, label: 'Cancelled', color: 'bg-red-500' },
  error: { step: 0, label: 'Error', color: 'bg-red-500' },
  api_error: { step: 0, label: 'API Error', color: 'bg-red-500' },
};

// Map numeric statuses to readable ones
const mapNumericStatus = (status: string | number): string => {
  const statusStr = String(status);
  switch (statusStr) {
    case '0': return 'unpaid';
    case '1': return 'ordered';
    case '4': return 'paid';
    case '5': return 'shipped';
    case '6': return 'delivered';
    default: return statusStr;
  }
};

export const calculateOrderProgress = (status: string | number): OrderProgressData => {
  const mappedStatus = mapNumericStatus(status);
  const progression = ORDER_STATUS_PROGRESSION[mappedStatus as keyof typeof ORDER_STATUS_PROGRESSION];
  
  if (!progression) {
    return {
      currentStep: 1,
      totalSteps: 6,
      percentage: 0,
      statusLabel: String(status),
      statusColor: 'bg-gray-500',
      isCompleted: false,
    };
  }

  const totalSteps = 6;
  const currentStep = progression.step;
  const percentage = currentStep === 0 ? 0 : Math.round((currentStep / totalSteps) * 100);
  const isCompleted = currentStep === totalSteps;

  return {
    currentStep,
    totalSteps,
    percentage,
    statusLabel: progression.label,
    statusColor: progression.color,
    isCompleted,
  };
};

export const getOrderSteps = () => [
  { id: 1, label: 'Unpaid', description: 'Order placed, awaiting payment' },
  { id: 2, label: 'Ordered', description: 'Payment confirmed, processing order' },
  { id: 3, label: 'Paid', description: 'Payment processed successfully' },
  { id: 4, label: 'Ready to Ship', description: 'Order prepared for shipping' },
  { id: 5, label: 'Shipped', description: 'Order dispatched' },
  { id: 6, label: 'Delivered', description: 'Order delivered successfully' },
];

// Helper to normalize status for consistent handling
export const normalizeStatus = (status: string | number): string => {
  return mapNumericStatus(status);
};

// Generate segmented progress data for multi-step progress bars
export const getSegmentedProgressData = (currentStep: number, totalSteps: number = 6) => {
  const segments = [];
  
  for (let i = 1; i <= totalSteps; i++) {
    segments.push({
      step: i,
      label: getStepLabel(i),
      isCompleted: i < currentStep,
      isActive: i === currentStep,
      isPending: i > currentStep
    });
  }
  
  return segments;
};

// Get step label by number
const getStepLabel = (step: number): string => {
  const labels = {
    1: 'Unpaid',
    2: 'Ordered', 
    3: 'Paid',
    4: 'Ready',
    5: 'Shipped',
    6: 'Delivered'
  };
  return labels[step as keyof typeof labels] || `Step ${step}`;
};

// Calculate items progress with additional metrics
export const calculateItemsProgress = (items: any[]): { 
  completedItems: number, 
  totalItems: number, 
  percentage: number,
  statusBreakdown: Record<string, number>
} => {
  if (!items || items.length === 0) {
    return { 
      completedItems: 0, 
      totalItems: 0, 
      percentage: 0, 
      statusBreakdown: {} 
    };
  }

  const totalItems = items.length;
  const statusBreakdown: Record<string, number> = {};
  
  let completedItems = 0;

  items.forEach(item => {
    const status = mapNumericStatus(item.item_status || item.status || 'pending');
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    
    if (status === 'delivered' || status === 'shipped') {
      completedItems++;
    }
  });

  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return { completedItems, totalItems, percentage, statusBreakdown };
};

// Check if an item is delayed
export const isItemDelayed = (item: any, thresholdDays: number = 3): boolean => {
  if (!item) return false;
  
  const status = mapNumericStatus(item.item_status || item.status || 'pending');
  
  // Don't mark shipped or delivered items as delayed
  if (status === 'shipped' || status === 'delivered') return false;
  
  const statusDate = item.status_last_updated_at || item.created_at;
  if (!statusDate) return false;
  
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(statusDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysSinceUpdate > thresholdDays;
};

// Calculate days in current status
export const getDaysInStatus = (item: any): number => {
  const statusDate = item.status_last_updated_at || item.created_at;
  if (!statusDate) return 0;
  
  return Math.floor(
    (Date.now() - new Date(statusDate).getTime()) / (1000 * 60 * 60 * 24)
  );
};