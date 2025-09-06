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

export const calculateItemsProgress = (items: any[]): { completedItems: number, totalItems: number, percentage: number } => {
  if (!items || items.length === 0) {
    return { completedItems: 0, totalItems: 0, percentage: 0 };
  }

  const totalItems = items.length;
  const completedItems = items.filter(item => {
    const status = mapNumericStatus(item.item_status || item.status || 'pending');
    return status === 'delivered' || status === 'shipped';
  }).length;

  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return { completedItems, totalItems, percentage };
};