import { useState, useMemo, useEffect, useRef } from 'react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { FileUploadZone } from '@/components/product-file-manager/FileUploadZone';
import { ColumnSelector } from '@/components/product-file-manager/ColumnSelector';
import { ColumnVisibilitySelector } from '@/components/product-file-manager/ColumnVisibilitySelector';
import { ProductSearch } from '@/components/product-file-manager/ProductSearch';
import { ProductTable } from '@/components/product-file-manager/ProductTable';
import { SelectionControls } from '@/components/product-file-manager/SelectionControls';
import { ExportControls } from '@/components/product-file-manager/ExportControls';
import { SessionManager } from '@/components/product-file-manager/SessionManager';
import { UploadedFilesList } from '@/components/product-file-manager/UploadedFilesList';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Save, FolderOpen } from 'lucide-react';
import { saveSession, loadSession, type ProductSession } from '@/utils/sessionStorage';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileInfo {
  name: string;
  size: number;
  type: string;
  rowCount: number;
}

export default function ProductFileManager() {
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [imageColumnIndex, setImageColumnIndex] = useState<number>(-1);
  const [titleColumnIndex, setTitleColumnIndex] = useState<number>(-1);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  
  // Session management state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string>('');
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Create filtered headers based on visibility
  const visibleHeaders = useMemo(() => {
    return headers.filter((header) => visibleColumns.has(header));
  }, [headers, visibleColumns]);

  // Filter data based on search terms (OR logic)
  const filteredData = useMemo(() => {
    if (searchTerms.length === 0 || titleColumnIndex === -1) return parsedData;
    
    const titleColumn = headers[titleColumnIndex];
    return parsedData.filter((row) => {
      const titleValue = String(row[titleColumn] || '').toLowerCase();
      return searchTerms.some(term => titleValue.includes(term.toLowerCase()));
    });
  }, [parsedData, searchTerms, titleColumnIndex, headers]);

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
    // Add _source_file to each row
    const dataWithSource = data.map(row => ({ ...row, _source_file: file.name }));
    
    // Use functional updates to prevent race conditions
    setParsedData(prevData => [...prevData, ...dataWithSource]);
    
    setHeaders(prevHeaders => {
      const newHeaders = Array.from(new Set([...prevHeaders, ...detectedHeaders, '_source_file']));
      setVisibleColumns(new Set(newHeaders));
      return newHeaders;
    });
    
    setUploadedFiles(prevFiles => {
      const newFileInfo: FileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        rowCount: data.length
      };
      
      const updatedFiles = [...prevFiles, newFileInfo];
      
      // Auto-detect image and title columns only on first file
      if (prevFiles.length === 0) {
        const imageIndex = detectedHeaders.findIndex(h => 
          /image|img|picture|photo|url/i.test(h)
        );
        const titleIndex = detectedHeaders.findIndex(h => 
          /title|name|product/i.test(h)
        );
        
        setImageColumnIndex(imageIndex);
        setTitleColumnIndex(titleIndex);
        setCurrentSessionId(null);
        setSessionName('');
      }
      
      return updatedFiles;
    });
    
    setCurrentPage(1);
    setHasUnsavedChanges(true);
  };

  const handleRemoveFile = (fileName: string) => {
    // Remove file from list
    const newFiles = uploadedFiles.filter(f => f.name !== fileName);
    setUploadedFiles(newFiles);
    
    // Remove data from removed file
    const newData = parsedData.filter(row => row._source_file !== fileName);
    setParsedData(newData);
    
    // Recalculate headers from remaining data
    if (newData.length > 0) {
      const allKeys = new Set<string>();
      newData.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
      });
      setHeaders(Array.from(allKeys));
    } else {
      setHeaders([]);
      setImageColumnIndex(-1);
      setTitleColumnIndex(-1);
    }
    
    // Clear selections
    setSelectedRows(new Set());
    setCurrentPage(1);
    setHasUnsavedChanges(true);
    
    toast({
      title: "File removed",
      description: `Removed ${fileName} and its data`,
    });
  };

  const handleSaveSession = async (name?: string) => {
    const sessionData: ProductSession = {
      id: currentSessionId || `session_${Date.now()}`,
      name: name || sessionName || (uploadedFiles.length > 0 ? uploadedFiles[0].name : 'Untitled Session'),
      createdAt: currentSessionId ? sessionName : new Date().toISOString(),
      lastModified: new Date().toISOString(),
      fileNames: uploadedFiles.map(f => f.name),
      fileInfos: uploadedFiles,
      totalRows: parsedData.length,
      totalColumns: headers.length,
      selectedRowsCount: selectedRows.size,
      parsedData,
      headers,
      imageColumnIndex,
      titleColumnIndex,
      searchTerms,
      selectedRows: Array.from(selectedRows),
      currentPage,
      itemsPerPage,
      sortColumn,
      sortDirection,
      visibleColumns: Array.from(visibleColumns)
    };
    
    try {
      await saveSession(sessionData);
      setCurrentSessionId(sessionData.id);
      setSessionName(sessionData.name);
      setHasUnsavedChanges(false);
      toast({
        title: "Success",
        description: "Session saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save session",
        variant: "destructive",
      });
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      const session = await loadSession(sessionId);
      if (!session) {
        toast({
          title: "Error",
          description: "Session not found",
          variant: "destructive",
        });
        return;
      }
      
      // Restore all state
      setParsedData(session.parsedData);
      setHeaders(session.headers);
      setImageColumnIndex(session.imageColumnIndex);
      setTitleColumnIndex(session.titleColumnIndex);
      setSearchTerms(session.searchTerms || []);
      setSelectedRows(new Set(session.selectedRows));
      setCurrentPage(session.currentPage);
      setItemsPerPage(session.itemsPerPage);
      setSortColumn(session.sortColumn);
      setSortDirection(session.sortDirection);
      setVisibleColumns(new Set(session.visibleColumns));
      
      // Restore file infos
      setUploadedFiles(session.fileInfos || []);
      
      setCurrentSessionId(session.id);
      setSessionName(session.name);
      setHasUnsavedChanges(false);
      setShowSessionManager(false);
      
      toast({
        title: "Success",
        description: `Loaded session: ${session.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load session",
        variant: "destructive",
      });
    }
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

  const handleSelectAllFiltered = () => {
    const allFilteredIndices = new Set<number>();
    sortedData.forEach((item) => {
      const originalIndex = parsedData.indexOf(item);
      if (originalIndex !== -1) {
        allFilteredIndices.add(originalIndex);
      }
    });
    setSelectedRows(allFilteredIndices);
    
    toast({
      title: "Success",
      description: `Selected ${allFilteredIndices.size} products from search results`,
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newData = parsedData.filter((_, index) => index !== rowIndex);
    setParsedData(newData);
    
    const newSelected = new Set<number>();
    selectedRows.forEach(selectedIndex => {
      if (selectedIndex < rowIndex) {
        newSelected.add(selectedIndex);
      } else if (selectedIndex > rowIndex) {
        newSelected.add(selectedIndex - 1);
      }
    });
    setSelectedRows(newSelected);
    
    const newTotalPages = Math.ceil(newData.length / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }

    setHasUnsavedChanges(true);
  };

  // Track changes for unsaved indicator (skip initial mount)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (uploadedFiles.length > 0 && currentSessionId) {
      setHasUnsavedChanges(true);
    }
  }, [parsedData.length, selectedRows.size, searchTerms.length, visibleColumns.size, imageColumnIndex, titleColumnIndex, sortColumn, sortDirection]);

  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (!currentSessionId || !hasUnsavedChanges) return;
    
    const autoSaveInterval = setInterval(() => {
      handleSaveSession();
    }, 30000);
    
    return () => clearInterval(autoSaveInterval);
  }, [uploadedFiles.length, currentSessionId, hasUnsavedChanges]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="min-h-screen bg-gradient-surface">
      <HuhaHeader01
        icon={<Package />}
        title="Product File Manager"
        subtitle="Upload, preview, search, and export product data"
      />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {uploadedFiles.length === 0 ? (
          <>
            <Card className="glass-container p-4">
              <Button
                onClick={() => setShowSessionManager(true)}
                variant="outline"
                className="w-full"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Load Saved Session
              </Button>
            </Card>
            <FileUploadZone onFileUpload={handleFileUpload} />
          </>
        ) : (
          <>
            {/* Session Controls */}
            <Card className="glass-container p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <Input
                    type="text"
                    value={sessionName || (uploadedFiles.length > 0 ? uploadedFiles[0].name : '')}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Session name..."
                    className="max-w-xs"
                  />
                  <Button
                    onClick={() => handleSaveSession()}
                    variant={hasUnsavedChanges ? 'default' : 'outline'}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowSessionManager(true)}
                    variant="outline"
                    size="sm"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Manage Sessions
                  </Button>
                  <button
                    onClick={() => {
                      if (hasUnsavedChanges) {
                        const confirmed = window.confirm('You have unsaved changes. Continue without saving?');
                        if (!confirmed) return;
                      }
                      setUploadedFiles([]);
                      setParsedData([]);
                      setHeaders([]);
                      setSelectedRows(new Set());
                      setSearchTerms([]);
                      setCurrentSessionId(null);
                      setSessionName('');
                      setHasUnsavedChanges(false);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Upload New File
                  </button>
                </div>
              </div>
            </Card>

            {/* Uploaded Files List */}
            <UploadedFilesList
              files={uploadedFiles}
              onRemoveFile={handleRemoveFile}
            />

            {/* File Upload Zone for additional files */}
            <FileUploadZone onFileUpload={handleFileUpload} />

            {/* File Info Summary */}
            <Card className="glass-container p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} • {parsedData.length} total rows • {headers.length} columns
                  </p>
                </div>
              </div>
            </Card>

            {/* Column Selector */}
            <ColumnSelector
              headers={headers}
              imageColumnIndex={imageColumnIndex}
              titleColumnIndex={titleColumnIndex}
              onImageColumnChange={setImageColumnIndex}
              onTitleColumnChange={setTitleColumnIndex}
              parsedData={parsedData}
            />

            {/* Column Visibility Selector */}
            <ColumnVisibilitySelector
              headers={headers}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
            />

            {/* Search and Controls */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1">
                <ProductSearch
                  searchTerms={searchTerms}
                  onSearchTermsChange={setSearchTerms}
                  resultsCount={sortedData.length}
                  totalCount={parsedData.length}
                />
              </div>
              <SelectionControls
                selectedCount={selectedRows.size}
                totalCount={sortedData.length}
                onClearSelection={handleClearSelection}
                onSelectAllFiltered={handleSelectAllFiltered}
                hasActiveSearch={searchTerms.length > 0}
              />
              <ExportControls
                parsedData={parsedData}
                headers={headers}
                selectedRows={selectedRows}
                fileName={uploadedFiles.length > 0 ? uploadedFiles[0].name : 'export'}
              />
            </div>

            {/* Product Table */}
            <ProductTable
              data={paginatedData}
              headers={visibleHeaders}
              fullHeaders={headers}
              imageColumnIndex={imageColumnIndex}
              titleColumnIndex={titleColumnIndex}
              selectedRows={selectedRows}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              onDeleteRow={handleDeleteRow}
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

        {/* Session Manager Dialog */}
        <Dialog open={showSessionManager} onOpenChange={setShowSessionManager}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Manage Sessions</DialogTitle>
              <DialogDescription>
                Load, rename, or delete your saved work sessions
              </DialogDescription>
            </DialogHeader>
            
            <SessionManager
              onLoad={handleLoadSession}
              onClose={() => setShowSessionManager(false)}
              currentSessionId={currentSessionId}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
