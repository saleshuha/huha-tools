import { useState, useMemo, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Filter, ArrowUpDown, Eye, EyeOff, FileText, Calculator, Trash2, X, Plus, Download, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Package, Search, Star, Activity, Bot, Sparkles, RefreshCw, AlertCircle, CheckCircle, Zap, Brain, Calendar, CalendarClock, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import * as XLSX from 'xlsx'
import { addDays, subDays, format, parseISO, isAfter, isBefore, isWithinInterval } from 'date-fns'

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
  firstShippedDate?: Date
  lastShippedDate?: Date
  dailyData: { date: Date; quantity: number; sales: number }[]
  growthRate: number
  projectedGrowth: number
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
  dateRangeStats: { 
    days7: number; 
    days15: number; 
    days30: number; 
    months3: number;
    growthTrend: 'increasing' | 'decreasing' | 'stable'
  }
  topShippedByPeriod: {
    days7: PartnerSKUAggregate[]
    days15: PartnerSKUAggregate[]
    days30: PartnerSKUAggregate[]
    months3: PartnerSKUAggregate[]
  }
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
  const [dateFilter, setDateFilter] = useState<'7days' | '15days' | '30days' | '3months' | 'all'>('all')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const { toast } = useToast()

  // Generate comprehensive analytics data
  const generateAnalyticsData = useCallback((skuData: PartnerSKUAggregate[]) => {
    const now = new Date()
    const days7Ago = subDays(now, 7)
    const days15Ago = subDays(now, 15)
    const days30Ago = subDays(now, 30)
    const months3Ago = subDays(now, 90)

    // Filter data by date ranges
    const getDataForPeriod = (startDate: Date) => {
      return skuData.map(sku => ({
        ...sku,
        totalShippedQty: sku.dailyData
          .filter(d => d.date >= startDate)
          .reduce((sum, d) => sum + d.quantity, 0),
        totalSales: sku.dailyData
          .filter(d => d.date >= startDate)
          .reduce((sum, d) => sum + d.sales, 0)
      })).filter(sku => sku.totalShippedQty > 0)
        .sort((a, b) => b.totalShippedQty - a.totalShippedQty)
    }

    const data7Days = getDataForPeriod(days7Ago)
    const data15Days = getDataForPeriod(days15Ago)
    const data30Days = getDataForPeriod(days30Ago)
    const data3Months = getDataForPeriod(months3Ago)

    const analytics: AnalyticsData = {
      topPartnerSKUs: skuData.slice(0, 10),
      totalShippedUnits: skuData.reduce((sum, sku) => sum + sku.totalShippedQty, 0),
      avgShippedPerSKU: skuData.length > 0 ? skuData.reduce((sum, sku) => sum + sku.totalShippedQty, 0) / skuData.length : 0,
      uniquePartnerSKUs: skuData.length,
      topPerformingSKUs: skuData.filter(sku => sku.performance === 'excellent' || sku.performance === 'good').slice(0, 5),
      growthRate: skuData.reduce((sum, sku) => sum + sku.projectedGrowth, 0) / skuData.length,
      aiInsights: [],
      marketShare: skuData.slice(0, 10).map(sku => ({
        sku: sku.partnerSku,
        percentage: (sku.totalShippedQty / skuData.reduce((sum, s) => sum + s.totalShippedQty, 0)) * 100
      })),
      seasonalTrends: [],
      dateRangeStats: {
        days7: data7Days.reduce((sum, sku) => sum + sku.totalShippedQty, 0),
        days15: data15Days.reduce((sum, sku) => sum + sku.totalShippedQty, 0),
        days30: data30Days.reduce((sum, sku) => sum + sku.totalShippedQty, 0),
        months3: data3Months.reduce((sum, sku) => sum + sku.totalShippedQty, 0),
        growthTrend: data7Days.reduce((sum, sku) => sum + sku.totalShippedQty, 0) > 
                    data15Days.reduce((sum, sku) => sum + sku.totalShippedQty, 0) / 2 ? 'increasing' : 'decreasing'
      },
      topShippedByPeriod: {
        days7: data7Days.slice(0, 5),
        days15: data15Days.slice(0, 5),
        days30: data30Days.slice(0, 5),
        months3: data3Months.slice(0, 5)
      }
    }

    setAnalyticsData(analytics)
  }, [])

  // Enhanced Partner SKU processing with date-aware calculations
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

    // Date column detection
    const dateColumn = allColumns.find(col => {
      const lowerCol = col.toLowerCase()
      return lowerCol.includes('date') ||
             lowerCol.includes('time') ||
             lowerCol.includes('shipped_date') ||
             lowerCol.includes('order_date') ||
             lowerCol.includes('created') ||
             lowerCol.includes('timestamp')
    })

    console.log('Column mapping detected:', {
      partnerSkuColumn,
      shippedQtyColumn,
      salesColumn,
      rankingColumn,
      dateColumn
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

      // Parse date with multiple fallback strategies
      const parseDate = (value: any): Date | null => {
        if (!value) return null
        try {
          if (value instanceof Date) return value
          if (typeof value === 'string') {
            // Try different date formats
            const date = new Date(value)
            if (!isNaN(date.getTime())) return date
            
            // Try ISO format
            if (value.includes('T') || value.includes('-')) {
              const isoDate = parseISO(value)
              if (!isNaN(isoDate.getTime())) return isoDate
            }
          }
          // Excel date number format
          if (typeof value === 'number') {
            const excelDate = new Date((value - 25569) * 86400 * 1000)
            if (!isNaN(excelDate.getTime())) return excelDate
          }
        } catch (error) {
          console.warn('Date parsing error:', error)
        }
        return null
      }

      const shippedQty = parseNumericValue(row[shippedQtyColumn])
      const sales = salesColumn ? parseNumericValue(row[salesColumn]) : 0
      const ranking = rankingColumn ? parseNumericValue(row[rankingColumn]) : 0
      const shipDate = dateColumn ? parseDate(row[dateColumn]) : new Date()
      const source = row._source || `Row ${index + 1}`
      
      if (shippedQty > 0) {
        processedRows++
        
        if (partnerSkuMap.has(partnerSku)) {
          const existing = partnerSkuMap.get(partnerSku)!
          const oldQty = existing.totalShippedQty
          existing.totalShippedQty += shippedQty
          existing.totalSales += sales
          
          // Update date range
          if (shipDate) {
            if (!existing.firstShippedDate || shipDate < existing.firstShippedDate) {
              existing.firstShippedDate = shipDate
            }
            if (!existing.lastShippedDate || shipDate > existing.lastShippedDate) {
              existing.lastShippedDate = shipDate
            }
            
            // Add to daily data
            existing.dailyData.push({ date: shipDate, quantity: shippedQty, sales })
          }
          
          // Better ranking calculation (weighted average)
          if (ranking > 0) {
            const totalRecords = existing.recordCount
            existing.avgRanking = ((existing.avgRanking * totalRecords) + ranking) / (totalRecords + 1)
          }
          
          existing.recordCount += 1
          if (!existing.sources.includes(source)) {
            existing.sources.push(source)
          }
          
          // Calculate trend and growth rate
          const growth = ((existing.totalShippedQty - oldQty) / oldQty) * 100
          existing.trend = growth > 10 ? 'up' : growth < -10 ? 'down' : 'stable'
          existing.growthRate = growth
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
            performance,
            firstShippedDate: shipDate || undefined,
            lastShippedDate: shipDate || undefined,
            dailyData: shipDate ? [{ date: shipDate, quantity: shippedQty, sales }] : [],
            growthRate: 0,
            projectedGrowth: 0
          })
        }
      } else {
        skippedRows++
      }
    })
    
    // Calculate projected growth and enhanced analytics
    const partnerSkuArray = Array.from(partnerSkuMap.values()).map(sku => {
      // Calculate projected growth based on daily data trends
      if (sku.dailyData.length > 1) {
        const sortedData = sku.dailyData.sort((a, b) => a.date.getTime() - b.date.getTime())
        const recentData = sortedData.slice(-7) // Last 7 days
        const olderData = sortedData.slice(0, Math.max(1, sortedData.length - 7))
        
        const recentAvg = recentData.reduce((sum, d) => sum + d.quantity, 0) / recentData.length
        const olderAvg = olderData.reduce((sum, d) => sum + d.quantity, 0) / olderData.length
        
        sku.projectedGrowth = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0
      }
      return sku
    }).sort((a, b) => b.totalShippedQty - a.totalShippedQty)
    
    console.log('Partner SKU processing complete:', {
      totalProcessed: processedRows,
      totalSkipped: skippedRows,
      uniqueSKUs: partnerSkuArray.length,
      topSKUs: partnerSkuArray.slice(0, 3).map(sku => ({ 
        sku: sku.partnerSku, 
        qty: sku.totalShippedQty,
        growth: sku.projectedGrowth.toFixed(1) + '%'
      }))
    })
    
    setPartnerSkuData(partnerSkuArray)
    generateAnalyticsData(partnerSkuArray)
    
    if (partnerSkuArray.length > 0) {
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${partnerSkuArray.length} unique Partner SKUs with ${processedRows} total records.`,
      })
    }
  }, [toast, generateAnalyticsData])

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

      // Date-based insights
      const skusWithDates = data.filter(sku => sku.dailyData.length > 0)
      if (skusWithDates.length > 0) {
        const recentGrowth = skusWithDates.filter(sku => sku.projectedGrowth > 20).length
        if (recentGrowth > 0) {
          insights.push({
            type: 'opportunity',
            title: 'High Growth SKUs Identified',
            description: `${recentGrowth} SKUs show exceptional growth (>20%) based on recent shipping trends. Consider increasing inventory for these items.`,
            impact: 'high'
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

  // Filter data based on selected date range
  const filteredPartnerSkuData = useMemo(() => {
    if (dateFilter === 'all' || !analyticsData) return partnerSkuData

    const now = new Date()
    let startDate: Date

    switch (dateFilter) {
      case '7days':
        startDate = subDays(now, 7)
        break
      case '15days':
        startDate = subDays(now, 15)
        break
      case '30days':
        startDate = subDays(now, 30)
        break
      case '3months':
        startDate = subDays(now, 90)
        break
      default:
        return partnerSkuData
    }

    return partnerSkuData.map(sku => ({
      ...sku,
      totalShippedQty: sku.dailyData
        .filter(d => d.date >= startDate)
        .reduce((sum, d) => sum + d.quantity, 0),
      totalSales: sku.dailyData
        .filter(d => d.date >= startDate)
        .reduce((sum, d) => sum + d.sales, 0)
    })).filter(sku => sku.totalShippedQty > 0)
      .sort((a, b) => b.totalShippedQty - a.totalShippedQty)
  }, [partnerSkuData, dateFilter, analyticsData])

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

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aStr = aValue.toString().toLowerCase()
      const bStr = bValue.toString().toLowerCase()

      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig])

  const filteredData = useMemo(() => {
    if (!searchFilter) return sortedData

    const searchLower = searchFilter.toLowerCase()
    return sortedData.filter(row => 
      Object.values(row).some(value => 
        value && value.toString().toLowerCase().includes(searchLower)
      )
    )
  }, [sortedData, searchFilter])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredData.slice(startIndex, startIndex + rowsPerPage)
  }, [filteredData, currentPage, rowsPerPage])

  const totalPages = Math.ceil(filteredData.length / rowsPerPage)

  const visibleColumns = columns.filter(col => columnVisibility[col] !== false)

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const updated = prev.filter((_, i) => i !== index)
      processFiles(updated)
      return updated
    })
  }

  const clearAllData = () => {
    setUploadedFiles([])
    setData([])
    setColumns([])
    setColumnVisibility({})
    setPartnerSkuData([])
    setAiInsights([])
    setAnalyticsData(null)
    setSortConfig(null)
    setCurrentPage(1)
    setSearchFilter('')
    setSelectedRows(new Set())
    toast({
      title: "Data Cleared",
      description: "All uploaded files and processed data have been cleared.",
    })
  }

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card className="glass-container border-white/20">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Sales & Ranking Files
          </CardTitle>
          <CardDescription>
            Upload Excel or CSV files containing sales and ranking data. Multiple files will be automatically merged and analyzed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragActive 
                ? 'border-primary bg-primary/10 scale-[1.02]' 
                : 'border-white/20 hover:border-white/40 hover:bg-white/5'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
            {isDragActive ? (
              <p className="text-lg text-primary font-medium">Drop files here...</p>
            ) : (
              <div>
                <p className="text-lg text-foreground mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports Excel (.xlsx, .xls) and CSV files
                </p>
              </div>
            )}
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-primary">Uploaded Files ({uploadedFiles.length})</h4>
                <Button 
                  onClick={clearAllData}
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-white/10">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.data.length} rows, {file.columns.length} columns
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeFile(index)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data.length > 0 && (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="glass-button"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>

            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as any)}>
              <SelectTrigger className="w-48 glass-button">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent className="glass-container border-white/20">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="15days">Last 15 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => setShowSummary(!showSummary)}
              variant="outline"
              size="sm"
              className="glass-button"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Partner SKU Summary
            </Button>

            <Button
              onClick={() => setShowAnalytics(!showAnalytics)}
              variant="outline"
              size="sm"
              className="glass-button"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics Dashboard
            </Button>

            <div className="flex items-center gap-2 ml-auto">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search data..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-64 glass-button"
              />
            </div>
          </div>

          {/* Date Range Analytics Cards */}
          {analyticsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="glass-container border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Last 7 Days</p>
                      <p className="text-2xl font-bold text-primary">{analyticsData.dateRangeStats.days7.toLocaleString()}</p>
                    </div>
                    <Clock className="w-8 h-8 text-primary/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-container border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Last 15 Days</p>
                      <p className="text-2xl font-bold text-primary">{analyticsData.dateRangeStats.days15.toLocaleString()}</p>
                    </div>
                    <CalendarClock className="w-8 h-8 text-primary/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-container border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Last 30 Days</p>
                      <p className="text-2xl font-bold text-primary">{analyticsData.dateRangeStats.days30.toLocaleString()}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-primary/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-container border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Last 3 Months</p>
                      <p className="text-2xl font-bold text-primary">{analyticsData.dateRangeStats.months3.toLocaleString()}</p>
                    </div>
                    <TrendingUp className={`w-8 h-8 ${analyticsData.dateRangeStats.growthTrend === 'increasing' ? 'text-green-500' : 'text-red-500'}`} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Advanced Analytics Dashboard */}
          {showAnalytics && filteredPartnerSkuData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Real-time Analytics */}
              <Card className="glass-container border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-primary flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Performance Metrics ({dateFilter === 'all' ? 'All Time' : dateFilter.replace('days', ' Days').replace('months', ' Months')})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-primary/10">
                      <p className="text-2xl font-bold text-primary">{filteredPartnerSkuData.length}</p>
                      <p className="text-sm text-muted-foreground">Active SKUs</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/10">
                      <p className="text-2xl font-bold text-primary">
                        {filteredPartnerSkuData.reduce((sum, sku) => sum + sku.totalShippedQty, 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Shipped</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Excellent Performers</span>
                      <span>{filteredPartnerSkuData.filter(s => s.performance === 'excellent').length}</span>
                    </div>
                    <Progress 
                      value={filteredPartnerSkuData.length > 0 ? (filteredPartnerSkuData.filter(s => s.performance === 'excellent').length / filteredPartnerSkuData.length) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Growth Trending Up</span>
                      <span>{filteredPartnerSkuData.filter(s => s.trend === 'up').length}</span>
                    </div>
                    <Progress 
                      value={filteredPartnerSkuData.length > 0 ? (filteredPartnerSkuData.filter(s => s.trend === 'up').length / filteredPartnerSkuData.length) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>

                  {analyticsData && (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-primary">
                          {analyticsData.growthRate > 0 ? '+' : ''}{analyticsData.growthRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Average Growth Rate</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card className="glass-container border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-primary flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredPartnerSkuData.slice(0, 5).map((sku, index) => (
                      <div key={sku.partnerSku} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{sku.partnerSku}</p>
                            <p className="text-xs text-muted-foreground">
                              {sku.sources.length} sources
                              {sku.projectedGrowth !== 0 && (
                                <span className={`ml-2 ${sku.projectedGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {sku.projectedGrowth > 0 ? '+' : ''}{sku.projectedGrowth.toFixed(1)}%
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">{sku.totalShippedQty.toLocaleString()}</p>
                          <div className="flex items-center gap-1">
                            {sku.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                            {sku.trend === 'down' && <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />}
                            <Badge 
                              variant={sku.performance === 'excellent' ? 'default' : 
                                     sku.performance === 'good' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {sku.performance}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights */}
              {aiInsights.length > 0 && (
                <Card className="glass-container border-white/20 lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-primary flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      AI-Powered Insights
                      {isAnalyzing && <Sparkles className="w-4 h-4 animate-pulse" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isAnalyzing && (
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Analyzing data patterns...
                        </div>
                        <Progress value={progressValue} className="h-2" />
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiInsights.map((insight, index) => (
                        <Alert key={index} className="border-white/20">
                          <div className="flex items-start gap-3">
                            {insight.type === 'trend' && <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5" />}
                            {insight.type === 'anomaly' && <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />}
                            {insight.type === 'opportunity' && <Zap className="w-5 h-5 text-green-500 mt-0.5" />}
                            {insight.type === 'recommendation' && <CheckCircle className="w-5 h-5 text-purple-500 mt-0.5" />}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm">{insight.title}</h4>
                                <Badge 
                                  variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {insight.impact} impact
                                </Badge>
                              </div>
                              <AlertDescription className="text-xs">
                                {insight.description}
                              </AlertDescription>
                            </div>
                          </div>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Partner SKU Summary Section */}
          {showSummary && filteredPartnerSkuData.length > 0 && (
            <Card className="glass-container border-white/20 mb-6">
              <CardHeader>
                <CardTitle className="text-xl text-primary flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Partner SKU Performance Summary ({dateFilter === 'all' ? 'All Time' : dateFilter.replace('days', ' Days').replace('months', ' Months')})
                </CardTitle>
                <CardDescription>
                  Aggregated data showing total shipped quantities by Partner SKU for selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 backdrop-blur-md bg-background/80">
                      <TableRow className="border-white/20">
                        <TableHead className="text-primary font-semibold sticky top-0 backdrop-blur-md bg-background/80">Partner SKU</TableHead>
                        <TableHead className="text-primary font-semibold text-center sticky top-0 backdrop-blur-md bg-background/80">Total Shipped Qty</TableHead>
                        <TableHead className="text-primary font-semibold text-center sticky top-0 backdrop-blur-md bg-background/80">Total Sales</TableHead>
                        <TableHead className="text-primary font-semibold text-center sticky top-0 backdrop-blur-md bg-background/80">Avg Ranking</TableHead>
                        <TableHead className="text-primary font-semibold text-center sticky top-0 backdrop-blur-md bg-background/80">Date Range</TableHead>
                        <TableHead className="text-primary font-semibold text-center sticky top-0 backdrop-blur-md bg-background/80">Growth</TableHead>
                        <TableHead className="text-primary font-semibold text-center sticky top-0 backdrop-blur-md bg-background/80">Performance</TableHead>
                        <TableHead className="text-primary font-semibold text-center sticky top-0 backdrop-blur-md bg-background/80">Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPartnerSkuData.map((sku, index) => (
                        <TableRow key={sku.partnerSku} className="border-white/10 hover:bg-white/5">
                          <TableCell className="font-medium">{sku.partnerSku}</TableCell>
                          <TableCell className="text-center font-semibold text-primary">
                            {sku.totalShippedQty.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            {sku.totalSales > 0 ? `$${sku.totalSales.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {sku.avgRanking > 0 ? sku.avgRanking.toFixed(1) : '-'}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {sku.firstShippedDate && sku.lastShippedDate ? (
                              <div>
                                <div>{format(sku.firstShippedDate, 'MMM dd')}</div>
                                <div className="text-muted-foreground">to</div>
                                <div>{format(sku.lastShippedDate, 'MMM dd')}</div>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {sku.projectedGrowth !== 0 ? (
                              <span className={`text-xs font-semibold ${sku.projectedGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {sku.projectedGrowth > 0 ? '+' : ''}{sku.projectedGrowth.toFixed(1)}%
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={sku.performance === 'excellent' ? 'default' : 
                                     sku.performance === 'good' ? 'secondary' : 'outline'}
                              className="capitalize"
                            >
                              {sku.performance}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              {sku.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                              {sku.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />}
                              {sku.trend === 'stable' && <div className="w-4 h-4 rounded-full bg-yellow-500/20 border border-yellow-500/50" />}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
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
                        onCheckedChange={() => setColumnVisibility(prev => ({
                          ...prev,
                          [column]: !prev[column]
                        }))}
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

          {/* Main Data Table */}
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Processed Data</span>
                <div className="flex gap-2">
                  <Badge variant="outline">{filteredData.length} rows</Badge>
                  <Badge variant="outline">{visibleColumns.length} columns</Badge>
                  {selectedRows.size > 0 && (
                    <Button size="sm" onClick={() => {
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
                    }}>
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
                              onCheckedChange={() => {
                                setSelectedRows(prev => {
                                  const newSet = new Set(prev)
                                  if (newSet.has(actualIndex)) {
                                    newSet.delete(actualIndex)
                                  } else {
                                    newSet.add(actualIndex)
                                  }
                                  return newSet
                                })
                              }}
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
        </>
      )}
    </div>
  )
}
