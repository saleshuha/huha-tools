import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { Package, Plus, Search, Edit, Download, Upload, Check, X, RefreshCw, AlertTriangle, Printer, Hash, Mail, BarChart3, Filter, Grid3X3, List, SortAsc, SortDesc, Calendar as CalendarIcon, TrendingUp, TrendingDown, Eye, Archive, Zap, Clock, ShoppingCart, Trash2, Settings, FileText, Copy, Star, Edit3, Activity, Database, ChevronDown, Command, History, Bookmark } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { DualQuantityEditor } from './DualQuantityEditor';
import { StockHistoryDialog } from './StockHistoryDialog';
import { SkuEditor } from './SkuEditor';
import { TitleEditor } from './TitleEditor';
import { InventoryMetrics } from './InventoryMetrics';
import { InventoryDashboard } from './InventoryDashboard';
import { BulkSkuUpload } from './BulkSkuUpload';
import { BulkTitleUpload } from './BulkTitleUpload';
import { SimpleWarehouseManager } from './SimpleWarehouseManager';
import { useWarehouseManager } from '@/hooks/useWarehouseManager';
import { useBackgroundTasks } from '@/contexts/BackgroundTasksContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
export function AsinInventory() {
  const {
    inventory,
    loading,
    addItem,
    updateItemStatus,
    bulkAdd,
    restockItem,
    updateQuantity,
    updateSku,
    updateTitle,
    bulkUpdateSkus,
    bulkUpdateTitles,
    fetchTitlesFromSunsky,
    refetch
  } = useAsinInventory();
  const {
    user
  } = useUserProfile();
  const {
    runTitleFetch
  } = useBackgroundTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMethod, setSearchMethod] = useState<'all' | 'asin' | 'sku' | 'serial' | 'title' | 'notes'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dateAdded' | 'asin' | 'quantity' | 'status'>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Enhanced search states
  const [searchExactMatch, setSearchExactMatch] = useState(false);
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<{
    term: string;
    method: string;
    name: string;
  }[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
  const [isBulkQuantityDialogOpen, setIsBulkQuantityDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<AsinInventoryItem['status']>('in-stock');
  const [bulkQuantityValue, setBulkQuantityValue] = useState(1);
  const [bulkQuantityReason, setBulkQuantityReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [quickFilter, setQuickFilter] = useState<'all' | 'low-stock' | 'out-of-stock' | 'recent'>('all');
  const [dateFilterFrom, setDateFilterFrom] = useState<Date>();
  const [dateFilterTo, setDateFilterTo] = useState<Date>();
  const {
    selectedWarehouse
  } = useWarehouseManager();
  const {
    toast
  } = useToast();

  // Enhanced search functions
  const addToSearchHistory = useCallback((term: string) => {
    if (term.trim() && !searchHistory.includes(term)) {
      setSearchHistory(prev => [term, ...prev.slice(0, 9)]);
    }
  }, [searchHistory]);
  const handleSearchSubmit = useCallback(() => {
    if (searchTerm.trim()) {
      addToSearchHistory(searchTerm);
    }
  }, [searchTerm, addToSearchHistory]);
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setSearchMethod('all');
    setStatusFilter('all');
    setQuickFilter('all');
    setDateFilterFrom(undefined);
    setDateFilterTo(undefined);
    setSortBy('dateAdded');
    setSortOrder('desc');
    setCurrentPage(1);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            searchInputRef.current?.focus();
            break;
          case '/':
            e.preventDefault();
            searchInputRef.current?.focus();
            break;
        }
      }
      if (e.key === 'Escape' && searchInputRef.current === document.activeElement) {
        searchInputRef.current?.blur();
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Search suggestions based on existing data
  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const suggestions = new Set<string>();
    const term = searchTerm.toLowerCase();
    inventory.forEach(item => {
      if (searchMethod === 'all' || searchMethod === 'asin') {
        if (item.asin.toLowerCase().includes(term)) suggestions.add(item.asin);
      }
      if (searchMethod === 'all' || searchMethod === 'sku') {
        if (item.sku?.toLowerCase().includes(term)) suggestions.add(item.sku);
      }
      if (searchMethod === 'all' || searchMethod === 'title') {
        if (item.title?.toLowerCase().includes(term)) {
          const words = item.title.split(' ');
          words.forEach(word => {
            if (word.toLowerCase().includes(term) && word.length > 2) {
              suggestions.add(word);
            }
          });
        }
      }
    });
    return Array.from(suggestions).slice(0, 8);
  }, [searchTerm, searchMethod, inventory]);

  // Form states
  const [newItem, setNewItem] = useState<{
    asin: string;
    serialNumber: string;
    sku: string;
    title: string;
    status: AsinInventoryItem['status'];
    quantity: number;
    notes: string;
  }>({
    asin: '',
    serialNumber: '',
    sku: '',
    title: '',
    status: 'in-stock',
    quantity: 1,
    notes: ''
  });
  const [bulkText, setBulkText] = useState('');

  // Calculate duplicate ASINs from original inventory data
  const duplicateData = useMemo(() => {
    const asinCounts = new Map<string, AsinInventoryItem[]>();
    inventory.forEach(item => {
      if (!asinCounts.has(item.asin)) {
        asinCounts.set(item.asin, []);
      }
      asinCounts.get(item.asin)!.push(item);
    });
    const duplicates = new Map<string, AsinInventoryItem[]>();
    asinCounts.forEach((items, asin) => {
      if (items.length > 1) {
        duplicates.set(asin, items);
      }
    });
    return {
      duplicates,
      totalDuplicateASINs: duplicates.size,
      totalDuplicateItems: Array.from(duplicates.values()).reduce((sum, items) => sum + items.length, 0)
    };
  }, [inventory]);
  const filteredInventory = useMemo(() => {
    let filtered = inventory;

    // Apply search filter with enhanced options
    if (searchTerm) {
      const searchValue = searchCaseSensitive ? searchTerm : searchTerm.toLowerCase();
      const searchTerms = searchExactMatch ? [searchValue] : searchValue.split(' ').filter(term => term.length > 0);
      filtered = filtered.filter(item => {
        const getValue = (val: string | undefined) => searchCaseSensitive ? val || '' : (val || '').toLowerCase();
        if (searchMethod === 'all') {
          const matches = searchTerms.every(term => {
            const asinMatch = searchExactMatch ? getValue(item.asin) === term : getValue(item.asin).includes(term);
            const serialMatch = searchExactMatch ? getValue(item.serialNumber) === term : getValue(item.serialNumber).includes(term);
            const skuMatch = item.sku && (searchExactMatch ? getValue(item.sku) === term : getValue(item.sku).includes(term));
            const titleMatch = item.title && (searchExactMatch ? getValue(item.title) === term : getValue(item.title).includes(term));
            const notesMatch = item.notes && (searchExactMatch ? getValue(item.notes) === term : getValue(item.notes).includes(term));
            return asinMatch || serialMatch || skuMatch || titleMatch || notesMatch;
          });
          return matches;
        } else if (searchMethod === 'asin') {
          return searchExactMatch ? getValue(item.asin) === searchValue : searchTerms.every(term => getValue(item.asin).includes(term));
        } else if (searchMethod === 'sku') {
          return item.sku && (searchExactMatch ? getValue(item.sku) === searchValue : searchTerms.every(term => getValue(item.sku).includes(term)));
        } else if (searchMethod === 'serial') {
          return searchExactMatch ? getValue(item.serialNumber) === searchValue : searchTerms.every(term => getValue(item.serialNumber).includes(term));
        } else if (searchMethod === 'title') {
          return item.title && (searchExactMatch ? getValue(item.title) === searchValue : searchTerms.every(term => getValue(item.title).includes(term)));
        } else if (searchMethod === 'notes') {
          return item.notes && (searchExactMatch ? getValue(item.notes) === searchValue : searchTerms.every(term => getValue(item.notes).includes(term)));
        }
        return false;
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply quick filter
    if (quickFilter === 'low-stock') {
      filtered = filtered.filter(item => item.quantity > 0 && item.quantity <= 5);
    } else if (quickFilter === 'out-of-stock') {
      filtered = filtered.filter(item => item.quantity === 0);
      if (dateFilterFrom || dateFilterTo) {
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.dateAdded);
          const fromDate = dateFilterFrom ? new Date(dateFilterFrom.setHours(0, 0, 0, 0)) : null;
          const toDate = dateFilterTo ? new Date(dateFilterTo.setHours(23, 59, 59, 999)) : null;
          if (fromDate && toDate) {
            return itemDate >= fromDate && itemDate <= toDate;
          } else if (fromDate) {
            return itemDate >= fromDate;
          } else if (toDate) {
            return itemDate <= toDate;
          }
          return true;
        });
      }
    } else if (quickFilter === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(item => new Date(item.dateAdded) >= sevenDaysAgo);
    }

    // Merge duplicate ASINs - combine quantities and serial numbers
    const asinGroups = new Map();
    filtered.forEach(item => {
      const key = item.asin;
      if (asinGroups.has(key)) {
        const existing = asinGroups.get(key);
        existing.quantity += item.quantity;
        existing.serialNumber = existing.serialNumber + ', ' + item.serialNumber;
        existing.individualItems = existing.individualItems || [existing];
        existing.individualItems.push(item);
        if (item.status === 'in-stock' && existing.status !== 'in-stock') {
          existing.status = item.status;
        }
        if (new Date(item.dateAdded) < new Date(existing.dateAdded)) {
          existing.dateAdded = item.dateAdded;
        }
        if (item.notes && !existing.notes?.includes(item.notes)) {
          existing.notes = existing.notes ? existing.notes + '; ' + item.notes : item.notes;
        }
      } else {
        asinGroups.set(key, {
          ...item,
          individualItems: [item]
        });
      }
    });
    filtered = Array.from(asinGroups.values());

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      if (sortBy === 'dateAdded') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    return filtered;
  }, [inventory, searchTerm, searchExactMatch, searchCaseSensitive, statusFilter, sortBy, sortOrder, quickFilter, dateFilterFrom, dateFilterTo, searchMethod]);
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + itemsPerPage);
  const handleAddItem = async () => {
    if (!newItem.asin.trim() || !newItem.serialNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "ASIN and Serial Number are required",
        variant: "destructive"
      });
      return;
    }
    const duplicateAsin = inventory.find(item => item.asin.toLowerCase() === newItem.asin.toLowerCase().trim());
    if (duplicateAsin) {
      toast({
        title: "Duplicate ASIN",
        description: `ASIN "${newItem.asin}" already exists in inventory. Each ASIN must be unique.`,
        variant: "destructive"
      });
      return;
    }
    const duplicateSerial = inventory.find(item => item.serialNumber.toLowerCase() === newItem.serialNumber.toLowerCase().trim());
    if (duplicateSerial) {
      toast({
        title: "Duplicate Serial Number",
        description: `Serial number "${newItem.serialNumber}" already exists in inventory. Each serial number must be unique.`,
        variant: "destructive"
      });
      return;
    }
    if (newItem.sku && newItem.sku.trim()) {
      const duplicateSku = inventory.find(item => item.sku && item.sku.toLowerCase() === newItem.sku.toLowerCase().trim());
      if (duplicateSku) {
        toast({
          title: "Duplicate SKU",
          description: `SKU "${newItem.sku}" already exists in inventory. Each SKU must be unique.`,
          variant: "destructive"
        });
        return;
      }
    }
    await addItem({
      ...newItem,
      dateAdded: new Date().toISOString()
    });
    setIsAddDialogOpen(false);
    setNewItem({
      asin: '',
      serialNumber: '',
      sku: '',
      title: '',
      status: 'in-stock',
      quantity: 1,
      notes: ''
    });
  };
  const handleBulkAdd = async () => {
    if (!bulkText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter some data to import",
        variant: "destructive"
      });
      return;
    }
    const lines = bulkText.trim().split('\n');
    const items = [];
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 4) {
        items.push({
          asin: parts[0].trim(),
          serialNumber: parts[1].trim(),
          sku: parts[2]?.trim() || '',
          status: parts[3].trim() as AsinInventoryItem['status'],
          quantity: parseInt(parts[4]) || 1,
          notes: parts[5]?.trim() || '',
          dateAdded: new Date().toISOString()
        });
      }
    }
    if (items.length === 0) {
      toast({
        title: "No Valid Data",
        description: "No valid items found in the input",
        variant: "destructive"
      });
      return;
    }
    const validationErrors = [];
    const seenAsins = new Set();
    const seenSerials = new Set();
    const seenSkus = new Set();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const duplicateAsin = inventory.find(existing => existing.asin.toLowerCase() === item.asin.toLowerCase());
      if (duplicateAsin) {
        validationErrors.push(`Row ${i + 1}: ASIN "${item.asin}" already exists in inventory`);
        continue;
      }
      if (seenAsins.has(item.asin.toLowerCase())) {
        validationErrors.push(`Row ${i + 1}: ASIN "${item.asin}" appears multiple times in bulk data`);
        continue;
      }
      seenAsins.add(item.asin.toLowerCase());
      const duplicateSerial = inventory.find(existing => existing.serialNumber.toLowerCase() === item.serialNumber.toLowerCase());
      if (duplicateSerial) {
        validationErrors.push(`Row ${i + 1}: Serial number "${item.serialNumber}" already exists in inventory`);
        continue;
      }
      if (seenSerials.has(item.serialNumber.toLowerCase())) {
        validationErrors.push(`Row ${i + 1}: Serial number "${item.serialNumber}" appears multiple times in bulk data`);
        continue;
      }
      seenSerials.add(item.serialNumber.toLowerCase());
      if (item.sku && item.sku.trim()) {
        const duplicateSku = inventory.find(existing => existing.sku && existing.sku.toLowerCase() === item.sku.toLowerCase());
        if (duplicateSku) {
          validationErrors.push(`Row ${i + 1}: SKU "${item.sku}" already exists in inventory`);
          continue;
        }
        if (seenSkus.has(item.sku.toLowerCase())) {
          validationErrors.push(`Row ${i + 1}: SKU "${item.sku}" appears multiple times in bulk data`);
          continue;
        }
        seenSkus.add(item.sku.toLowerCase());
      }
    }
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Errors",
        description: `Found ${validationErrors.length} duplicate(s): ${validationErrors.slice(0, 3).join(', ')}${validationErrors.length > 3 ? '...' : ''}`,
        variant: "destructive"
      });
      return;
    }
    await bulkAdd(items);
    setBulkText('');
    setIsBulkDialogOpen(false);
    toast({
      title: "Success",
      description: `Added ${items.length} items to inventory`
    });
  };
  const exportInventory = () => {
    const csvData = [['SKU', 'UPC', 'ASIN', 'Title', 'Warehouse', 'Warehouse name', 'Available units', 'Status'], ...filteredInventory.map(item => [item.sku || '', '', item.asin, item.title || '', selectedWarehouse?.name || 'Default', selectedWarehouse?.name || 'Default Warehouse', item.quantity.toString(), item.status])];
    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Export Complete",
      description: `Exported ${filteredInventory.length} items`
    });
  };
  const emailInventory = async () => {
    if (!user?.email) {
      toast({
        title: "No Email Found",
        description: "User email not available",
        variant: "destructive"
      });
      return;
    }
    try {
      const csvData = [['SKU', 'UPC', 'ASIN', 'Title', 'Warehouse', 'Warehouse name', 'Available units', 'Status'], ...filteredInventory.map(item => [item.sku || '', '', item.asin, item.title || '', selectedWarehouse?.name || 'Default', selectedWarehouse?.name || 'Default Warehouse', item.quantity.toString(), item.status])];
      const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
      const {
        data,
        error
      } = await supabase.functions.invoke('send-inventory-email', {
        body: {
          email: user.email,
          csvContent: csvContent,
          subject: `Inventory Report - ${new Date().toLocaleDateString()}`,
          totalItems: filteredInventory.length
        }
      });
      if (error) throw error;
      toast({
        title: "Email Sent",
        description: `Inventory report sent to ${user.email}`
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Email Failed",
        description: "Could not send inventory report",
        variant: "destructive"
      });
    }
  };
  const handleQuantityUpdate = async (id: string, newQuantity: number, reason?: string) => {
    const item = paginatedInventory.find(item => item.id === id);
    if (!item) return;
    if ((item as any).individualItems && (item as any).individualItems.length > 1) {
      for (const individualItem of (item as any).individualItems) {
        await updateQuantity(individualItem.id, newQuantity, reason);
      }
    } else {
      await updateQuantity(id, newQuantity, reason);
    }
  };

  // This function is no longer needed as the logic is implemented directly in the button click handler

  const mergeDuplicates = useCallback(async () => {
    if (duplicateData.duplicates.size === 0) {
      toast({
        title: "No Duplicates Found",
        description: "There are no duplicate ASINs to merge",
        variant: "destructive"
      });
      return;
    }
    try {
      let mergedCount = 0;
      let deletedCount = 0;
      for (const [asin, items] of duplicateData.duplicates) {
        if (items.length <= 1) continue;
        const primaryItem = items[0];
        const itemsToMerge = items.slice(1);
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const combinedSerialNumbers = items.map(item => item.serialNumber).join(', ');
        const combinedNotes = items.map(item => item.notes).filter(Boolean).join('; ');
        await updateQuantity(primaryItem.id, totalQuantity, `Merged ${items.length} duplicate ASINs`);
        const {
          error: updateError
        } = await supabase.from('asin_inventory').update({
          serial_number: combinedSerialNumbers,
          notes: combinedNotes || primaryItem.notes
        }).eq('id', primaryItem.id);
        if (updateError) throw updateError;
        const itemsToDelete = itemsToMerge.map(item => item.id);
        const {
          error: deleteError
        } = await supabase.from('asin_inventory').delete().in('id', itemsToDelete);
        if (deleteError) throw deleteError;
        mergedCount++;
        deletedCount += itemsToDelete.length;
      }
      refetch();
      toast({
        title: "Duplicates Merged Successfully",
        description: `Merged ${mergedCount} duplicate ASINs and removed ${deletedCount} duplicate entries`
      });
      setIsDuplicateDialogOpen(false);
    } catch (error) {
      console.error('Error merging duplicates:', error);
      toast({
        title: "Merge Failed",
        description: "Could not merge duplicate ASINs",
        variant: "destructive"
      });
    }
  }, [duplicateData, refetch, toast, setIsDuplicateDialogOpen]);
  const exportDuplicates = () => {
    if (duplicateData.duplicates.size === 0) {
      toast({
        title: "No Duplicates Found",
        description: "There are no duplicate ASINs to export",
        variant: "destructive"
      });
      return;
    }
    const csvData = [];
    csvData.push(['ASIN', 'Serial Number', 'SKU', 'Status', 'Quantity', 'Date Added', 'Notes', 'Duplicate Count']);
    duplicateData.duplicates.forEach((items, asin) => {
      items.forEach(item => {
        csvData.push([item.asin, item.serialNumber, item.sku || '', item.status, item.quantity.toString(), new Date(item.dateAdded).toLocaleDateString(), item.notes || '', items.length.toString()]);
      });
    });
    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `duplicate-asins-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Export Complete",
      description: `Exported ${duplicateData.totalDuplicateItems} duplicate items across ${duplicateData.totalDuplicateASINs} ASINs`
    });
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading your inventory...</p>
        </div>
      </div>;
  }
  return <div className="space-y-6 max-w-[95vw] mx-auto p-6">
      {/* Header with Stats */}
      <div className="space-y-6">
        <InventoryMetrics showOnlyAsin={true} />
        
        {/* Duplicate ASIN Metrics Card */}
        {duplicateData.totalDuplicateASINs > 0 && <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-orange-300" onClick={() => setIsDuplicateDialogOpen(true)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-orange-800">
                      Duplicate ASINs Detected
                    </CardTitle>
                    <p className="text-sm text-orange-600 mt-1">
                      Click to view and manage duplicate entries
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-700">
                    {duplicateData.totalDuplicateASINs}
                  </div>
                  <div className="text-xs text-orange-600 uppercase tracking-wide">
                    Duplicate ASINs
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>}
      </div>

      {/* Main Content Card */}
      <Card className="bg-background/50 backdrop-blur border-2 border-primary/10">
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Enhanced Sticky Search Bar */}
            <Card className="sticky top-4 z-10 bg-gradient-surface border-2 border-primary/20 shadow-xl backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Search Input Row */}
                  <div className="flex gap-3">
                    <Select value={searchMethod} onValueChange={(value: 'all' | 'asin' | 'sku' | 'serial' | 'title' | 'notes') => setSearchMethod(value)}>
                      <SelectTrigger className="w-48 h-12 text-base font-medium border-2 border-primary/40 focus:border-primary bg-background/80 backdrop-blur shadow-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur border-2 shadow-xl z-50">
                        <SelectItem value="all">🔍 All Fields</SelectItem>
                        <SelectItem value="asin">📦 ASIN</SelectItem>
                        <SelectItem value="sku">🏷️ SKU</SelectItem>
                        <SelectItem value="serial">🔢 Serial</SelectItem>
                        <SelectItem value="title">📝 Title</SelectItem>
                        <SelectItem value="notes">📋 Notes</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input ref={searchInputRef} placeholder={`Search ${searchMethod === 'all' ? 'all fields' : searchMethod}... (Ctrl+K)`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSearchSubmit()} onFocus={() => setShowSearchSuggestions(true)} onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)} className="pl-12 pr-32 h-12 text-lg font-medium shadow-lg border-2 border-primary/40 focus:border-primary ring-2 ring-primary/10 focus:ring-primary/30 bg-background/80 backdrop-blur" />
                      
                      {/* Search Controls */}
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                        {searchTerm && <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')} className="h-8 w-8 p-0 hover:bg-background/80">
                            <X className="w-4 h-4" />
                          </Button>}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <div className="p-2 space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="exact-match" checked={searchExactMatch} onCheckedChange={checked => setSearchExactMatch(checked === true)} />
                                <Label htmlFor="exact-match" className="text-sm">Exact match</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="case-sensitive" checked={searchCaseSensitive} onCheckedChange={checked => setSearchCaseSensitive(checked === true)} />
                                <Label htmlFor="case-sensitive" className="text-sm">Case sensitive</Label>
                              </div>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Search Suggestions */}
                      {showSearchSuggestions && (searchSuggestions.length > 0 || searchHistory.length > 0) && <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur border-2 border-primary/20 rounded-lg shadow-xl z-40 max-h-64 overflow-y-auto">
                          {searchSuggestions.length > 0 && <div className="p-2">
                              <div className="text-xs font-medium text-muted-foreground px-2 py-1">Suggestions</div>
                              {searchSuggestions.map((suggestion, i) => <Button key={i} variant="ghost" size="sm" onClick={() => {
                          setSearchTerm(suggestion);
                          setShowSearchSuggestions(false);
                        }} className="w-full justify-start h-8 px-2 text-sm hover:bg-primary/10">
                                  <Search className="w-3 h-3 mr-2" />
                                  {suggestion}
                                </Button>)}
                            </div>}
                          
                          {searchHistory.length > 0 && <div className="p-2 border-t">
                              <div className="text-xs font-medium text-muted-foreground px-2 py-1">Recent</div>
                              {searchHistory.slice(0, 5).map((term, i) => <Button key={i} variant="ghost" size="sm" onClick={() => {
                          setSearchTerm(term);
                          setShowSearchSuggestions(false);
                        }} className="w-full justify-start h-8 px-2 text-sm hover:bg-primary/10">
                                  <History className="w-3 h-3 mr-2" />
                                  {term}
                                </Button>)}
                            </div>}
                        </div>}
                    </div>
                  </div>

                  {/* Search Status & Clear All */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{filteredInventory.length} of {inventory.length} items</span>
                      {(searchTerm || statusFilter !== 'all' || quickFilter !== 'all' || dateFilterFrom || dateFilterTo) && <Badge variant="secondary" className="bg-primary/10">
                          {[searchTerm && 'Search', statusFilter !== 'all' && 'Status', quickFilter !== 'all' && 'Filter', (dateFilterFrom || dateFilterTo) && 'Date'].filter(Boolean).join(', ')} active
                        </Badge>}
                    </div>
                    
                    {(searchTerm || statusFilter !== 'all' || quickFilter !== 'all' || dateFilterFrom || dateFilterTo) && <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4 mr-1" />
                        Clear all
                      </Button>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organized Action Groups */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Primary Actions */}
              <Card className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 border-green-200/50">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Items
                  </h3>
                  <div className="space-y-2">
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Single Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="asin">ASIN</Label>
                            <Input id="asin" value={newItem.asin} onChange={e => setNewItem({
                            ...newItem,
                            asin: e.target.value
                          })} placeholder="Enter ASIN..." />
                          </div>
                          <div>
                            <Label htmlFor="serialNumber">Serial Number</Label>
                            <Input id="serialNumber" value={newItem.serialNumber} onChange={e => setNewItem({
                            ...newItem,
                            serialNumber: e.target.value
                          })} placeholder="Enter Serial Number..." />
                          </div>
                          <div>
                            <Label htmlFor="sku">SKU (Optional)</Label>
                            <Input id="sku" value={newItem.sku} onChange={e => setNewItem({
                            ...newItem,
                            sku: e.target.value
                          })} placeholder="Enter SKU (optional)" />
                          </div>
                          <div>
                            <Label htmlFor="title">Title (Optional)</Label>
                            <Input id="title" value={newItem.title} onChange={e => setNewItem({
                            ...newItem,
                            title: e.target.value
                          })} placeholder="Enter title (optional)" />
                          </div>
                          <div>
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input id="quantity" type="number" min="1" value={newItem.quantity} onChange={e => setNewItem({
                            ...newItem,
                            quantity: parseInt(e.target.value) || 1
                          })} />
                          </div>
                          <div>
                            <Label htmlFor="status">Status</Label>
                            <Select value={newItem.status} onValueChange={(value: AsinInventoryItem['status']) => setNewItem({
                            ...newItem,
                            status: value
                          })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in-stock">In Stock</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                                <SelectItem value="reserved">Reserved</SelectItem>
                                <SelectItem value="damaged">Damaged</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Textarea id="notes" value={newItem.notes} onChange={e => setNewItem({
                            ...newItem,
                            notes: e.target.value
                          })} placeholder="Enter notes (optional)" rows={3} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddItem}>
                            Add Item
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Upload className="w-4 h-4 mr-2" />
                          Bulk Import
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            Bulk Import Items
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="bulkText">
                              Paste data (tab-separated: ASIN, Serial Number, SKU, Status, Quantity, Notes)
                            </Label>
                            <Textarea id="bulkText" value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder={`B0ABC123\tSN001\tSKU001\tin-stock\t1\tNotes here\nB0DEF456\tSN002\tSKU002\tsold\t1\tMore notes`} rows={10} className="font-mono text-sm" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Format: Each row should have ASIN, Serial Number, SKU, Status, Quantity, and Notes separated by tabs.
                          </p>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleBulkAdd}>
                            Import Items
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* Data Actions */}
              <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-blue-200/50">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Data Management
                  </h3>
                  <div className="space-y-2">
                    <Button onClick={exportInventory} variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                    <Button onClick={emailInventory} variant="outline" className="w-full">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Report
                    </Button>
                    <Button onClick={() => {
                    const itemsWithMissingTitles = inventory.filter(item => item.sku && !item.title);
                    if (itemsWithMissingTitles.length > 0) {
                      runTitleFetch(itemsWithMissingTitles, updates => {
                        console.log('Title updates received:', updates);
                        refetch(); // Refresh inventory after titles are updated
                      });
                      toast({
                        title: "Title Fetch Started",
                        description: `Fetching titles for ${itemsWithMissingTitles.length} items from Sunsky API`
                      });
                    } else {
                      toast({
                        title: "No Items to Update",
                        description: "All items already have titles or no SKUs to lookup"
                      });
                    }
                  }} variant="outline" className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Update Titles
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Utility Actions */}
              <Card className="bg-gradient-to-br from-orange-50/50 to-amber-50/50 border-orange-200/50">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Tools & Utilities
                  </h3>
                  <div className="space-y-2">
                    <Button onClick={refetch} variant="outline" className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Data
                    </Button>
                    {duplicateData.totalDuplicateASINs > 0 && <Button onClick={() => setIsDuplicateDialogOpen(true)} variant="outline" className="w-full text-orange-600 hover:text-orange-700">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Manage Duplicates ({duplicateData.totalDuplicateASINs})
                      </Button>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Filters Row */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/20 rounded-lg border">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Quick Filters:
              </Label>
              <div className="flex flex-wrap gap-3">
                <Button variant={quickFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setQuickFilter('all')} className="transition-all duration-200">
                  <Eye className="w-4 h-4 mr-2" />
                  All Items ({inventory.length})
                </Button>
                <Button variant={quickFilter === 'low-stock' ? 'default' : 'outline'} size="sm" onClick={() => setQuickFilter('low-stock')} className="transition-all duration-200">
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Low Stock ({inventory.filter(item => item.quantity > 0 && item.quantity <= 5).length})
                </Button>
                <Button variant={quickFilter === 'out-of-stock' ? 'default' : 'outline'} size="sm" onClick={() => setQuickFilter('out-of-stock')} className="transition-all duration-200">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Out of Stock ({inventory.filter(item => item.quantity === 0).length})
                </Button>
                <Button variant={quickFilter === 'recent' ? 'default' : 'outline'} size="sm" onClick={() => setQuickFilter('recent')} className="transition-all duration-200">
                  <Clock className="w-4 h-4 mr-2" />
                  Recent (7 days)
                </Button>
              </div>
            </div>

            {/* Date Filter (only show when out-of-stock is selected) */}
            {quickFilter === 'out-of-stock' && <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Date Filter:
                </Label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">From:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dateFilterFrom && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFilterFrom ? format(dateFilterFrom, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateFilterFrom} onSelect={setDateFilterFrom} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">To:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dateFilterTo && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFilterTo ? format(dateFilterTo, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateFilterTo} onSelect={setDateFilterTo} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Button variant="outline" size="sm" onClick={() => {
                setDateFilterFrom(undefined);
                setDateFilterTo(undefined);
              }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4 mr-2" />
                    Clear Dates
                  </Button>
                </div>
              </div>}

            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-6">
              {/* Status Filter */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-background border">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in-stock">In Stock Only</SelectItem>
                    <SelectItem value="sold">Sold Only</SelectItem>
                    <SelectItem value="reserved">Reserved Only</SelectItem>
                    <SelectItem value="damaged">Damaged Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">View:</Label>
                <div className="flex border rounded-lg p-1 bg-background">
                  <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="h-8">
                    <List className="w-4 h-4 mr-1" />
                    Table
                  </Button>
                  <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-8">
                    <Grid3X3 className="w-4 h-4 mr-1" />
                    Grid
                  </Button>
                </div>
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Sort by:</Label>
                <Select value={sortBy} onValueChange={(value: 'dateAdded' | 'asin' | 'quantity' | 'status') => setSortBy(value)}>
                  <SelectTrigger className="w-40 bg-background border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="dateAdded">Date Added</SelectItem>
                    <SelectItem value="asin">ASIN</SelectItem>
                    <SelectItem value="quantity">Quantity</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </Button>
              </div>

              {/* Items per page */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Items per page:</Label>
                <Select value={itemsPerPage.toString()} onValueChange={value => setItemsPerPage(parseInt(value))}>
                  <SelectTrigger className="w-20 bg-background border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Display */}
            {filteredInventory.length === 0 ? <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No items found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms or filters' : 'Start by adding some inventory items'}
                </p>
              </div> : <>
                {/* Inventory Display */}
                {viewMode === 'table' ? <div className="rounded-lg border bg-background overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Product Info</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Serial #</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Quantity</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date Added</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {paginatedInventory.map(item => <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="space-y-2 min-w-[280px]">
                                  {/* Title */}
                                  <div className="text-sm font-medium">
                                    {item.title ? <TitleEditor currentTitle={item.title} onUpdate={newTitle => updateTitle(item.id, newTitle)} /> : <span className="text-muted-foreground italic">No Title</span>}
                                  </div>
                                  
                                  {/* ASIN */}
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs">
                                      ASIN: {item.asin}
                                    </Badge>
                                  </div>
                                  
                                  {/* SKU */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">SKU:</span>
                                    {item.sku ? <SkuEditor currentSku={item.sku} onUpdate={newSku => updateSku(item.id, newSku)} /> : <span className="text-xs text-muted-foreground italic">No SKU</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-mono text-sm max-w-[120px] truncate" title={item.serialNumber}>
                                  {item.serialNumber}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <DualQuantityEditor currentQuantity={item.quantity} onUpdate={(newQuantity, reason) => handleQuantityUpdate(item.id, newQuantity, reason)} />
                              </td>
                              <td className="px-4 py-3">
                                <Select value={item.status} onValueChange={(value: AsinInventoryItem['status']) => updateItemStatus(item.id, value)}>
                                  <SelectTrigger className="w-32 h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="in-stock">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        In Stock
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="sold">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        Sold
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="reserved">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                        Reserved
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="damaged">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        Damaged
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-muted-foreground">
                                  {new Date(item.dateAdded).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2 min-w-[140px]">
                                  <StockHistoryDialog inventoryId={item.id} itemIdentifier={item.asin} inventoryType="asin" />
                                  <Button variant="ghost" size="sm" onClick={() => {
                            navigator.clipboard.writeText(item.asin);
                            toast({
                              title: "Copied",
                              description: "ASIN copied to clipboard"
                            });
                          }}>
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedInventory.map(item => <Card key={item.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="font-mono text-xs">
                                {item.asin}
                              </Badge>
                              <div className={`w-3 h-3 rounded-full ${item.status === 'in-stock' ? 'bg-green-500' : item.status === 'sold' ? 'bg-blue-500' : item.status === 'reserved' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                            </div>
                            
                            <div>
                              <div className="font-medium text-sm truncate">
                                {item.title || 'No Title'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                SKU: {item.sku || 'No SKU'}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="text-sm">
                                <span className="font-medium">Qty: </span>
                                <Badge variant={item.quantity === 0 ? 'destructive' : item.quantity <= 5 ? 'secondary' : 'default'}>
                                  {item.quantity}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(item.dateAdded).toLocaleDateString()}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(item.asin);
                        toast({
                          title: "Copied",
                          description: "ASIN copied to clipboard"
                        });
                      }} className="flex-1">
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                              <StockHistoryDialog inventoryId={item.id} itemIdentifier={item.asin} inventoryType="asin" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>)}
                  </div>}

                {/* Pagination */}
                {totalPages > 1 && <div className="flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                        </PaginationItem>
                        
                        {Array.from({
                    length: Math.min(5, totalPages)
                  }, (_, i) => {
                    const page = i + 1;
                    return <PaginationItem key={page}>
                              <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                                {page}
                              </PaginationLink>
                            </PaginationItem>;
                  })}
                        
                        {totalPages > 5 && <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>}
                        
                        <PaginationItem>
                          <PaginationNext onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>}
              </>}
          </div>
        </CardContent>
      </Card>

      {/* Duplicate ASINs Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Manage Duplicate ASINs ({duplicateData.totalDuplicateASINs})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={mergeDuplicates} className="bg-orange-600 hover:bg-orange-700 text-white">
                <Package className="w-4 h-4 mr-2" />
                Merge All Duplicates
              </Button>
              <Button onClick={exportDuplicates} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Duplicates
              </Button>
            </div>
            
            <div className="border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">ASIN</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Count</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Serial Numbers</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Total Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Array.from(duplicateData.duplicates.entries()).map(([asin, items]) => <tr key={asin} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-sm">{asin}</td>
                      <td className="px-4 py-2">
                        <Badge variant="destructive">{items.length}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="max-w-xs truncate text-sm">
                          {items.map(item => item.serialNumber).join(', ')}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {items.reduce((sum, item) => sum + item.quantity, 0)}
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}