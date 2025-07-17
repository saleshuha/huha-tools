import { useState, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Filter, ArrowUpDown, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

export function SalesTracking() {
  const [data, setData] = useState<FileData[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({})
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
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
          setColumns(columnNames)
          setData(jsonData as FileData[])
          
          // Initialize all columns as visible
          const initialVisibility: ColumnVisibility = {}
          columnNames.forEach(col => {
            initialVisibility[col] = true
          })
          setColumnVisibility(initialVisibility)
        }
      }
      reader.readAsBinaryString(file)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales & Ranking Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Upload your sales data files and analyze with filtering and sorting
          </p>
        </div>
        {data.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Sales Data</CardTitle>
            <CardDescription>
              Upload an Excel or CSV file containing your sales and ranking data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                hover:border-primary hover:bg-primary/5`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-lg">Drop the file here...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">
                    Drag & drop your file here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports Excel (.xlsx, .xls) and CSV files
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Column Filters
                </CardTitle>
                <CardDescription>
                  Check/uncheck columns to show/hide them in the table
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-4">
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
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {columns.map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={column}
                        checked={columnVisibility[column] || false}
                        onCheckedChange={() => toggleColumnVisibility(column)}
                      />
                      <label
                        htmlFor={column}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {column}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>
                {data.length} rows • {visibleColumns.length} of {columns.length} columns visible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.map((column) => (
                        <TableHead
                          key={column}
                          className="cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => handleSort(column)}
                        >
                          <div className="flex items-center gap-2">
                            {column}
                            <ArrowUpDown className="h-4 w-4" />
                            {sortConfig?.key === column && (
                              <span className="text-xs">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((row, index) => (
                      <TableRow key={index}>
                        {visibleColumns.map((column) => (
                          <TableCell key={column}>
                            {row[column]?.toString() || '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setData([])
                setColumns([])
                setColumnVisibility({})
                setSortConfig(null)
                setShowFilters(false)
              }}
            >
              Upload New File
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}