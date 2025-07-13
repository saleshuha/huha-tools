import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GripVertical, 
  Target, 
  ArrowRight, 
  X,
  Database,
  FileText
} from 'lucide-react';
import type { ExcelData, ColumnMapping } from '@/types/excel';

interface ColumnMapperProps {
  data: ExcelData;
  type: 'source' | 'target';
  mappings: ColumnMapping;
  onRemoveMapping?: (sourceColumn: string) => void;
}

interface DraggableColumnProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
  isOver?: boolean;
}

const DraggableColumn: React.FC<DraggableColumnProps> = ({ id, children, disabled }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`column-card ${isDragging ? 'dragging' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
};

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, children, isOver }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`column-card ${isOver ? 'drag-target' : ''}`}
    >
      {children}
    </div>
  );
};

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
  data,
  type,
  mappings,
  onRemoveMapping
}) => {
  const isSource = type === 'source';
  const mappedSourceColumns = Object.keys(mappings);
  const mappedTargetColumns = Object.values(mappings);

  // Get sample data for preview (first 3 non-empty rows)
  const getSampleData = (columnIndex: number) => {
    return data.data
      .slice(0, 5)
      .map(row => row[columnIndex])
      .filter(value => value !== undefined && value !== null && value !== '')
      .slice(0, 3);
  };

  return (
    <Card className="p-6 bg-gradient-surface">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {isSource ? (
            <Database className="w-5 h-5 text-primary" />
          ) : (
            <Target className="w-5 h-5 text-accent" />
          )}
          <h3 className="font-semibold text-lg">
            {isSource ? 'Source Columns' : 'Target Columns'}
          </h3>
          <Badge variant="secondary">
            {data.headers.length} columns
          </Badge>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <FileText className="w-4 h-4 inline mr-1" />
          {data.fileName}
        </div>
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-3">
          {data.headers.map((header, index) => {
            const isMapped = isSource 
              ? mappedSourceColumns.includes(header)
              : mappedTargetColumns.includes(header);
            
            const mappedTo = isSource ? mappings[header] : null;
            const sampleData = getSampleData(index);

            const columnContent = (
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {isSource && <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate" title={header}>
                        {header || `Column ${index + 1}`}
                      </div>
                      {sampleData.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Sample: {sampleData.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {isMapped && (
                    <Badge 
                      variant={isSource ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {isSource ? (
                        <>
                          <ArrowRight className="w-3 h-3 mr-1" />
                          {mappedTo}
                        </>
                      ) : (
                        'Mapped'
                      )}
                    </Badge>
                  )}
                  
                  {isSource && isMapped && onRemoveMapping && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveMapping(header)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );

            if (isSource) {
              return (
                <DraggableColumn 
                  key={header} 
                  id={header}
                  disabled={isMapped}
                >
                  {columnContent}
                </DraggableColumn>
              );
            } else {
              return (
                <DroppableColumn key={header} id={header}>
                  {columnContent}
                </DroppableColumn>
              );
            }
          })}
        </div>
      </ScrollArea>

      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
        <div className="text-sm text-muted-foreground text-center">
          {isSource ? (
            <>
              <GripVertical className="w-4 h-4 inline mr-1" />
              Drag columns to target columns to create mappings
            </>
          ) : (
            <>
              <Target className="w-4 h-4 inline mr-1" />
              Drop source columns here to map data
            </>
          )}
        </div>
      </div>
    </Card>
  );
};