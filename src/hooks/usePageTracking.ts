import { useEffect } from 'react';
import { useTaxonomy } from './useTaxonomy';
import { TaxonomyCategory } from '@/types/taxonomy';

interface PageTrackingOptions {
  category: TaxonomyCategory;
  subcategory: string;
  pageTitle: string;
  pageRoute?: string;
  metadata?: Record<string, any>;
}

/**
 * Hook to automatically track page views on component mount
 * Use this at the top of every page component for consistent tracking
 * 
 * @example
 * ```tsx
 * function MyPage() {
 *   usePageTracking({
 *     category: 'Amazon',
 *     subcategory: 'PO Tracker',
 *     pageTitle: 'Purchase Order Tracker',
 *     metadata: { filters_enabled: true }
 *   });
 *   // ... rest of component
 * }
 * ```
 */
export function usePageTracking(options: PageTrackingOptions) {
  const { trackPageView } = useTaxonomy();

  useEffect(() => {
    const route = options.pageRoute || window.location.pathname;
    
    trackPageView({
      category: options.category,
      subcategory: options.subcategory,
      pageTitle: options.pageTitle,
      pageRoute: route,
      metadata: {
        ...options.metadata,
        timestamp: new Date().toISOString(),
        referrer: document.referrer || 'direct'
      }
    });
  }, []); // Only track once on mount
}
