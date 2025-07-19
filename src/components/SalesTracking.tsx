import { useState, useMemo, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Filter, ArrowUpDown, Eye, EyeOff, FileText, Calculator, Trash2, X, Plus, Download, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Package, Search, Star, Activity, Bot, Sparkles, RefreshCw, AlertCircle, CheckCircle, Zap, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
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
  trend: 'up' | 'down' | 'stable'
  performance: 'excellent' | 'good' | 'average' | 'poor'
}

interface AIInsight {
  type: 'trend' | 'anomaly' | 'opportunity' | 'recommendation'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  data?: any
}

interface AnalyticsData {
  topPartnerSKUs: PartnerSKUAggregate[]
  totalShippedUnits: number
  avgShippedPerSKU: number
  uniquePartnerSKUs: number
  topPerformingSKUs: PartnerSKUAggregate[]
  growthRate: number
  aiInsights: AIInsight[]
  marketShare: { sku: string; percentage: number }[]
  seasonalTrends: { month: string; quantity: number }[]
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
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [progressValue, setProgressValue] = useState(0)
  const { toast } = useToast()

  // Enhanced Partner SKU processing with better calculation logic
  const processPartnerSKUData = useCallback((combinedData: FileData[], allColumns: string[]) => {
    console.log('Starting Partner SKU processing...', { totalRows: combinedData.length, columns: allColumns })
    
    // More flexible column detection
    const partnerSkuColumn = allColumns.find(col => {
      const lowerCol = col.toLowerCase()
      return lowerCol.includes('partner') && lowerCol.includes('sku') ||
             lowerCol.includes('partnersku') ||
             lowerCol.includes('partner_sku') ||
             lowerCol === 'partner sku' ||
             lowerCol === 'sku_partner'
    })
    
    const shippedQtyColumn = allColumns.find(col => {
      const lowerCol = col.toLowerCase()
      return (lowerCol.includes('shipped') && (lowerCol.includes('qty') || lowerCol.includes('quantity'))) ||
             lowerCol.includes('shipped_qty') ||
             lowerCol.includes('shippedqty') ||
             lowerCol.includes('shipped qty') ||
             lowerCol.includes('quantity_shipped') ||
             lowerCol.includes('qty_shipped')
    })
    
    const salesColumn = allColumns.find(col => {
      const lowerCol = col.toLowerCase()
      return lowerCol.includes('sales') ||
             lowerCol.includes('revenue') ||
             lowerCol.includes('amount') ||
             lowerCol.includes('value') ||
             lowerCol.includes('total')
    })
    
    const rankingColumn = allColumns.find(col => {
      const lowerCol = col.toLowerCase()
      return lowerCol.includes('ranking') ||
             lowerCol.includes('rank') ||
             lowerCol.includes('position') ||
             lowerCol.includes('placement')
    })

    console.log('Column mapping detected:', {
      partnerSkuColumn,
      shippedQtyColumn,
      salesColumn,
      rankingColumn
    })

    if (!partnerSkuColumn) {
      console.warn('Partner SKU column not found')
      toast({
        title: "Column Detection",
        description: "Partner SKU column not found. Please ensure your data has a column with 'Partner SKU' or similar.",
        variant: "destructive"
      })
      setPartnerSkuData([])
      return
    }

    if (!shippedQtyColumn) {
      console.warn('Shipped quantity column not found')
      toast({
        title: "Column Detection",
        description: "Shipped quantity column not found. Please ensure your data has a column with 'Shipped Qty' or similar.",
        variant: "destructive"
      })
      setPartnerSkuData([])
      return
    }

    const partnerSkuMap = new Map<string, PartnerSKUAggregate>()
    let processedRows = 0
    let skippedRows = 0
    
    combinedData.forEach((row, index) => {
      const partnerSku = row[partnerSkuColumn]?.toString().trim()
      if (!partnerSku || partnerSku === '' || partnerSku.toLowerCase() === 'null') {
        skippedRows++
        return
      }

      // Enhanced parsing with multiple fallback strategies
      const parseNumericValue = (value: any): number => {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
          // Remove currency symbols, commas, and other non-numeric chars except decimal point and minus
          const cleaned = value.replace(/[$,£€¥]/g, '').replace(/[^\d.-]/g, '')
          const parsed = parseFloat(cleaned)
          return isNaN(parsed) ? 0 : parsed
        }
        return 0
      }

      const shippedQty = parseNumericValue(row[shippedQtyColumn])
      const sales = salesColumn ? parseNumericValue(row[salesColumn]) : 0
      const ranking = rankingColumn ? parseNumericValue(row[rankingColumn]) : 0
      const source = row._source || `Row ${index + 1}`
      
      if (shippedQty > 0) {
        processedRows++
        
        if (partnerSkuMap.has(partnerSku)) {
          const existing = partnerSkuMap.get(partnerSku)!
          const oldQty = existing.totalShippedQty
          existing.totalShippedQty += shippedQty
          existing.totalSales += sales
          
          // Better ranking calculation (weighted average)
          if (ranking > 0) {
            const totalRecords = existing.recordCount
            existing.avgRanking = ((existing.avgRanking * totalRecords) + ranking) / (totalRecords + 1)
          }
          
          existing.recordCount += 1
          if (!existing.sources.includes(source)) {
            existing.sources.push(source)
          }
          
          // Calculate trend
          const growth = ((existing.totalShippedQty - oldQty) / oldQty) * 100
          existing.trend = growth > 10 ? 'up' : growth < -10 ? 'down' : 'stable'
        } else {
          // Determine performance based on shipped quantity
          let performance: 'excellent' | 'good' | 'average' | 'poor' = 'average'
          if (shippedQty > 1000) performance = 'excellent'
          else if (shippedQty > 500) performance = 'good'
          else if (shippedQty < 50) performance = 'poor'
          
          partnerSkuMap.set(partnerSku, {
            partnerSku,
            totalShippedQty: shippedQty,
            totalSales: sales,
            avgRanking: ranking,
            sources: [source],
            recordCount: 1,
            trend: 'stable',
            performance
          })
        }
      } else {
        skippedRows++
      }
    })
    
    const partnerSkuArray = Array.from(partnerSkuMap.values())
      .sort((a, b) => b.totalShippedQty - a.totalShippedQty)
    
    console.log('Partner SKU processing complete:', {
      totalProcessed: processedRows,
      totalSkipped: skippedRows,
      uniqueSKUs: partnerSkuArray.length,
      topSKUs: partnerSkuArray.slice(0, 3).map(sku => ({ sku: sku.partnerSku, qty: sku.totalShippedQty }))
    })
    
    setPartnerSkuData(partnerSkuArray)
    
    if (partnerSkuArray.length > 0) {
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${partnerSkuArray.length} unique Partner SKUs with ${processedRows} total records.`,
      })
    }
  }, [toast])

  // AI-powered insights generation
  const generateAIInsights = useCallback(async (data: PartnerSKUAggregate[]) => {
    if (data.length === 0) return []

    setIsAnalyzing(true)
    setProgressValue(0)

    // Simulate AI analysis progress
    const progressInterval = setInterval(() => {
      setProgressValue(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return 95
        }
        return prev + 5
      })
    }, 100)

    try {
      const insights: AIInsight[] = []
      
      // Top performer analysis
      const topPerformer = data[0]
      if (topPerformer) {
        insights.push({
          type: 'trend',
          title: 'Top Performing SKU',
          description: `${topPerformer.partnerSku} leads with ${topPerformer.totalShippedQty.toLocaleString()} shipped units, representing ${((topPerformer.totalShippedQty / data.reduce((sum, item) => sum + item.totalShippedQty, 0)) * 100).toFixed(1)}% of total volume.`,
          impact: 'high',
          data: topPerformer
        })
      }

      // Underperforming SKUs
      const underperformers = data.filter(item => item.performance === 'poor').length
      if (underperformers > 0) {
        insights.push({
          type: 'opportunity',
          title: 'Optimization Opportunity',
          description: `${underperformers} SKUs are underperforming with <50 units shipped. Consider inventory reallocation or promotional strategies.`,
          impact: 'medium'
        })
      }

      // Volume concentration
      const top10Volume = data.slice(0, 10).reduce((sum, item) => sum + item.totalShippedQty, 0)
      const totalVolume = data.reduce((sum, item) => sum + item.totalShippedQty, 0)
      const concentration = (top10Volume / totalVolume) * 100
      
      if (concentration > 80) {
        insights.push({
          type: 'anomaly',
          title: 'High Volume Concentration',
          description: `Top 10 SKUs account for ${concentration.toFixed(1)}% of total volume. Consider diversifying your product mix to reduce dependency.`,
          impact: 'high'
        })
      }

      // Growth trends
      const growingSkus = data.filter(item => item.trend === 'up').length
      if (growingSkus > data.length * 0.3) {
        insights.push({
          type: 'trend',
          title: 'Positive Growth Momentum',
          description: `${growingSkus} SKUs (${((growingSkus / data.length) * 100).toFixed(1)}%) show positive growth trends. Market conditions appear favorable.`,
          impact: 'high'
        })
      }

      // Sales vs quantity correlation
      const salesData = data.filter(item => item.totalSales > 0)
      if (salesData.length > 0) {
        const avgRevenuePerUnit = salesData.reduce((sum, item) => sum + (item.totalSales / item.totalShippedQty), 0) / salesData.length
        const highValueSkus = salesData.filter(item => (item.totalSales / item.totalShippedQty) > avgRevenuePerUnit * 1.5)
        
        if (highValueSkus.length > 0) {
          insights.push({
            type: 'recommendation',
            title: 'High-Value SKUs Identified',
            description: `${highValueSkus.length} SKUs show above-average revenue per unit (>${avgRevenuePerUnit.toFixed(2)}). Focus marketing efforts on these profitable items.`,
            impact: 'medium',
            data: highValueSkus
          })
        }
      }

      setProgressValue(100)
      setTimeout(() => {
        setIsAnalyzing(false)
        setProgressValue(0)
      }, 500)

      return insights
    } catch (error) {
      console.error('Error generating AI insights:', error)
      setIsAnalyzing(false)
      setProgressValue(0)
      return []
    }
  }, [])

  // Enhanced file processing
  const processFiles = useCallback((files: UploadedFile[]) => {
    if (files.length === 0) {
      setData([])
      setColumns([])
      setColumnVisibility({})
      setPartnerSkuData([])
      setAiInsights([])
      return
    }

    // Get common columns across all files
    const allColumns = files.reduce((acc, file) => {
      file.columns.forEach(col => {
        if (!acc.includes(col)) acc.push(col)
      })
      return acc
    }, [] as string[])

    // Combine all data with source tracking
    const combinedData: FileData[] = []
    files.forEach(file => {
      file.data.forEach(row => {
        const normalizedRow: FileData = {}
        allColumns.forEach(col => {
          normalizedRow[col] = row[col] || null
        })
        normalizedRow._source = file.name
        combinedData.push(normalizedRow)
      })
    })

    // Process Partner SKU aggregation
    processPartnerSKUData(combinedData, allColumns)

    // Regular SKU aggregation for the main table
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
        const skuValue = row[skuColumn]?.toString().trim() || ''
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
  }, [processPartnerSKUData])

  // Generate AI insights when partner SKU data changes
  useEffect(() => {
    if (partnerSkuData.length > 0) {
      generateAIInsights(partnerSkuData).then(setAiInsights)
    }
  }, [partnerSkuData, generateAIInsights])

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
    setAiInsights([])
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

  const exportSelectedRows = () => {
    const selectedData = filteredData.filter((_, index) => selectedRows.has(index))
    if (selectedData.length === 0) {
      toast({
        title: "Export Error",
        description: "No rows selected for export",
        variant: "destructive"
      })
      return
    }

    const worksheet = XLSX.utils.json_to_sheet(selectedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Selected Data')
    XLSX.writeFile(workbook, `selected_sales_data_${new Date().toISOString().split('T')[0]}.xlsx`)
    
    toast({
      title: "Export Successful",
      description: `Exported ${selectedData.length} selected rows`,
    })
  }

  const exportPartnerSKUData = () => {
    if (partnerSkuData.length === 0) {
      toast({
        title: "Export Error",
        description: "No Partner SKU data available for export",
        variant: "destructive"
      })
      return
    }

    const exportData = partnerSkuData.map(item => ({
      'Partner SKU': item.partnerSku,
      'Total Shipped Qty': item.totalShippedQty,
      'Total Sales': item.totalSales,
      'Average Ranking': item.avgRanking,
      'Performance': item.performance,
      'Trend': item.trend,
      'Record Count': item.recordCount,
      'Sources': item.sources.join(', ')
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Partner SKU Analysis')
    XLSX.writeFile(workbook, `partner_sku_analysis_${new Date().toISOString().split('T')[0]}.xlsx`)
    
    toast({
      title: "Export Successful",
      description: `Exported ${partnerSkuData.length} Partner SKU records`,
    })
  }

  const getSummaryStats = () => {
    const totalRows = data.length
    const duplicatesFound = data.filter(row => (row._duplicateCount || 0) > 1).length
    const totalFiles = uploadedFiles.length
    return { totalRows, duplicatesFound, totalFiles }
  }

  const getAdvancedAnalytics = (): AnalyticsData => {
    const totalShippedUnits = partnerSkuData.reduce((sum, item) => sum + item.totalShippedQty, 0)
    const avgShippedPerSKU = partnerSkuData.length > 0 ? totalShippedUnits / partnerSkuData.length : 0
    const uniquePartnerSKUs = partnerSkuData.length
    const topPartnerSKUs = partnerSkuData.slice(0, 10)
    const topPerformingSKUs = partnerSkuData
      .filter(item => item.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10)

    // Calculate growth rate
    const growingSkus = partnerSkuData.filter(item => item.trend === 'up').length
    const growthRate = partnerSkuData.length > 0 ? (growingSkus / partnerSkuData.length) * 100 : 0

    // Market share analysis
    const marketShare = partnerSkuData.slice(0, 5).map(item => ({
      sku: item.partnerSku,
      percentage: (item.totalShippedQty / totalShippedUnits) * 100
    }))

    return {
      totalShippedUnits,
      avgShippedPerSKU,
      uniquePartnerSKUs,
      topPartnerSKUs,
      topPerformingSKUs,
      growthRate,
      aiInsights,
      marketShare,
      seasonalTrends: [] // Would be populated with time-series data
    }
  }

  const analytics = getAdvancedAnalytics()

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            AI-Powered Sales Analytics
          </h1>
          <p className="text-muted-foreground text-sm">
            Advanced Partner SKU tracking with machine learning insights
          </p>
        </div>
        <div className="flex gap-2">
          {data.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                AI Analytics
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSummary(!showSummary)}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Summary
              </Button>
            </>
          )}
        </div>
      </div>

      {/* AI Analysis Progress */}
      {isAnalyzing && (
        <Card className="glass-container border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary animate-pulse" />
                <span className="font-medium">AI Analysis in Progress...</span>
              </div>
              <div className="flex-1">
                <Progress value={progressValue} className="h-2" />
              </div>
              <span className="text-sm text-muted-foreground">{progressValue}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiInsights.map((insight, index) => (
            <Alert key={index} className={`glass-container border-l-4 ${
              insight.impact === 'high' ? 'border-l-red-500' :
              insight.impact === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
            }`}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  {insight.type === 'trend' && <TrendingUp className="h-4 w-4 text-primary" />}
                  {insight.type === 'anomaly' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                  {insight.type === 'opportunity' && <Zap className="h-4 w-4 text-green-500" />}
                  {insight.type === 'recommendation' && <Sparkles className="h-4 w-4 text-blue-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                    <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'} className="text-xs">
                      {insight.impact}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Enhanced Analytics Dashboard */}
      {showAnalytics && partnerSkuData.length > 0 && (
        <div className="glass-container p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Partner SKU Analytics Dashboard</h2>
            </div>
            <Button
              variant="outline"
              onClick={exportPartnerSKUData}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Analysis
            </Button>
          </div>

          {/* Enhanced Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Shipped</p>
                    <p className="text-2xl font-bold text-primary">
                      {analytics.totalShippedUnits.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Units across all SKUs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-secondary/10">
                    <BarChart3 className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unique SKUs</p>
                    <p className="text-2xl font-bold text-secondary">
                      {analytics.uniquePartnerSKUs}
                    </p>
                    <p className="text-xs text-muted-foreground">Active partner products</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-accent/10">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg per SKU</p>
                    <p className="text-2xl font-bold text-accent">
                      {analytics.avgShippedPerSKU.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Units per product</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Sparkles className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Growth Rate</p>
                    <p className="text-2xl font-bold text-green-500">
                      {analytics.growthRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">SKUs trending up</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Top Partner SKUs Table */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Top Partner SKUs Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Partner SKU</TableHead>
                      <TableHead>Shipped Qty</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Market Share</TableHead>
                      <TableHead>Sources</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.topPartnerSKUs.map((item, index) => (
                      <TableRow key={item.partnerSku} className="hover:bg-muted/50">
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "secondary"} className="w-8 justify-center">
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {item.partnerSku}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-primary">
                              {item.totalShippedQty.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">units</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.totalSales > 0 ? `$${item.totalSales.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            item.performance === 'excellent' ? 'default' :
                            item.performance === 'good' ? 'secondary' :
                            item.performance === 'average' ? 'outline' : 'destructive'
                          }>
                            {item.performance}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {item.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                            {item.trend === 'down' && <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />}
                            {item.trend === 'stable' && <div className="h-4 w-4 rounded-full bg-yellow-500" />}
                            <span className="text-sm capitalize">{item.trend}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary"
                                style={{ width: `${Math.min((item.totalShippedQty / analytics.totalShippedUnits) * 100 * 5, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs">
                              {((item.totalShippedQty / analytics.totalShippedUnits) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.sources.length} files
                          </Badge>
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

      {/* Column Filters */}
      {showFilters && columns.length > 0 && (
        <Card className="glass-container">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Column Visibility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {columns.map((column) => (
                <div key={column} className="flex items-center space-x-2">
                  <Checkbox
                    id={column}
                    checked={columnVisibility[column] || false}
                    onCheckedChange={() => toggleColumnVisibility(column)}
                  />
                  <label
                    htmlFor={column}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {column.startsWith('_') ? column.replace('_', '') : column}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      {showSummary && data.length > 0 && (
        <Card className="glass-container">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Data Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{getSummaryStats().totalRows}</div>
                <div className="text-sm text-muted-foreground">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">{getSummaryStats().duplicatesFound}</div>
                <div className="text-sm text-muted-foreground">Aggregated SKUs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{getSummaryStats().totalFiles}</div>
                <div className="text-sm text-muted-foreground">Files Processed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rest of the component remains the same but with improved structure... */}
      {data.length === 0 ? (
        <Card className="glass-container border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Sales Data Files
            </CardTitle>
            <CardDescription>
              Upload Excel or CSV files with Partner SKU and Shipped Quantity columns for AI-powered analysis.
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
                      Supports Excel (.xlsx, .xls) and CSV files • AI analysis included
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Files and Search Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Files ({uploadedFiles.length})
                  </div>
                  <Button variant="destructive" size="sm" onClick={clearAllFiles}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.data.length} rows
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(file.name)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Smart Search & Filter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Search across all data..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Column Filters
                    </Button>
                    {searchFilter && (
                      <div className="text-sm text-muted-foreground">
                        {filteredData.length} of {data.length} rows
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Data Table */}
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Processed Data</span>
                <div className="flex gap-2">
                  <Badge variant="outline">{filteredData.length} rows</Badge>
                  <Badge variant="outline">{visibleColumns.length} columns</Badge>
                  {selectedRows.size > 0 && (
                    <Button size="sm" onClick={exportSelectedRows}>
                      <Download className="h-4 w-4 mr-2" />
                      Export ({selectedRows.size})
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[600px] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20 border-b shadow-sm">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 px-4 bg-background/95 backdrop-blur">
                        <Checkbox
                          checked={paginatedData.length > 0 && paginatedData.every((_, index) => 
                            selectedRows.has((currentPage - 1) * rowsPerPage + index)
                          )}
                          onCheckedChange={() => {
                            const currentPageIndexes = paginatedData.map((_, index) => (currentPage - 1) * rowsPerPage + index)
                            const allSelected = currentPageIndexes.every(index => selectedRows.has(index))
                            
                            setSelectedRows(prev => {
                              const newSet = new Set(prev)
                              if (allSelected) {
                                currentPageIndexes.forEach(index => newSet.delete(index))
                              } else {
                                currentPageIndexes.forEach(index => newSet.add(index))
                              }
                              return newSet
                            })
                          }}
                        />
                      </TableHead>
                      {visibleColumns.map((column) => (
                        <TableHead
                          key={column}
                          className="cursor-pointer hover:bg-muted/50 select-none transition-colors font-semibold whitespace-nowrap min-w-[150px] px-4 bg-background/95 backdrop-blur"
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
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  })}
                  {totalPages > 5 && <span className="text-muted-foreground">...</span>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
