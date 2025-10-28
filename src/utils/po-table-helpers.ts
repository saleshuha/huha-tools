/**
 * Calculate pagination values
 */
export function calculatePagination(
  totalItems: number,
  currentPage: number,
  itemsPerPage: number
) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return {
    totalPages,
    startIndex,
    endIndex,
  };
}

/**
 * Get paginated slice of items
 */
export function getPaginatedItems<T>(
  items: T[],
  currentPage: number,
  itemsPerPage: number
): T[] {
  if (items.length === 0) return [];
  
  // Ensure currentPage is within valid bounds
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const validPage = Math.max(1, Math.min(currentPage, totalPages));
  
  const { startIndex, endIndex } = calculatePagination(
    items.length,
    validPage,
    itemsPerPage
  );
  
  const result = items.slice(startIndex, endIndex);
  
  // Debug logging
  if (result.length === 0 && items.length > 0) {
    console.error('⚠️ getPaginatedItems returned empty array:', {
      totalItems: items.length,
      requestedPage: currentPage,
      validPage,
      totalPages,
      startIndex,
      endIndex
    });
  }
  
  return result;
}

/**
 * Scroll to top of element smoothly
 */
export function scrollToTop(elementId?: string) {
  const element = elementId ? document.getElementById(elementId) : null;
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format currency with symbol
 */
export function formatCurrency(amount: number, currency: string): string {
  return `${amount.toLocaleString()} ${currency}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    placed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    received: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    closed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  };
  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

/**
 * Get inventory status color
 */
export function getInventoryColor(status: string): string {
  const colors: Record<string, string> = {
    'in-stock': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    'out-of-stock': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    'not-found': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
