import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColumnMapping } from '@/types/excel';
import { ArrowRight, X } from 'lucide-react';

interface MappingPreviewProps {
  sourceHeaders: string[];
  targetHeaders: string[];
  mappings: ColumnMapping;
  onMappingChange: (sourceColumn: string, targetColumn: string) => void;
  lockedHeaders?: string[];
}

export const MappingPreview = ({ 
  sourceHeaders, 
  targetHeaders, 
  mappings, 
  onMappingChange,
  lockedHeaders = []
}: MappingPreviewProps) => {
  const uniqueSourceHeaders = [...new Set(sourceHeaders)];
  const unmappedTargetHeaders = targetHeaders.filter(
    header => !Object.values(mappings).includes(header) && !lockedHeaders.includes(header)
  );

  const removeMappingForTarget = (targetColumn: string) => {
    const sourceColumn = Object.keys(mappings).find(
      key => mappings[key] === targetColumn
    );
    if (sourceColumn) {
      const newMappings = { ...mappings };
      delete newMappings[sourceColumn];
      // Update parent component
      Object.keys(newMappings).forEach(key => {
        onMappingChange(key, newMappings[key]);
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Mappings */}
      {Object.keys(mappings).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current Mappings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(mappings).map(([sourceCol, targetCol]) => (
              <div key={`${sourceCol}-${targetCol}`} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <div className="flex items-center gap-2 flex-1">
                  <Badge variant="outline" className="text-xs">{sourceCol}</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="default" className="text-xs">{targetCol}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMappingForTarget(targetCol)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Unmapped Target Columns */}
      {unmappedTargetHeaders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-amber-600">
              Unmapped Target Columns ({unmappedTargetHeaders.length})
            </CardTitle>
          </CardHeader>
           <CardContent className="space-y-3">
             {unmappedTargetHeaders.map((targetHeader) => (
               <div key={targetHeader} className="flex items-center gap-3">
                 <Badge variant="secondary" className="min-w-0 flex-1 text-xs">
                   {targetHeader}
                 </Badge>
                 <ArrowRight className="h-3 w-3 text-muted-foreground" />
                 <Select
                   onValueChange={(sourceColumn) => onMappingChange(sourceColumn, targetHeader)}
                 >
                   <SelectTrigger className="w-[200px]">
                     <SelectValue placeholder="Select source column" />
                   </SelectTrigger>
                   <SelectContent>
                     {uniqueSourceHeaders
                       .filter(header => !Object.keys(mappings).includes(header))
                       .map((header) => (
                         <SelectItem key={header} value={header}>
                           {header}
                         </SelectItem>
                       ))}
                   </SelectContent>
                 </Select>
               </div>
             ))}
           </CardContent>
         </Card>
       )}

       {/* Locked Headers */}
       {lockedHeaders.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle className="text-sm text-green-600">
               Locked Headers ({lockedHeaders.length}) - Will use default values
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-2">
             {lockedHeaders.map((header) => (
               <div key={header} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                 <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                   🔒 {header}
                 </Badge>
                 <span className="text-xs text-muted-foreground">
                   Uses default value (not mapped)
                 </span>
               </div>
             ))}
           </CardContent>
        </Card>
      )}
    </div>
  );
};