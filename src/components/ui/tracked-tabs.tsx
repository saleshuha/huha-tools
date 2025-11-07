import React, { useState, useRef } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { TaxonomyCategory } from '@/types/taxonomy';

export interface TrackedTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  category: TaxonomyCategory;
  subcategory: string;
  children: React.ReactNode;
  className?: string;
  enableTracking?: boolean;
  getTabLabel?: (value: string) => string;
}

/**
 * TrackedTabs - A wrapper for the Tabs component with built-in taxonomy tracking
 * 
 * Use this component when you need to track tab changes for analytics.
 * It automatically tracks tab_change events with the taxonomy system.
 * 
 * @example
 * ```tsx
 * <TrackedTabs 
 *   value={activeTab} 
 *   onValueChange={setActiveTab}
 *   category="Amazon"
 *   subcategory="Order Processing"
 * >
 *   <TabsList>
 *     <TabsTrigger value="pending">Pending</TabsTrigger>
 *     <TabsTrigger value="processed">Processed</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="pending">...</TabsContent>
 *   <TabsContent value="processed">...</TabsContent>
 * </TrackedTabs>
 * ```
 */
export const TrackedTabs: React.FC<TrackedTabsProps> = ({
  value,
  onValueChange,
  category,
  subcategory,
  children,
  className,
  enableTracking = true,
  getTabLabel
}) => {
  const { trackTabChange } = useTaxonomy();
  const previousTabRef = useRef(value);

  const handleTabChange = (newTab: string) => {
    if (enableTracking) {
      const fromTab = previousTabRef.current;
      const tabLabel = getTabLabel?.(newTab) || newTab;
      
      trackTabChange({
        category,
        subcategory,
        fromTab,
        toTab: newTab,
        tabTitle: tabLabel
      });
      
      previousTabRef.current = newTab;
    }
    
    onValueChange(newTab);
  };

  return (
    <Tabs value={value} onValueChange={handleTabChange} className={className}>
      {children}
    </Tabs>
  );
};
