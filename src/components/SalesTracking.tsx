import { useState, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Filter, ArrowUpDown, Eye, EyeOff, FileText, Calculator, Trash2, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import * as XLSX from 'xlsx'

interface ColumnVisibility {
  [key: string]: boolean
}

interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

interface FileData {
  [key: string]: any
}

interface UploadedFile {
  name: string
  data: FileData[]
  columns: string[]
}

export function SalesTracking() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [data, setData] = useState<FileData[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({})
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  const processFiles = (files: UploadedFile[]) => {
    if (files.length === 0) {
      setData([])
      setColumns([])
      setColumnVisibility({})
      return
    }

    // Get common columns across all files
    const allColumns = files.reduce((acc, file) => {
      file.columns.forEach(col => {
        if (!acc.includes(col)) acc.push(col)
      })
      return acc
    }, [] as string[])

    // Combine all data
    const combinedData: FileData[] = []
    files.forEach(file => {
      file.data.forEach(row => {
        const normalizedRow: FileData = {}
        allColumns.forEach(col => {
          normalizedRow[col] = row[col] || null
        })
        normalizedRow._source = file.name // Track source file
        combinedData.push(normalizedRow)
      })
    })

    // Aggregate SKUs if SKU column exists
    const skuColumn = allColumns.find(col => 
      col.toLowerCase().includes('sku') || 
      col.toLowerCase().includes('product') ||
      col.toLowerCase().includes('item')
    )
    
    const qtyColumn = allColumns.find(col => 
      col.toLowerCase().includes('qty') ||
      col.toLowerCase().includes('quantity') ||
      col.toLowerCase().includes('sold') ||
      col.toLowerCase().includes('units')
    )

    let processedData = combinedData
    if (skuColumn && qtyColumn) {
      const skuMap = new Map<string, FileData>()
      
      combinedData.forEach(row => {
        const skuValue = row[skuColumn]?.toString() || ''
        const qtyValue = parseFloat(row[qtyColumn]) || 0
        
        if (skuValue) {
          if (skuMap.has(skuValue)) {
            const existing = skuMap.get(skuValue)!
            existing[qtyColumn] = (parseFloat(existing[qtyColumn]) || 0) + qtyValue
            existing._duplicateCount = (existing._duplicateCount || 1) + 1
            existing._sources = existing._sources ? 
              `${existing._sources}, ${row._source}` : 
              `${existing._source}, ${row._source}`
          } else {
            skuMap.set(skuValue, {
              ...row,
              _duplicateCount: 1,
              _sources: row._source
            })
          }
        }
      })
      
      processedData = Array.from(skuMap.values())
    }

    setData(processedData)
    setColumns([...allColumns, '_source', '_duplicateCount', '_sources'].filter(Boolean))
    
    // Initialize column visibility
    const initialVisibility: ColumnVisibility = {}
    allColumns.forEach(col => {
      initialVisibility[col] = true
    })
    initialVisibility['_source'] = false
    initialVisibility['_duplicateCount'] = Boolean(skuColumn && qtyColumn)
    initialVisibility['_sources'] = false
    setColumnVisibility(initialVisibility)
  }

  const onDrop = (acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        if (jsonData.length > 0) {
          const firstRow = jsonData[0] as FileData
          const columnNames = Object.keys(firstRow)
          
          const newFile: UploadedFile = {
            name: file.name,
            data: jsonData as FileData[],
            columns: columnNames
          }
          
          setUploadedFiles(prev => {
            const updated = [...prev, newFile]
            processFiles(updated)
            return updated
          })
        }
      }
      reader.readAsBinaryString(file)
    })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: true
  })

  const handleSort = (column: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === column && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key: column, direction })
  }

  const sortedData = useMemo(() => {
    if (!sortConfig) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue === bValue) return 0

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aString = String(aValue).toLowerCase()
      const bString = String(bValue).toLowerCase()
      
      if (aString < bString) return sortConfig.direction === 'asc' ? -1 : 1
      if (aString > bString) return sortConfig.direction === 'asc' ? 1 : -1
      
      return 0
    })
  }, [data, sortConfig])

  const visibleColumns = columns.filter(col => columnVisibility[col])

  const toggleColumnVisibility = (column: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column]
    }))
  }

  const toggleAllColumns = (visible: boolean) => {
    const newVisibility: ColumnVisibility = {}
    columns.forEach(col => {
      newVisibility[col] = visible
    })
    setColumnVisibility(newVisibility)
  }

  const removeFile = (fileName: string) => {
    const updated = uploadedFiles.filter(file => file.name !== fileName)
    setUploadedFiles(updated)
    processFiles(updated)
  }

  const clearAllFiles = () => {
    setUploadedFiles([])
    setData([])
    setColumns([])
    setColumnVisibility({})
    setSortConfig(null)
    setShowFilters(false)
    setShowSummary(false)
  }

  const getSummaryStats = () => {
    const totalRows = data.length
    const duplicatesFound = data.filter(row => (row._duplicateCount || 0) > 1).length
    const totalFiles = uploadedFiles.length
    return { totalRows, duplicatesFound, totalFiles }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Sales & Ranking Tracker
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Upload multiple sales data files to track performance and aggregate SKU quantities
          </p>
        </div>
        <div className="flex gap-2">
          {data.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowSummary(!showSummary)}
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                {showSummary ? 'Hide Summary' : 'Show Summary'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {showSummary && data.length > 0 && (
        <Alert>
          <Calculator className="h-4 w-4" />
          <AlertDescription>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{getSummaryStats().totalFiles}</div>
                <div className="text-sm text-muted-foreground">Files Uploaded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{getSummaryStats().totalRows}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{getSummaryStats().duplicatesFound}</div>
                <div className="text-sm text-muted-foreground">Aggregated SKUs</div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* File Upload Area - Only show when no data */}
      {data.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Sales Data Files
            </CardTitle>
            <CardDescription>
              Upload multiple Excel or CSV files. Files with matching columns will be combined and SKUs will be aggregated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`rounded-lg p-8 text-center cursor-pointer transition-all duration-200
                ${isDragActive ? 'bg-primary/10 border-primary scale-105' : 'bg-muted/30 hover:bg-muted/50'}
                hover:scale-102`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                <Upload className="h-16 w-16 text-muted-foreground mb-4" />
                {isDragActive ? (
                  <p className="text-xl font-medium text-primary">Drop files here...</p>
                ) : (
                  <div>
                    <p className="text-xl font-medium mb-2">
                      Drag & drop files here, or click to browse
                    </p>
                    <p className="text-muted-foreground">
                      Supports Excel (.xlsx, .xls) and CSV files • Multiple files allowed
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Uploaded Files Summary - Show when data is loaded */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Uploaded Files ({uploadedFiles.length})
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.multiple = true
                    input.accept = '.xlsx,.xls,.csv'
                    input.onchange = (e) => {
                      const files = Array.from((e.target as HTMLInputElement).files || [])
                      if (files.length > 0) onDrop(files)
                    }
                    input.click()
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add More Files
                </Button>
                <Button variant="destructive" onClick={clearAllFiles}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Data
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 max-h-32 overflow-y-auto">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.data.length} rows • {file.columns.length} columns
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.length > 0 && (
        <div className="space-y-6">
          {/* Column Filters */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Advanced Column Selector
                </CardTitle>
                <CardDescription>
                  Customize which columns to display in your data view
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllColumns(true)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Show All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllColumns(false)}
                    className="flex items-center gap-2"
                  >
                    <EyeOff className="h-4 w-4" />
                    Hide All
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <Badge variant="secondary" className="px-3 py-1">
                    {visibleColumns.length} of {columns.length} visible
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {columns.map((column) => {
                    const isSpecialColumn = column.startsWith('_')
                    return (
                      <div 
                        key={column} 
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors
                          ${columnVisibility[column] ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'}`}
                      >
                        <Checkbox
                          id={column}
                          checked={columnVisibility[column] || false}
                          onCheckedChange={() => toggleColumnVisibility(column)}
                        />
                        <label
                          htmlFor={column}
                          className="text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          {isSpecialColumn ? column.replace('_', '') : column}
                          {isSpecialColumn && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {column === '_duplicateCount' ? 'Aggregated' : 'Metadata'}
                            </Badge>
                          )}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Processed Data</span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="px-3">
                    {data.length} rows
                  </Badge>
                  <Badge variant="outline" className="px-3">
                    {visibleColumns.length} columns visible
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Click column headers to sort • Aggregated data shows combined quantities for duplicate SKUs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto overflow-y-auto max-h-[700px] border rounded-lg">
                <div className="min-w-full" style={{ width: 'max-content' }}>
                  <Table className="w-full">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        {visibleColumns.map((column) => (
                          <TableHead
                            key={column}
                            className="cursor-pointer hover:bg-muted/50 select-none transition-colors font-semibold whitespace-nowrap min-w-[150px] px-4"
                            onClick={() => handleSort(column)}
                          >
                            <div className="flex items-center gap-2">
                              <span>{column.startsWith('_') ? column.replace('_', '') : column}</span>
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                              {sortConfig?.key === column && (
                                <Badge variant="secondary" className="text-xs px-1">
                                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                </Badge>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedData.map((row, index) => (
                        <TableRow key={index} className="hover:bg-muted/50">
                          {visibleColumns.map((column) => {
                            const value = row[column]
                            const isAggregated = column === '_duplicateCount' && (value || 0) > 1
                            
                            return (
                              <TableCell key={column} className="font-mono text-sm whitespace-nowrap min-w-[150px] px-4">
                                {value !== null && value !== undefined ? (
                                  <div className="flex items-center gap-2">
                                    <span className="truncate max-w-[120px]" title={value.toString()}>
                                      {value.toString()}
                                    </span>
                                    {isAggregated && (
                                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                                        Aggregated
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}