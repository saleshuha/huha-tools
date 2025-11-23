import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

interface ProductTableProps {
  data: Record<string, any>[];
  headers: string[];
  fullHeaders: string[];
  imageColumnIndex: number;
  titleColumnIndex: number;
  selectedRows: Set<number>;
  onSelectRow: (rowIndex: number) => void;
  onSelectAll: (checked: boolean) => void;
  onDeleteRow: (rowIndex: number) => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  currentPage: number;
  itemsPerPage: number;
}

export function ProductTable({
  data,
  headers,
  fullHeaders,
  imageColumnIndex,
  titleColumnIndex,
  selectedRows,
  onSelectRow,
  onSelectAll,
  onDeleteRow,
  sortColumn,
  sortDirection,
  onSort,
  currentPage,
  itemsPerPage,
}: ProductTableProps) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const imageColumn = imageColumnIndex >= 0 ? fullHeaders[imageColumnIndex] : null;
  
  // Check if all visible rows are selected
  const allSelected = data.every((_, index) => selectedRows.has(startIndex + index));
  const someSelected = data.some((_, index) => selectedRows.has(startIndex + index));

  return (
    <Card className="glass-container overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
            <TableRow>
              <TableHead className="w-12">Delete</TableHead>
              
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all on page"
                  className={someSelected && !allSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                />
              </TableHead>
              
              {imageColumn && (
                <TableHead className="w-20">Image</TableHead>
              )}
              
              {headers.map((header, index) => {
                const isActive = sortColumn === header;
                
                return (
                  <TableHead
                    key={index}
                    className="cursor-pointer select-none hover:bg-accent/50 transition-colors"
                    onClick={() => onSort(header)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{header}</span>
                      {isActive ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-30" />
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headers.length + (imageColumn ? 3 : 2)} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-8 w-8 opacity-50" />
                    <p>No products found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => {
                const globalRowIndex = startIndex + rowIndex;
                const isSelected = selectedRows.has(globalRowIndex);
                
                return (
                  <TableRow
                    key={rowIndex}
                    className={`${
                      isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent/50'
                    } transition-colors`}
                  >
                    <TableCell>
                      <button
                        onClick={() => onDeleteRow(globalRowIndex)}
                        className="p-1 hover:text-destructive transition-colors"
                        aria-label={`Delete row ${globalRowIndex + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                    
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onSelectRow(globalRowIndex)}
                        aria-label={`Select row ${globalRowIndex + 1}`}
                      />
                    </TableCell>
                    
                    {imageColumn && (
                      <TableCell>
                        {row[imageColumn] ? (
                          <img
                            src={row[imageColumn]}
                            alt={titleColumnIndex >= 0 ? row[fullHeaders[titleColumnIndex]] : 'Product'}
                            className="h-[60px] w-[60px] object-contain rounded border border-border bg-muted"
                            onError={(e) => {
                              e.currentTarget.src = '';
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = '<div class="h-[60px] w-[60px] rounded border border-border bg-muted flex items-center justify-center"><svg class="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg></div>';
                            }}
                          />
                        ) : (
                          <div className="h-[60px] w-[60px] rounded border border-border bg-muted flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                    )}
                    
                    {headers.map((header, cellIndex) => (
                      <TableCell key={cellIndex} className="max-w-xs truncate">
                        {row[header] !== null && row[header] !== undefined ? String(row[header]) : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
