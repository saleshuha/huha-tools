import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ColumnSelectorProps {
  headers: string[];
  imageColumnIndex: number;
  titleColumnIndex: number;
  onImageColumnChange: (index: number) => void;
  onTitleColumnChange: (index: number) => void;
}

export function ColumnSelector({
  headers,
  imageColumnIndex,
  titleColumnIndex,
  onImageColumnChange,
  onTitleColumnChange,
}: ColumnSelectorProps) {
  return (
    <Card className="glass-container p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="image-column" className="text-sm font-medium">
            Image Column
          </Label>
          <Select
            value={imageColumnIndex.toString()}
            onValueChange={(value) => onImageColumnChange(Number(value))}
          >
            <SelectTrigger id="image-column" className="bg-background">
              <SelectValue placeholder="Select image column" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border z-[100]">
              <SelectItem value="-1">No Image Column</SelectItem>
              {headers.map((header, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the column containing product image URLs
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title-column" className="text-sm font-medium">
            Title Column
          </Label>
          <Select
            value={titleColumnIndex.toString()}
            onValueChange={(value) => onTitleColumnChange(Number(value))}
          >
            <SelectTrigger id="title-column" className="bg-background">
              <SelectValue placeholder="Select title column" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border z-[100]">
              <SelectItem value="-1">No Title Column</SelectItem>
              {headers.map((header, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the column to search by product title/name
          </p>
        </div>
      </div>
    </Card>
  );
}
