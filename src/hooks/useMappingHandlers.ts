import { useCallback } from 'react';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';
import { ExcelData, ColumnMapping } from '@/types/excel';

interface UseMappingHandlersProps {
  sourceData: ExcelData | null;
  targetData: ExcelData | null;
  setMappings: React.Dispatch<React.SetStateAction<ColumnMapping>>;
  setDraggedColumn: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useMappingHandlers = ({
  sourceData,
  targetData,
  setMappings,
  setDraggedColumn
}: UseMappingHandlersProps) => {
  const { toast } = useToast();

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggedColumn(event.active.id as string);
  }, [setDraggedColumn]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && sourceData && targetData) {
      const sourceColumn = active.id as string;
      const targetColumn = over.id as string;
      
      // Check if source column exists and target column exists
      if (sourceData.headers.includes(sourceColumn) && targetData.headers.includes(targetColumn)) {
        setMappings(prev => ({
          ...prev,
          [sourceColumn]: targetColumn
        }));
        
        toast({
          title: "Mapping created",
          description: `${sourceColumn} → ${targetColumn}`,
        });
      }
    }
    
    setDraggedColumn(null);
  }, [sourceData, targetData, setMappings, setDraggedColumn, toast]);

  const removeMapping = useCallback((sourceColumn: string) => {
    setMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[sourceColumn];
      return newMappings;
    });
    
    toast({
      title: "Mapping removed",
      description: `Removed mapping for ${sourceColumn}`,
    });
  }, [setMappings, toast]);

  return {
    handleDragStart,
    handleDragEnd,
    removeMapping
  };
};