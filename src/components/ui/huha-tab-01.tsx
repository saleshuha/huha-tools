import React, { useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { TaxonomyCategory } from '@/types/taxonomy';

interface HuhaTab01Item {
  value: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface HuhaTab01Props {
  items: HuhaTab01Item[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  tabsListClassName?: string;
  tabsTriggerClassName?: string;
  tabsContentClassName?: string;
  // Taxonomy tracking props (optional)
  category?: TaxonomyCategory;
  subcategory?: string;
  enableTracking?: boolean;
  getTabLabel?: (value: string) => string;
}

export const HuhaTab01: React.FC<HuhaTab01Props> = ({
  items,
  value,
  onValueChange,
  className,
  tabsListClassName,
  tabsTriggerClassName,
  tabsContentClassName,
  category,
  subcategory,
  enableTracking = true,
  getTabLabel
}) => {
  const { trackTabChange } = useTaxonomy();
  const previousTabRef = useRef(value);
  const gridCols = `grid-cols-${Math.min(items.length, 6)}`;
  
  const handleTabChange = (newTab: string) => {
    // Track tab change if tracking is enabled and we have category/subcategory
    if (enableTracking && category && subcategory) {
      const fromTab = previousTabRef.current;
      const tabLabel = getTabLabel?.(newTab) || items.find(item => item.value === newTab)?.label || newTab;
      
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
    <Tabs value={value} onValueChange={handleTabChange} className={cn("w-full flex flex-col", className)}>
      <TabsList className={cn(
        "grid w-full mb-3 bg-card border border-border/50 shadow-soft",
        gridCols,
        tabsListClassName
      )}>
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              "tab-trigger data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
              tabsTriggerClassName
            )}
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {items.map((item) => (
        <TabsContent
          key={item.value}
          value={item.value}
          className={cn("flex-1 min-h-0 overflow-y-auto", tabsContentClassName)}
        >
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
};