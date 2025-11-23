import { useState, useMemo } from 'react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { FileUploadZone } from '@/components/product-file-manager/FileUploadZone';
import { ColumnSelector } from '@/components/product-file-manager/ColumnSelector';
import { ProductSearch } from '@/components/product-file-manager/ProductSearch';
import { ProductTable } from '@/components/product-file-manager/ProductTable';
import { SelectionControls } from '@/components/product-file-manager/SelectionControls';
import { ExportControls } from '@/components/product-file-manager/ExportControls';
import { Card } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function ProductFileManager() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [imageColumnIndex, setImageColumnIndex] = useState<number>(-1);
  const [titleColumnIndex, setTitleColumnIndex] = useState<number>(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm || titleColumnIndex === -1) return parsedData;
    
    const titleColumn = headers[titleColumnIndex];
    return parsedData.filter((row) => {
      const titleValue = String(row[titleColumn] || '').toLowerCase();
      return titleValue.includes(searchTerm.toLowerCase());
    });
  }, [parsedData, searchTerm, titleColumnIndex, headers]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = String(a[sortColumn] || '');
      const bVal = String(b[sortColumn] || '');
      
      if (sortDirection === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate sorted data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleFileUpload = (file: File, data: Record<string, any>[], detectedHeaders: string[]) => {
    setUploadedFile(file);
    setParsedData(data);
    setHeaders(detectedHeaders);
    setSelectedRows(new Set());
    setCurrentPage(1);
    
    // Auto-detect image and title columns
    const imageIndex = detectedHeaders.findIndex(h => 
      /image|img|picture|photo|url/i.test(h)
    );
    const titleIndex = detectedHeaders.findIndex(h => 
      /title|name|product/i.test(h)
    );
    
    setImageColumnIndex(imageIndex);
    setTitleColumnIndex(titleIndex);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSelectRow = (rowIndex: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedRows);
      const startIndex = (currentPage - 1) * itemsPerPage;
      paginatedData.forEach((_, index) => {
        newSelected.add(startIndex + index);
      });
      setSelectedRows(newSelected);
    } else {
      const newSelected = new Set(selectedRows);
      const startIndex = (currentPage - 1) * itemsPerPage;
      paginatedData.forEach((_, index) => {
        newSelected.delete(startIndex + index);
      });
      setSelectedRows(newSelected);
    }
  };

  const handleClearSelection = () => {
    setSelectedRows(new Set());
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <HuhaHeader01
        icon={<Package />}
        title="Product File Manager"
        subtitle="Upload, preview, search, and export product data"
      />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {!uploadedFile ? (
          <FileUploadZone onFileUpload={handleFileUpload} />
        ) : (
          <>
            {/* File Info Card */}
            <Card className="glass-container p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {parsedData.length} rows • {headers.length} columns
                  </p>
                </div>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    setParsedData([]);
                    setHeaders([]);
                    setSelectedRows(new Set());
                    setSearchTerm('');
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Upload New File
                </button>
              </div>
            </Card>

            {/* Column Selector */}
            <ColumnSelector
              headers={headers}
              imageColumnIndex={imageColumnIndex}
              titleColumnIndex={titleColumnIndex}
              onImageColumnChange={setImageColumnIndex}
              onTitleColumnChange={setTitleColumnIndex}
            />

            {/* Search and Controls */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1">
                <ProductSearch
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  resultsCount={sortedData.length}
                  totalCount={parsedData.length}
                />
              </div>
              <SelectionControls
                selectedCount={selectedRows.size}
                totalCount={sortedData.length}
                onClearSelection={handleClearSelection}
              />
              <ExportControls
                parsedData={parsedData}
                headers={headers}
                selectedRows={selectedRows}
                fileName={uploadedFile.name}
              />
            </div>

            {/* Product Table */}
            <ProductTable
              data={paginatedData}
              headers={headers}
              imageColumnIndex={imageColumnIndex}
              titleColumnIndex={titleColumnIndex}
              selectedRows={selectedRows}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
            />

            {/* Pagination */}
            <Card className="glass-container p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} rows
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 text-sm rounded-md border bg-background"
                  >
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={200}>200 per page</option>
                  </select>

                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-md border bg-background disabled:opacity-50 hover:bg-accent transition-colors"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-md border bg-background disabled:opacity-50 hover:bg-accent transition-colors"
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-muted-foreground px-2">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm rounded-md border bg-background disabled:opacity-50 hover:bg-accent transition-colors"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm rounded-md border bg-background disabled:opacity-50 hover:bg-accent transition-colors"
                  >
                    Last
                  </button>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
