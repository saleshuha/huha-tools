import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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
}

export const HuhaTab01: React.FC<HuhaTab01Props> = ({
  items,
  value,
  onValueChange,
  className,
  tabsListClassName,
  tabsTriggerClassName,
  tabsContentClassName
}) => {
  const gridCols = `grid-cols-${Math.min(items.length, 6)}`;
  
  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn("w-full", className)}>
      <TabsList className={cn(
        "grid w-full mb-8 bg-card border border-border/50 shadow-soft",
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
          className={cn("space-y-6", tabsContentClassName)}
        >
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
};