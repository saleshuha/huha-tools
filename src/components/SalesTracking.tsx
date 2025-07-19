import { useState, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Filter, ArrowUpDown, Eye, EyeOff, FileText, Calculator, Trash2, X, Plus, Download, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Package, Search, Star, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
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

interface PartnerSKUAggregate {
  partnerSku: string
  totalShippedQty: number
  totalSales: number
  avgRanking: number
  sources: string[]
  recordCount: number
}

interface AnalyticsData {
  topPartnerSKUs: PartnerSKUAggregate[]
  totalShippedUnits: number
  avgShippedPerSKU: number
  uniquePartnerSKUs: number
  topPerformingSKUs: PartnerSKUAggregate[]
}

export function SalesTracking() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [data, setData] = useState<FileData[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({})
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(1000)
  const [partnerSkuData, setPartnerSkuData] = useState<PartnerSKUAggregate[]>([])
  const [searchFilter, setSearchFilter] = useState('')

  // Enhanced processing for Partner SKU aggregation
  const processPartnerSKUData = (combinedData: FileData[], allColumns: string[]) => {
    const partnerSkuColumn = allColumns.find(col => 
      col.toLowerCase().includes('partner') && col.toLowerCase().includes('sku') ||
      col.toLowerCase().includes('partnersku') ||
      col.toLowerCase().includes('partner_sku')
    )
    
    const shippedQtyColumn = allColumns.find(col => 
      col.toLowerCase().includes('shipped') && (col.toLowerCase().includes('qty') || col.toLowerCase().includes('quantity')) ||
      col.toLowerCase().includes('shipped_qty') ||
      col.toLowerCase().includes('shippedqty')
    )
    
    const salesColumn = allColumns.find(col => 
      col.toLowerCase().includes('sales') ||
      col.toLowerCase().includes('revenue') ||
      col.toLowerCase().includes('amount')
    )
    
    const rankingColumn = allColumns.find(col => 
      col.toLowerCase().includes('ranking') ||
      col.toLowerCase().includes('rank') ||
      col.toLowerCase().includes('position')
    )

    if (partnerSkuColumn && shippedQtyColumn) {
      const partnerSkuMap = new Map<string, PartnerSKUAggregate>()
      
      combinedData.forEach(row => {
        const partnerSku = row[partnerSkuColumn]?.toString() || ''
        const shippedQty = parseFloat(row[shippedQtyColumn]) || 0
        const sales = parseFloat(row[salesColumn]) || 0
        const ranking = parseFloat(row[rankingColumn]) || 0
        const source = row._source || 'Unknown'
        
        if (partnerSku && shippedQty > 0) {
          if (partnerSkuMap.has(partnerSku)) {
            const existing = partnerSkuMap.get(partnerSku)!
            existing.totalShippedQty += shippedQty
            existing.totalSales += sales
            existing.avgRanking = ranking > 0 ? (existing.avgRanking + ranking) / 2 : existing.avgRanking
            existing.recordCount += 1
            if (!existing.sources.includes(source)) {
              existing.sources.push(source)
            }
          } else {
            partnerSkuMap.set(partnerSku, {
              partnerSku,
              totalShippedQty: shippedQty,
              totalSales: sales,
              avgRanking: ranking,
              sources: [source],
              recordCount: 1
            })
          }
        }
      })
      
      const partnerSkuArray = Array.from(partnerSkuMap.values())
        .sort((a, b) => b.totalShippedQty - a.totalShippedQty)
      
      setPartnerSkuData(partnerSkuArray)
    }
  }

  const processFiles = (files: UploadedFile[]) => {
    if (files.length === 0) {
      setData([])
      setColumns([])
      setColumnVisibility({})
      setPartnerSkuData([])
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

    // Process Partner SKU aggregation
    processPartnerSKUData(combinedData, allColumns)

    // Aggregate regular SKUs if SKU column exists
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

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchFilter) return sortedData
    
    return sortedData.filter(row => {
      return Object.values(row).some(value => 
        value?.toString().toLowerCase().includes(searchFilter.toLowerCase())
      )
    })
  }, [sortedData, searchFilter])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage, rowsPerPage])

  const totalPages = Math.ceil(filteredData.length / rowsPerPage)

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
    setShowAnalytics(false)
    setSelectedRows(new Set())
    setCurrentPage(1)
    setPartnerSkuData([])
    setSearchFilter('')
  }

  const toggleRowSelection = (index: number) => {
    const actualIndex = (currentPage - 1) * rowsPerPage + index
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(actualIndex)) {
        newSet.delete(actualIndex)
      } else {
        newSet.add(actualIndex)
      }
      return newSet
    })
  }

  const toggleAllRowsSelection = () => {
    const currentPageIndexes = paginatedData.map((_, index) => (currentPage - 1) * rowsPerPage + index)
    const allCurrentPageSelected = currentPageIndexes.every(index => selectedRows.has(index))
    
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (allCurrentPageSelected) {
        currentPageIndexes.forEach(index => newSet.delete(index))
      } else {
        currentPageIndexes.forEach(index => newSet.add(index))
      }
      return newSet
    })
  }

  const exportSelectedRows = () => {
    const selectedData = filteredData.filter((_, index) => selectedRows.has(index))
    if (selectedData.length === 0) {
      alert('No rows selected for export')
      return
    }

    const worksheet = XLSX.utils.json_to_sheet(selectedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Selected Data')
    XLSX.writeFile(workbook, `selected_sales_data_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const getSummaryStats = () => {
    const totalRows = data.length
    const duplicatesFound = data.filter(row => (row._duplicateCount || 0) > 1).length
    const totalFiles = uploadedFiles.length
    return { totalRows, duplicatesFound, totalFiles }
  }

  const getPartnerSKUAnalytics = (): AnalyticsData => {
    const totalShippedUnits = partnerSkuData.reduce((sum, item) => sum + item.totalShippedQty, 0)
    const avgShippedPerSKU = partnerSkuData.length > 0 ? totalShippedUnits / partnerSkuData.length : 0
    const uniquePartnerSKUs = partnerSkuData.length
    const topPartnerSKUs = partnerSkuData.slice(0, 10)
    const topPerformingSKUs = partnerSkuData
      .filter(item => item.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10)

    return {
      totalShippedUnits,
      avgShippedPerSKU,
      uniquePartnerSKUs,
      topPartnerSKUs,
      topPerformingSKUs
    }
  }

  const exportPartnerSKUData = () => {
    if (partnerSkuData.length === 0) {
      alert('No Partner SKU data available for export')
      return
    }

    const exportData = partnerSkuData.map(item => ({
      'Partner SKU': item.partnerSku,
      'Total Shipped Qty': item.totalShippedQty,
      'Total Sales': item.totalSales,
      'Average Ranking': item.avgRanking,
      'Record Count': item.recordCount,
      'Sources': item.sources.join(', ')
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Partner SKU Analysis')
    XLSX.writeFile(workbook, `partner_sku_analysis_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const analytics = getPartnerSKUAnalytics()

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            🚀 Advanced Sales & Ranking Analytics
          </h1>
          <p className="text-muted-foreground text-lg">
            Comprehensive sales tracking with Partner SKU aggregation and detailed performance insights
          </p>
        </div>
        <div className="flex gap-2">
          {data.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex items-center gap-2 glass-button"
              >
                <BarChart3 className="h-4 w-4" />
                {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSummary(!showSummary)}
                className="flex items-center gap-2 glass-button"
              >
                <Calculator className="h-4 w-4" />
                {showSummary ? 'Hide Summary' : 'Show Summary'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 glass-button"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button
                variant="outline"
                onClick={exportSelectedRows}
                disabled={selectedRows.size === 0}
                className="flex items-center gap-2 glass-button"
              >
                <Download className="h-4 w-4" />
                Export Selected ({selectedRows.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Partner SKU Analytics Section */}
      {showAnalytics && partnerSkuData.length > 0 && (
        <div className="glass-container p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Partner SKU Analytics
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={exportPartnerSKUData}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Partner SKU Data
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Shipped Units</p>
                    <p className="text-2xl font-bold text-primary">{analytics.totalShippedUnits.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-secondary/10">
                    <Package className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unique Partner SKUs</p>
                    <p className="text-2xl font-bold text-secondary">{analytics.uniquePartnerSKUs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-accent/10">
                    <Activity className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Shipped per SKU</p>
                    <p className="text-2xl font-bold text-accent">{analytics.avgShippedPerSKU.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <Star className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Top Performers</p>
                    <p className="text-2xl font-bold text-destructive">{analytics.topPerformingSKUs.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Partner SKUs Table */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Partner SKUs by Shipped Quantity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Partner SKU</TableHead>
                      <TableHead>Total Shipped Qty</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Avg Ranking</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Sources</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.topPartnerSKUs.map((item, index) => (
                      <TableRow key={item.partnerSku}>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-medium">{item.partnerSku}</TableCell>
                        <TableCell className="font-semibold text-primary">
                          {item.totalShippedQty.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {item.totalSales > 0 ? `$${item.totalSales.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell>
                          {item.avgRanking > 0 ? item.avgRanking.toFixed(1) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.recordCount}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.sources.join(', ')}>
                          {item.sources.length > 1 ? `${item.sources[0]} +${item.sources.length - 1} more` : item.sources[0]}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Stats */}
      {showSummary && data.length > 0 && (
        <Alert className="glass-container">
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

      {/* File Upload Area */}
      {data.length === 0 ? (
        <Card className="glass-container border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Sales Data Files
            </CardTitle>
            <CardDescription>
              Upload multiple Excel or CSV files. Files with matching columns will be combined and SKUs will be aggregated automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`rounded-lg p-8 text-center cursor-pointer transition-all duration-200 border-2 border-dashed
                ${isDragActive ? 'bg-primary/10 border-primary scale-105' : 'bg-muted/30 hover:bg-muted/50 border-muted-foreground/20'}
                hover:scale-[1.02]`}
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
        /* Data Management Section */
        <div className="space-y-6">
          {/* Uploaded Files Summary */}
          <Card className="glass-container">
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

          {/* Search and Filter Section */}
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Filter Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Search across all data..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full"
                  />
                </div>
                {searchFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchFilter('')}
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Column Filters */}
          {showFilters && (
            <Card className="glass-container">
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
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Processed Data</span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="px-3">
                    {filteredData.length} filtered rows
                  </Badge>
                  <Badge variant="outline" className="px-3">
                    Page {currentPage} of {totalPages}
                  </Badge>
                  <Badge variant="outline" className="px-3">
                    {selectedRows.size} selected
                  </Badge>
                  <Badge variant="outline" className="px-3">
                    {visibleColumns.length} columns visible
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Click column headers to sort • Select rows to export • Use search to filter data
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto overflow-y-auto max-h-[600px] border rounded-lg">
                <div className="min-w-full" style={{ width: 'max-content' }}>
                  <Table className="w-full">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-12 px-4">
                          <Checkbox
                            checked={paginatedData.length > 0 && paginatedData.every((_, index) => 
                              selectedRows.has((currentPage - 1) * rowsPerPage + index)
                            )}
                            onCheckedChange={toggleAllRowsSelection}
                            aria-label="Select all rows on this page"
                          />
                        </TableHead>
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
                      {paginatedData.map((row, index) => {
                        const actualIndex = (currentPage - 1) * rowsPerPage + index
                        const isSelected = selectedRows.has(actualIndex)
                        
                        return (
                          <TableRow 
                            key={actualIndex} 
                            className={`hover:bg-muted/50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                          >
                            <TableCell className="w-12 px-4">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleRowSelection(index)}
                                aria-label={`Select row ${actualIndex + 1}`}
                              />
                            </TableCell>
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
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}