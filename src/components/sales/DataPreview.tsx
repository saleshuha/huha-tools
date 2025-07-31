import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

interface DataPreviewProps {
  data: any[];
  title: string;
}

export function DataPreview({ data, title }: DataPreviewProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data to preview</p>
        </CardContent>
      </Card>
    );
  }

  const columns = Object.keys(data[0]);
  const previewData = data.slice(0, 10); // Show first 10 rows

  const formatValue = (value: any, key: string) => {
    if (typeof value === 'number' && (
      key.toLowerCase().includes('price') || 
      key.toLowerCase().includes('amount') || 
      key.toLowerCase().includes('cost') ||
      key.toLowerCase().includes('payout')
    )) {
      return `$${value.toFixed(2)}`;
    }
    return value?.toString() || '-';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            {title}
          </div>
          <Badge variant="secondary">{data.length} records</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="whitespace-nowrap">
                    {column.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column} className="whitespace-nowrap">
                      {formatValue(row[column], column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length > 10 && (
          <p className="text-sm text-muted-foreground mt-4">
            Showing first 10 of {data.length} records
          </p>
        )}
      </CardContent>
    </Card>
  );
}