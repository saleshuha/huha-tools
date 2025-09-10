import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { Package, Plus, Search, Edit, Download, Upload, Check, X, RefreshCw, AlertTriangle, Printer, Hash, Mail, BarChart3, Filter, Grid3X3, List, SortAsc, SortDesc, Calendar as CalendarIcon, TrendingUp, TrendingDown, Eye, Archive, Zap, Clock, ShoppingCart, Trash2, Settings, FileText, Copy, Star, Edit3, Activity, Database } from 'lucide-react';
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
import { LabelTemplateManager } from './LabelTemplateManager';
import { useWarehouseManager } from '@/hooks/useWarehouseManager';
import { useBackgroundTasks } from '@/contexts/BackgroundTasksContext';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { generateOrderLabelZPL, type OrderItem, type OrderLabelSettings } from '@/utils/order-label-printer';
import { PrintService } from '@/services/print-service';
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
  const [sortBy, setSortBy] = useState<'dateAdded' | 'asin' | 'quantity' | 'status' | 'title' | 'serialNumber'>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<AsinInventoryItem | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
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

  // Use warehouse management from hook
  const {
    selectedWarehouse
  } = useWarehouseManager();
  const {
    toast
  } = useToast();

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

    // Group original inventory by ASIN
    inventory.forEach(item => {
      if (!asinCounts.has(item.asin)) {
        asinCounts.set(item.asin, []);
      }
      asinCounts.get(item.asin)!.push(item);
    });

    // Filter to only duplicates (more than 1 item per ASIN)
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

    // Apply search filter
    if (searchTerm) {
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
      console.log('Search Terms:', searchTerms);
      console.log('Search Method:', searchMethod);
      console.log('Total Inventory Items:', inventory.length);
      filtered = filtered.filter(item => {
        if (searchMethod === 'all') {
          const matches = searchTerms.every(term => {
            const asinMatch = item.asin.toLowerCase().includes(term);
            const serialMatch = item.serialNumber.toLowerCase().includes(term);
            const skuMatch = item.sku && item.sku.toLowerCase().includes(term);
            const titleMatch = item.title && item.title.toLowerCase().includes(term);
            const notesMatch = item.notes && item.notes.toLowerCase().includes(term);
            const termFound = asinMatch || serialMatch || skuMatch || titleMatch || notesMatch;

            // Debug logging for specific searches
            if (term === 'oppo' || term === 'reno' || term === 'reno6') {
              console.log(`Searching for "${term}" in item:`, {
                asin: item.asin,
                title: item.title?.substring(0, 50) + '...',
                asinMatch,
                titleMatch,
                termFound
              });
            }
            return termFound;
          });
          return matches;
        } else if (searchMethod === 'asin') {
          return searchTerms.every(term => item.asin.toLowerCase().includes(term));
        } else if (searchMethod === 'sku') {
          return item.sku && searchTerms.every(term => item.sku.toLowerCase().includes(term));
        } else if (searchMethod === 'serial') {
          return searchTerms.every(term => item.serialNumber.toLowerCase().includes(term));
        } else if (searchMethod === 'title') {
          return item.title && searchTerms.every(term => item.title.toLowerCase().includes(term));
        } else if (searchMethod === 'notes') {
          return item.notes && searchTerms.every(term => item.notes.toLowerCase().includes(term));
        }
        return false;
      });
      console.log('Filtered Results:', filtered.length);

      // Additional debugging for title searches
      if (searchTerm.toLowerCase().includes('oppo') || searchTerm.toLowerCase().includes('reno')) {
        const titlesWithSearchTerm = inventory.filter(item => item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase()));
        console.log(`Items with "${searchTerm}" in title:`, titlesWithSearchTerm.length);
        if (titlesWithSearchTerm.length > 0) {
          console.log('Sample titles:', titlesWithSearchTerm.slice(0, 3).map(item => item.title));
        }
      }
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        // Treat 'ordered' items as 'sold'
        const effectiveStatus = item.status === 'ordered' ? 'sold' : item.status;
        return effectiveStatus === statusFilter;
      });
    }

    // Merge duplicate ASINs FIRST - combine quantities and serial numbers
    const asinGroups = new Map();
    filtered.forEach(item => {
      const key = item.asin;
      if (asinGroups.has(key)) {
        const existing = asinGroups.get(key);
        existing.quantity += item.quantity;
        existing.serialNumber = existing.serialNumber + ', ' + item.serialNumber;
        // Store all individual items for quantity operations
        existing.individualItems = existing.individualItems || [existing];
        existing.individualItems.push(item);
        // Keep the most recent status (prioritize in-stock over sold)
        if (item.status === 'in-stock' && existing.status !== 'in-stock') {
          existing.status = item.status;
        }
        // Use the earliest date added
        if (new Date(item.dateAdded) < new Date(existing.dateAdded)) {
          existing.dateAdded = item.dateAdded;
        }
        // Combine notes if they exist
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

    // Convert back to array
    filtered = Array.from(asinGroups.values());

    // Apply quick filter on merged data
    if (quickFilter === 'low-stock') {
      filtered = filtered.filter(item => item.quantity > 0 && item.quantity <= 5);
    } else if (quickFilter === 'out-of-stock') {
      filtered = filtered.filter(item => item.quantity === 0);

      // Apply date filter for out-of-stock items
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

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      if (sortBy === 'dateAdded') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortBy === 'title') {
        aValue = (aValue || '').toLowerCase();
        bValue = (bValue || '').toLowerCase();
      } else if (sortBy === 'serialNumber') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (sortBy === 'asin') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    return filtered;
  }, [inventory, searchTerm, statusFilter, sortBy, sortOrder, quickFilter, dateFilterFrom, dateFilterTo]);
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

    // Check for duplicate ASIN in current inventory
    const duplicateAsin = inventory.find(item => item.asin.toLowerCase() === newItem.asin.toLowerCase().trim());
    if (duplicateAsin) {
      toast({
        title: "Duplicate ASIN",
        description: `ASIN "${newItem.asin}" already exists in inventory. Each ASIN must be unique.`,
        variant: "destructive"
      });
      return;
    }

    // Serial number duplicates are now allowed

    // Check for duplicate SKU in current inventory (if SKU is provided)
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

    // Validate for duplicates
    const validationErrors = [];
    const seenAsins = new Set();
    const seenSerials = new Set();
    const seenSkus = new Set();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check for duplicate ASIN against existing inventory
      const duplicateAsin = inventory.find(existing => existing.asin.toLowerCase() === item.asin.toLowerCase());
      if (duplicateAsin) {
        validationErrors.push(`Row ${i + 1}: ASIN "${item.asin}" already exists in inventory`);
        continue;
      }

      // Check for duplicate ASIN within bulk data
      if (seenAsins.has(item.asin.toLowerCase())) {
        validationErrors.push(`Row ${i + 1}: ASIN "${item.asin}" appears multiple times in bulk data`);
        continue;
      }
      seenAsins.add(item.asin.toLowerCase());

      // Serial number duplicates are now allowed

      // Check for duplicate SKU (if provided)
      if (item.sku && item.sku.trim()) {
        const duplicateSku = inventory.find(existing => existing.sku && existing.sku.toLowerCase() === item.sku.toLowerCase());
        if (duplicateSku) {
          validationErrors.push(`Row ${i + 1}: SKU "${item.sku}" already exists in inventory`);
          continue;
        }

        // Check for duplicate SKU within bulk data
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
    const csvData = [['SKU', 'UPC', 'ASIN', 'Title', 'Warehouse', 'Warehouse name', 'Available units', 'Status'], ...filteredInventory.map(item => [item.sku || '',
    // SKU
    '',
    // UPC (blank)
    item.asin,
    // ASIN
    item.title || '',
    // Title
    selectedWarehouse?.code || '',
    // Warehouse
    selectedWarehouse?.name || '',
    // Warehouse name
    item.quantity.toString(),
    // Available units
    'active' // Status (active for all)
    ])];
    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `asin-inventory-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Export Complete",
      description: "Inventory data exported to CSV file"
    });
  };
  const emailInventory = async () => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('send-inventory-email', {
        body: {
          inventory: filteredInventory,
          userEmail: user?.email
        }
      });
      if (error) throw error;
      toast({
        title: "Email Sent",
        description: "Inventory report sent to your email"
      });
    } catch (error) {
      toast({
        title: "Email Failed",
        description: "Could not send email report",
        variant: "destructive"
      });
    }
  };
  // Enhanced updateQuantity that handles merged ASINs
  const handleQuantityUpdate = async (mergedItem: any, newTotalQuantity: number, reason?: string) => {
    if (!mergedItem.individualItems || mergedItem.individualItems.length === 1) {
      // Single item, use normal update
      await updateQuantity(mergedItem.id, newTotalQuantity, reason);
    } else {
      // Multiple items merged, distribute the quantity change
      const currentTotalQuantity = mergedItem.quantity;
      const quantityChange = newTotalQuantity - currentTotalQuantity;

      // Sort individual items by quantity (descending) to handle reductions better
      const sortedItems = [...mergedItem.individualItems].sort((a, b) => b.quantity - a.quantity);
      let remainingChange = quantityChange;
      for (const item of sortedItems) {
        if (remainingChange === 0) break;
        if (remainingChange > 0) {
          // Adding stock - add to the first item
          if (item === sortedItems[0]) {
            await updateQuantity(item.id, item.quantity + remainingChange, reason);
            remainingChange = 0;
          }
        } else {
          // Reducing stock - reduce from items with stock
          const canReduce = Math.min(item.quantity, Math.abs(remainingChange));
          if (canReduce > 0) {
            await updateQuantity(item.id, item.quantity - canReduce, reason);
            remainingChange += canReduce;
          }
        }
      }
    }
  };
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Inventory data refreshed"
    });
  };
  const handleFetchTitlesFromSunsky = async () => {
    // Get items with SKU Numbers but missing titles
    const itemsNeedingTitles = inventory.filter(item => item.sku && item.sku.trim() && !item.title);
    if (itemsNeedingTitles.length === 0) {
      toast({
        title: "No Items to Update",
        description: "All items either have titles or are missing SKU numbers"
      });
      return;
    }

    // Start background task for title fetching
    await runTitleFetch(itemsNeedingTitles, async titleUpdates => {
      // The background task will handle the API calls
      // When updates are ready, save them to the database
      if (titleUpdates.length > 0) {
        await bulkUpdateTitles(titleUpdates);
      }
    });
  };

  // Merge duplicate ASINs function
  const mergeDuplicates = useCallback(async () => {
    console.log('mergeDuplicates function called');
    console.log('duplicateData:', duplicateData);
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
      for (const [asin, items] of duplicateData.duplicates.entries()) {
        if (items.length <= 1) continue;

        // Sort by date added to keep the earliest one
        const sortedItems = [...items].sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
        const primaryItem = sortedItems[0];
        const itemsToDelete = sortedItems.slice(1);

        // Calculate merged data
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const combinedSerialNumbers = items.map(item => item.serialNumber).join(', ');
        const combinedNotes = items.map(item => item.notes).filter(note => note && note.trim()).join('; ') || null;

        // Update the primary item with merged data
        const {
          error: updateError
        } = await supabase.from('asin_inventory').update({
          quantity: totalQuantity,
          serialNumber: combinedSerialNumbers,
          notes: combinedNotes,
          status: items.some(item => item.status === 'in-stock') ? 'in-stock' : primaryItem.status
        }).eq('id', primaryItem.id);
        if (updateError) {
          console.error('Error updating primary item:', updateError);
          continue;
        }

        // Delete the duplicate items
        const {
          error: deleteError
        } = await supabase.from('asin_inventory').delete().in('id', itemsToDelete.map(item => item.id));
        if (deleteError) {
          console.error('Error deleting duplicate items:', deleteError);
          continue;
        }
        mergedCount++;
        deletedCount += itemsToDelete.length;
      }

      // Refresh the inventory data
      refetch();
      toast({
        title: "Duplicates Merged Successfully",
        description: `Merged ${mergedCount} duplicate ASINs and removed ${deletedCount} duplicate entries`
      });

      // Close the dialog
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

  // Preview label function
  const handlePreviewItem = async (item: AsinInventoryItem) => {
    // Load template data if available
    const savedTemplate = localStorage.getItem('savedLabelTemplate');
    let templateData = null;
    if (savedTemplate) {
      try {
        const {
          data: template
        } = await supabase.from('label_templates').select('*').eq('id', savedTemplate).single();
        if (template) {
          templateData = template;
        }
      } catch (error) {
        console.log('Could not load template for preview');
      }
    }
    setPreviewItem(item);
    setPreviewTemplate(templateData);
    setIsPreviewDialogOpen(true);
  };

  // Print single item label using QZ Tray
  const handlePrintItem = async (item: AsinInventoryItem) => {
    try {
      const connected = qzConnectionManager.getConnectionStatus();
      if (!connected) {
        toast({
          title: "QZ Tray Not Connected",
          description: "Please connect QZ Tray first",
          variant: "destructive"
        });
        return;
      }

      const orderItem: OrderItem = {
        orderId: item.serialNumber,
        asin: item.asin,
        sku: item.sku || undefined,
        itemTitle: item.title || `Product ${item.asin}`,
        itemQuantity: item.quantity
      };

      const labelSettings: OrderLabelSettings = {
        labelSize: '4x3',
        dpi: 203,
        showOrderId: false,
        showAsin: true,
        showSku: true,
        showTitle: true,
        showQuantity: true,
        includeBarcode: true,
        barcodeContent: 'asin'
      };

      const zplCode = generateOrderLabelZPL(orderItem, labelSettings);
      const printer = localStorage.getItem('qz-default-printer');
      await qzConnectionManager.print(zplCode, printer || undefined);
      
      toast({
        title: "Label Printed",
        description: `Printed label for ${item.asin}`
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print Error", 
        description: "Failed to print label",
        variant: "destructive"
      });
    }
  };
    try {
      // Check if QZ Tray is connected
      const connected = qzConnectionManager.getConnectionStatus();
      if (!connected) {
        toast({
          title: "QZ Tray Not Connected",
          description: "Please connect QZ Tray from the status indicator in the header first",
          variant: "destructive"
        });
        return;
      }

      // Get user preferences for label settings
      const savedLabelSize = localStorage.getItem('preferredLabelSize') || '4x3';
      const savedDPI = parseInt(localStorage.getItem('preferredDPI') || '203');
      
      let labelSettings: OrderLabelSettings = {
        labelSize: savedLabelSize as '4x6' | '4x3' | '3x2' | '2x1',
        dpi: savedDPI as 203 | 300,
        showOrderId: false,
        showAsin: true,
        showSku: true,
        showTitle: true,
        showQuantity: true,
        includeBarcode: true,
        barcodeContent: 'asin'
      };

      // Check for saved template to get label size
      const savedTemplate = localStorage.getItem('savedLabelTemplate');
      if (savedTemplate) {
        try {
          const { data: template } = await supabase.from('label_templates').select('*').eq('id', savedTemplate).single();
          if (template) {
            const aspectRatio = template.width / template.height;
            if (aspectRatio >= 1.8) {
              labelSettings.labelSize = '4x6';
            } else if (aspectRatio >= 1.3) {
              labelSettings.labelSize = '4x3';
            } else if (aspectRatio >= 1.1) {
              labelSettings.labelSize = '3x2';
            } else {
              labelSettings.labelSize = '2x1';
            }
          }
        } catch (error) {
          console.log('Could not load template settings');
        }
      }

      // Create order item for printing
      const orderItem: OrderItem = {
        orderId: item.serialNumber,
        asin: item.asin,
        sku: item.sku || undefined,
        itemTitle: item.title || `Product ${item.asin}`,
        itemQuantity: item.quantity
      };

      // Generate ZPL code
      const zplCode = generateOrderLabelZPL(orderItem, labelSettings);
      console.log('📄 Generated ZPL Code:', zplCode);

      // Print the label
      const savedDefaultPrinter = localStorage.getItem('qz-default-printer');
      await qzConnectionManager.print(zplCode, savedDefaultPrinter || undefined);

      toast({
        title: "Label Printed",
        description: `Printed label for ${item.asin}`
      });
    } catch (error) {
      console.error('Error printing label:', error);
      toast({
        title: "Print Error",
        description: error instanceof Error ? error.message : "Failed to print label",
        variant: "destructive"
      });
    }
  };
    try {
      // Check if QZ Tray is connected, if not show appropriate message
      const connected = qzConnectionManager.getConnectionStatus();
      if (!connected) {
        toast({
          title: "QZ Tray Not Connected",
          description: "Please connect QZ Tray from the status indicator in the header first",
          variant: "destructive"
        });
        return;
      }

      // Check for saved template settings and user preferences
      const savedTemplate = localStorage.getItem('savedLabelTemplate');
      const savedLabelSize = localStorage.getItem('preferredLabelSize') || '4x3';
      const savedDPI = parseInt(localStorage.getItem('preferredDPI') || '203');
      
      let labelSettings: OrderLabelSettings = {
        labelSize: savedLabelSize as '4x6' | '4x3' | '3x2' | '2x1',
        dpi: savedDPI as 203 | 300,
        showOrderId: false,
        showAsin: true,
        showSku: true,
        showTitle: true,
        showQuantity: true,
        includeBarcode: true,
        barcodeContent: 'asin'
      };

      // Just get label size from template if available, but use simple printing
      if (savedTemplate) {
        try {
          const { data: template } = await supabase.from('label_templates').select('*').eq('id', savedTemplate).single();
          if (template) {
            // Auto-determine label size based on template dimensions for better fit
            const aspectRatio = template.width / template.height;
            console.log('Template aspect ratio:', aspectRatio, 'Template size:', template.width, 'x', template.height);
            
            if (aspectRatio >= 1.8) {
              labelSettings.labelSize = '4x6'; // Wide format
            } else if (aspectRatio >= 1.3) {
              labelSettings.labelSize = '4x3'; // Standard format
            } else if (aspectRatio >= 1.1) {
              labelSettings.labelSize = '3x2'; // Medium format
            } else {
              labelSettings.labelSize = '2x1'; // Square/tall format
            }
            
            console.log('Auto-selected label size:', labelSettings.labelSize);
          }
        } catch (error) {
          console.log('Could not load template settings, using user preferences');
        }
      }

      // Simple order label generation (no complex template processing)
      const orderItem: OrderItem = {
        orderId: item.serialNumber,
        asin: item.asin,
        sku: item.sku || undefined,
        itemTitle: item.title || `Product ${item.asin}`,
        itemQuantity: item.quantity
      };

      console.log('🔍 Printing item data:', { orderItem, labelSettings });

      // Generate ZPL using the order label generator
      const zplCode = generateOrderLabelZPL(orderItem, labelSettings);
      console.log('📄 Generated ZPL Code:', zplCode);

      // Get saved default printer for printing
      const savedDefaultPrinter = localStorage.getItem('qz-default-printer');

      // Print using QZ Tray
      await qzConnectionManager.print(zplCode, savedDefaultPrinter || undefined);

      toast({
        title: "Label Printed",
        description: `Printed label for ${item.asin}`
      });
    } catch (error) {
      console.error('Error printing label:', error);
      toast({
        title: "Print Error",
        description: error instanceof Error ? error.message : "Failed to print label",
        variant: "destructive"
      });
  // Test label printing function
  const handleTestPrint = async () => {
    try {
      // Create test order item with known good data
      const testOrderItem: OrderItem = {
        orderId: "TEST-001",
        asin: "B08N5WRWNW", 
        sku: "TEST-SKU-123",
        itemTitle: "Test Product for Label Printing",
        itemQuantity: 1
      };
      const testLabelSettings: OrderLabelSettings = {
        labelSize: '4x3',
        dpi: 203,
        showOrderId: true,
        showAsin: true,
        showSku: true,
        showTitle: true,
        showQuantity: true,
        includeBarcode: true,
        barcodeContent: 'asin'
      };
      const zplCode = generateOrderLabelZPL(testOrderItem, testLabelSettings);
      const savedDefaultPrinter = localStorage.getItem('qz-default-printer');
      await qzConnectionManager.print(zplCode, savedDefaultPrinter || undefined);
      toast({
        title: "Test Label Printed", 
        description: "Printed test label with sample data"
      });
    } catch (error) {
      console.error('Error printing test label:', error);
      toast({
        title: "Print Error",
        description: error instanceof Error ? error.message : "Failed to print test label",
        variant: "destructive"
      });
    }
  };
  // Export inventory data to CSV
  const exportInventory = useCallback(() => {
    try {
      const headers = ['ASIN', 'SKU', 'Title', 'Serial Number', 'Quantity', 'Status', 'Bin Location', 'Date Added', 'Date Sold'];
      const csvData = [
        headers,
        ...filteredInventory.map(item => [
          item.asin,
          item.sku || '',
          item.title || '',
          item.serialNumber,
          item.quantity.toString(),
          item.status,
          item.notes || '',
          item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : '',
          item.dateSold ? new Date(item.dateSold).toLocaleDateString() : ''
        ])
      ];

      const csvContent = csvData.map(row => 
        row.map(field => `"${field}"`).join(',')
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: `Exported ${filteredInventory.length} inventory items to CSV`
      });
    } catch (error) {
      console.error('Error exporting inventory:', error);
      toast({
        title: "Export Failed",
        description: "Could not export inventory data",
        variant: "destructive"
      });
    }
  }, [filteredInventory]);

  // Test print function with known good data
  const handleTestPrint = async () => {
    try {
      const connected = qzConnectionManager.getConnectionStatus();
      if (!connected) {
        toast({
          title: "QZ Tray Not Connected",
          description: "Please connect QZ Tray from the status indicator in the header first",
          variant: "destructive"
        });
        return;
      }

      // Create test order item with known good data
      const testOrderItem: OrderItem = {
        orderId: "TEST-001",
        asin: "B08N5WRWNW",
        sku: "TEST-SKU-123",
        itemTitle: "Test Product for Label Printing",
        itemQuantity: 1
      };
      const testLabelSettings: OrderLabelSettings = {
        labelSize: '4x3',
        dpi: 203,
        showOrderId: true,
        showAsin: true,
        showSku: true,
        showTitle: true,
        showQuantity: true,
        includeBarcode: true,
        barcodeContent: 'asin'
      };
      console.log('🧪 Test print data:', {
        testOrderItem,
        testLabelSettings
      });
      const zplCode = generateOrderLabelZPL(testOrderItem, testLabelSettings);
      console.log('🧪 Test ZPL Code:', zplCode);
      const savedDefaultPrinter = localStorage.getItem('qz-default-printer');
      await qzConnectionManager.print(zplCode, savedDefaultPrinter || undefined);
      toast({
        title: "Test Label Printed",
        description: "Printed test label with sample data"
      });
    } catch (error) {
      console.error('Error printing test label:', error);
      toast({
        title: "Test Print Failed",
        description: "Could not print test label. Please check QZ Tray connection.",
        variant: "destructive"
      });
    }
  };

  // Export duplicate ASINs data
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
  return <div className="space-y-4 max-w-[95vw] mx-auto p-6">
      {/* Header with Stats */}
      <div className="space-y-6">
        <InventoryMetrics showOnlyAsin={true} />
        
        {/* Duplicate ASIN Metrics Card */}
        {duplicateData.totalDuplicateASINs > 0 && (
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Duplicate ASINs Detected</span>
              </div>
              <p className="text-sm text-orange-600 mt-1">
                Found {duplicateData.totalDuplicateASINs} ASINs with duplicates ({duplicateData.totalDuplicateItems} total items)
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Prominent Search Bar */}
      <Card className="border-2 border-input border-l-4 border-l-primary shadow-xl bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-md">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Modern Search Bar */}
            <div className="relative">
              <div className="flex items-stretch gap-0 bg-background rounded-xl border-2 border-green-500 shadow-lg overflow-hidden hover:shadow-xl hover:border-green-600 transition-all duration-300">
                <Select value={searchMethod} onValueChange={(value: 'all' | 'asin' | 'sku' | 'serial' | 'title' | 'notes') => setSearchMethod(value)}>
                  <SelectTrigger className="w-52 h-14 border-0 border-r border-border bg-muted/30 hover:bg-muted/50 transition-colors rounded-none focus:ring-0 focus:ring-offset-0">
                    <div className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                      <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                   <SelectContent className="bg-background border shadow-xl min-w-[208px]">
                     <SelectItem value="all">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <Search className="w-4 h-4 flex-shrink-0" />
                         <span>All Fields</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="asin">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <Package className="w-4 h-4 flex-shrink-0" />
                         <span>ASIN</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="sku">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <Hash className="w-4 h-4 flex-shrink-0" />
                         <span>SKU</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="serial">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <Hash className="w-4 h-4 flex-shrink-0" />
                         <span>Serial Number</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="title">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <FileText className="w-4 h-4 flex-shrink-0" />
                         <span>Title</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="notes">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <Edit3 className="w-4 h-4 flex-shrink-0" />
                         <span>Notes</span>
                       </div>
                     </SelectItem>
                   </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 z-10" />
                  <Input placeholder={searchMethod === 'all' ? "Search across all fields..." : searchMethod === 'asin' ? "Search by ASIN..." : searchMethod === 'sku' ? "Search by SKU..." : searchMethod === 'serial' ? "Search by Serial Number..." : searchMethod === 'title' ? "Search by Title..." : "Search by Notes..."} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 pr-4 h-14 text-base border-0 bg-transparent focus:ring-0 focus:ring-offset-0 rounded-none placeholder:text-muted-foreground/60" />
                </div>
                {searchTerm && <button onClick={() => setSearchTerm('')} className="px-3 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>}
              </div>
            </div>

            {/* Action Buttons Row - Organized by Usage */}
            <div className="space-y-6">
              {/* Primary Actions Section */}
              <div className="space-y-4">
                 <div className="flex flex-wrap gap-3">
                   {/* Test Print Button for Debugging */}
                   

                   {/* Add New Item */}
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="border-2 border-primary bg-background hover:bg-green-500 hover:text-white hover:border-green-500 transition-all">
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Plus className="w-5 h-5" />
                          Add New ASIN Item
                        </DialogTitle>
                      </DialogHeader>
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
                        })} placeholder="Add any notes..." rows={2} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddItem}>Add Item</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Bulk Add Items */}
                  <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="border-2 border-primary bg-background hover:bg-green-500 hover:text-white hover:border-green-500 transition-all">
                        <Upload className="w-4 h-4 mr-2" />
                        Bulk Add Items
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Bulk Add ASIN Items</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                         <div>
                           <Label htmlFor="bulkText">
                             Paste tab-separated data (ASIN, Serial Number, SKU, Status, Quantity, Notes)
                           </Label>
                           <Textarea id="bulkText" value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="B123456789	SN001	SKU123	in-stock	5	Optional notes&#10;B987654321	SN002	SKU456	sold	1	Another item" rows={8} className="font-mono text-sm" />
                         </div>
                         <div className="text-sm text-muted-foreground">
                           <p><strong>Format:</strong> Each line should contain tab-separated values</p>
                           <p><strong>Order:</strong> ASIN → Serial Number → SKU → Status → Quantity → Notes</p>
                           <p><strong>Status options:</strong> in-stock, sold, reserved, damaged</p>
                         </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleBulkAdd}>Add Items</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Bulk SKU Update */}
                  <BulkSkuUpload inventory={inventory} onSkuUpdate={bulkUpdateSkus} />

                  {/* Bulk Title Update */}
                  <BulkTitleUpload inventory={inventory} onTitleUpdate={bulkUpdateTitles} />
                </div>
              </div>

              {/* Settings Section */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Settings:
                </Label>
                <div className="flex flex-wrap gap-3">
                  {/* Fetch Titles from Source */}
                  <Button size="sm" variant="outline" className="border-2 border-primary bg-background hover:bg-green-500 hover:text-white hover:border-green-500 transition-all" onClick={handleFetchTitlesFromSunsky}>
                    <Database className="w-4 h-4 mr-2" />
                    Fetch Titles from Source
                  </Button>

                  {/* Warehouse Settings */}
                  <SimpleWarehouseManager />

                  {/* Label Templates */}
                  <LabelTemplateManager selectedItems={selectedItems} allItems={inventory} onPrint={(templateId, items) => {
                  console.log('Printing with template:', templateId, 'Items:', items);
                  // Implement actual printing logic here
                }} />

                  {/* Export */}
                  <Button size="sm" variant="outline" className="border-2 border-primary bg-background hover:bg-green-500 hover:text-white hover:border-green-500 transition-all" onClick={exportInventory}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>

                  {/* Email Export */}
                  <Button size="sm" variant="outline" className="border-2 border-primary bg-background hover:bg-green-500 hover:text-white hover:border-green-500 transition-all" onClick={emailInventory}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email Export
                  </Button>

                  {/* Refresh */}
                  <Button size="sm" variant="outline" className="border-2 border-primary bg-background hover:bg-green-500 hover:text-white hover:border-green-500 transition-all" onClick={handleRefresh}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Filters Row */}
            

            {/* Date Filter Section - Only show when out-of-stock filter is active */}
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

              {/* Items per page */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Show:</Label>
                <Select value={itemsPerPage.toString()} onValueChange={value => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-20 bg-background border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="150">150</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results Info */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Results:</Label>
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                  {Math.min(startIndex + 1, filteredInventory.length)}-{Math.min(startIndex + itemsPerPage, filteredInventory.length)} of {filteredInventory.length}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Display */}
      {filteredInventory.length === 0 ? <Card className="border-dashed border-2 border-muted">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No inventory items found</h3>
            <p className="text-muted-foreground text-center mb-6">
              {searchTerm || statusFilter !== 'all' || quickFilter !== 'all' ? "Try adjusting your filters or search terms" : "Get started by adding your first inventory item"}
            </p>
            {!searchTerm && statusFilter === 'all' && quickFilter === 'all' && <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Item
              </Button>}
          </CardContent>
        </Card> : viewMode === 'table' ? <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full border-collapse">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                     <th className="w-12 p-3 text-left border-r">
                       <Checkbox checked={selectedItems.size === paginatedInventory.length && paginatedInventory.length > 0} onCheckedChange={checked => {
                    if (checked) {
                      setSelectedItems(new Set(paginatedInventory.map(item => item.id)));
                    } else {
                      setSelectedItems(new Set());
                    }
                  }} />
                     </th>
                      <th className="min-w-60 p-3 text-left font-medium border-r">
                        <button className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => {
                    if (sortBy === 'title') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('title');
                      setSortOrder('asc');
                    }
                  }}>
                          Product Info
                          {sortBy === 'title' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                        </button>
                      </th>
                      <th className="w-28 p-3 text-left font-medium border-r">
                        <button className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => {
                    if (sortBy === 'serialNumber') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('serialNumber');
                      setSortOrder('asc');
                    }
                  }}>
                          Serial Number
                          {sortBy === 'serialNumber' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                        </button>
                      </th>
                      <th className="w-20 p-3 text-left font-medium border-r">
                        <button className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => {
                    if (sortBy === 'status') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('status');
                      setSortOrder('asc');
                    }
                  }}>
                          Status
                          {sortBy === 'status' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                        </button>
                      </th>
                     <th className="w-16 p-3 text-left font-medium border-r">
                       <button className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => {
                    if (sortBy === 'quantity') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('quantity');
                      setSortOrder('desc');
                    }
                  }}>
                         Qty
                         {sortBy === 'quantity' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                       </button>
                     </th>
                     <th className="w-24 p-3 text-left font-medium border-r">
                       <button className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => {
                    if (sortBy === 'dateAdded') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('dateAdded');
                      setSortOrder('desc');
                    }
                  }}>
                         Date Added
                         {sortBy === 'dateAdded' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                       </button>
                     </th>
                     <th className="w-32 p-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInventory.map(item => <tr key={item.id} className="border-b hover:bg-muted/25 transition-colors">
                       <td className="p-3 border-r">
                         <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={checked => {
                    const newSelected = new Set(selectedItems);
                    if (checked) {
                      newSelected.add(item.id);
                    } else {
                      newSelected.delete(item.id);
                    }
                    setSelectedItems(newSelected);
                  }} />
                       </td>
                        <td className="p-3 border-r">
                          <div className="space-y-1">
                            <div className="font-medium text-sm max-w-xs break-words">
                              {item.title || 'No title'}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              ASIN: {item.asin}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">SKU:</span>
                              <SkuEditor currentSku={item.sku} onUpdate={newSku => updateSku(item.id, newSku)} />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-sm border-r">{item.serialNumber}</td>
                        <td className="p-3 border-r">
                         <Badge variant={item.status === 'in-stock' ? 'default' : item.status === 'sold' || item.status === 'ordered' ? 'secondary' : item.status === 'reserved' ? 'outline' : 'destructive'} className="text-xs">
                           {item.status === 'in-stock' ? 'In Stock' : item.status === 'sold' || item.status === 'ordered' ? 'Sold' : item.status === 'reserved' ? 'Reserved' : 'Damaged'}
                         </Badge>
                       </td>
                      <td className="p-3 border-r">
                        <div className="flex items-center gap-1">
                          <span className={`font-semibold text-sm ${item.quantity === 0 ? 'text-red-500' : item.quantity <= 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {item.quantity}
                          </span>
                          {item.quantity <= 5 && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground border-r">
                        {new Date(item.dateAdded).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                      </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <DualQuantityEditor currentQuantity={item.quantity} onUpdate={(newQuantity, reason) => handleQuantityUpdate(item, newQuantity, reason)} />
                            <StockHistoryDialog inventoryId={item.id} itemIdentifier={`${item.asin} (${item.serialNumber})`} inventoryType="asin" />
                            <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => handlePreviewItem(item)} title="Preview Label">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => handlePrintItem(item)} title="Print Label">
                              <Printer className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedInventory.map(item => <Card key={item.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={checked => {
                  const newSelected = new Set(selectedItems);
                  if (checked) {
                    newSelected.add(item.id);
                  } else {
                    newSelected.delete(item.id);
                  }
                  setSelectedItems(newSelected);
                }} />
                       <Badge variant={item.status === 'in-stock' ? 'default' : item.status === 'sold' || item.status === 'ordered' ? 'secondary' : item.status === 'reserved' ? 'outline' : 'destructive'}>
                         {item.status === 'ordered' ? 'SOLD' : item.status.replace('-', ' ').toUpperCase()}
                       </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">ASIN</Label>
                      <p className="font-mono text-sm">{item.asin}</p>
                    </div>
                     <div>
                       <Label className="text-xs text-muted-foreground">Serial Number</Label>
                       <p className="font-mono text-sm">{item.serialNumber}</p>
                     </div>
                     <div>
                       <Label className="text-xs text-muted-foreground">SKU</Label>
                       <SkuEditor currentSku={item.sku} onUpdate={newSku => updateSku(item.id, newSku)} />
                     </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${item.quantity === 0 ? 'text-red-500' : item.quantity <= 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {item.quantity}
                        </span>
                        {item.quantity <= 5 && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Date Added</Label>
                      <p className="text-sm">{new Date(item.dateAdded).toLocaleDateString()}</p>
                    </div>
                  </div>
                   <div className="flex items-center gap-2">
                     <DualQuantityEditor currentQuantity={item.quantity} onUpdate={(newQuantity, reason) => handleQuantityUpdate(item, newQuantity, reason)} />
                     <StockHistoryDialog inventoryId={item.id} itemIdentifier={`${item.asin} (${item.serialNumber})`} inventoryType="asin" />
                     <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => handlePreviewItem(item)} title="Preview Label">
                       <Eye className="w-4 h-4" />
                     </Button>
                     <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => handlePrintItem(item)} title="Print Label">
                       <Printer className="w-4 h-4" />
                     </Button>
                   </div>
                </div>
              </CardContent>
            </Card>)}
        </div>}
        
        {/* Pagination */}
        {filteredInventory.length > itemsPerPage && <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredInventory.length)} of {filteredInventory.length} items
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
                
                {Array.from({
            length: Math.min(5, totalPages)
          }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5) {
              if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
            }
            return <PaginationItem key={pageNum}>
                      <PaginationLink onClick={() => setCurrentPage(pageNum)} isActive={currentPage === pageNum} className="cursor-pointer">
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>;
          })}
                
                {totalPages > 5 && currentPage < totalPages - 2 && <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>}
                
                <PaginationItem>
                  <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            
            <Select value={itemsPerPage.toString()} onValueChange={value => {
        setItemsPerPage(Number(value));
        setCurrentPage(1);
      }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>}
        
        {/* Duplicate ASIN Details Dialog */}
        <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Duplicate ASINs Details ({duplicateData.totalDuplicateASINs} ASINs)
              </DialogTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline" className="text-orange-600">
                  {duplicateData.totalDuplicateItems} Total Items
                </Badge>
                <Button variant="outline" size="sm" onClick={exportDuplicates} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
                <Button variant="default" size="sm" onClick={mergeDuplicates} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700">
                  <RefreshCw className="w-4 h-4" />
                  Merge Duplicates
                </Button>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              {Array.from(duplicateData.duplicates.entries()).map(([asin, items]) => <Card key={asin} className="border-l-4 border-l-orange-400">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-100 text-orange-800 font-mono">
                          {asin}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {items.length} duplicates
                        </span>
                      </div>
                      <div className="text-sm font-medium">
                        Total Qty: {items.reduce((sum, item) => sum + item.quantity, 0)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {items.map((item, index) => <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="font-mono">
                              #{index + 1}
                            </Badge>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Serial:</span>
                                <code className="bg-background px-2 py-1 rounded text-sm">
                                  {item.serialNumber}
                                </code>
                              </div>
                              {item.sku && <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">SKU:</span>
                                  <code className="bg-background px-2 py-1 rounded text-xs">
                                    {item.sku}
                                  </code>
                                </div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant={item.status === 'in-stock' ? 'default' : 'secondary'}>
                              {item.status}
                            </Badge>
                            <div className="text-right">
                              <div className="font-medium">Qty: {item.quantity}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(item.dateAdded).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>)}
                    </div>
                  </CardContent>
                </Card>)}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Label Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Label Preview - {previewItem?.asin}
              </DialogTitle>
            </DialogHeader>
            {previewItem && <div className="space-y-6">
                {/* Label Dimensions Info */}
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Label Specifications</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Size: {previewTemplate ? `${Math.round(previewTemplate.width / 72 * 10) / 10}" × ${Math.round(previewTemplate.height / 72 * 10) / 10}"` : '4" × 3"'} (203 DPI)</div>
                    <div>Format: ZPL (Zebra Printer Language)</div>
                    <div>Template: {previewTemplate ? previewTemplate.name : 'Default Layout'}</div>
                    <div>Elements: {previewTemplate?.elements?.length || 'Standard Fields'}</div>
                  </div>
                </div>

                {/* Visual Label Preview */}
                <div className="border-2 border-dashed border-gray-300 bg-gray-50 p-8 rounded-lg">
                  <div className="bg-white border-2 border-gray-400 mx-auto relative shadow-lg" style={{
              width: previewTemplate ? `${Math.max(previewTemplate.width * 0.5, 250)}px` : '350px',
              height: previewTemplate ? `${Math.max(previewTemplate.height * 0.5, 150)}px` : '262px',
              minWidth: '250px',
              minHeight: '150px'
            }}>
                    
                    {previewTemplate && previewTemplate.elements?.length > 0 ?
              // Template-based preview - only show mapped elements
              previewTemplate.elements.filter((element: any) => element.dataSource && element.dataSource !== 'static').map((element: any, index: number) => {
                let content = '';

                // Map element data sources to actual item data
                switch (element.dataSource) {
                  case 'asin':
                    content = `ASIN: ${previewItem.asin}`;
                    break;
                  case 'sku':
                    content = `SKU: ${previewItem.sku || 'N/A'}`;
                    break;
                  case 'title':
                    content = previewItem.title || `Product ${previewItem.asin}`;
                    break;
                  case 'quantity':
                    content = `Qty: ${previewItem.quantity}`;
                    break;
                  case 'serial':
                    content = `Serial: ${previewItem.serialNumber}`;
                    break;
                  case 'barcode':
                    content = previewItem.asin;
                    break;
                  default:
                    return null;
                }
                if (!content) return null;
                const scaleFactor = 0.5;
                const elementX = (element.x || 0) * scaleFactor;
                const elementY = (element.y || 0) * scaleFactor;
                const elementWidth = Math.max((element.width || 100) * scaleFactor, 50);
                const elementHeight = Math.max((element.height || 20) * scaleFactor, 16);
                const fontSize = Math.max((element.fontSize || 12) * scaleFactor, 8);
                return <div key={index} style={{
                  position: 'absolute',
                  left: `${elementX}px`,
                  top: `${elementY}px`,
                  width: `${elementWidth}px`,
                  height: `${elementHeight}px`,
                  fontSize: `${fontSize}px`,
                  fontWeight: element.fontWeight || 'normal',
                  color: element.fill || '#000000',
                  textAlign: (element.textAlign || 'left') as any,
                  overflow: 'hidden',
                  fontFamily: element.fontFamily || 'Arial',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                  backgroundColor: element.type === 'barcode' ? '#000000' : 'transparent'
                }}>
                              {element.type === 'barcode' || element.dataSource === 'barcode' ? <div className="w-full">
                                  <div className="bg-black text-white text-center text-xs font-mono leading-tight p-1">
                                    ||||| {content} |||||
                                  </div>
                                </div> : <span className="truncate text-xs">{content}</span>}
                            </div>;
              }) :
              // Default preview when no template is selected
              <div className="p-4 space-y-2 h-full">
                        <div className="text-sm font-bold text-blue-600">
                          ASIN: {previewItem.asin}
                        </div>
                        <div className="text-sm">
                          SKU: {previewItem.sku || 'Not Set'}
                        </div>
                        <div className="text-xs text-gray-700 leading-tight">
                          {previewItem.title?.substring(0, 30) || `Product ${previewItem.asin}`}
                        </div>
                        <div className="text-sm font-semibold">
                          Qty: {previewItem.quantity}
                        </div>
                        <div className="text-xs text-gray-500">
                          Serial: {previewItem.serialNumber}
                        </div>
                        <div className="bg-black text-white text-center py-1 text-xs font-mono mt-2">
                          ||||| {previewItem.asin} |||||
                        </div>
                      </div>}
                  </div>
                  
                  {/* Scale indicator */}
                  <div className="text-center mt-4 text-xs text-gray-500">
                    Preview shown at 50% scale {previewTemplate ? `(${previewTemplate.name})` : '(Default)'}
                  </div>
                </div>

                 {/* Preview Actions */}
                 <div className="flex justify-between items-center">
                   <div className="text-sm text-muted-foreground">
                     {previewTemplate ? `Using "${previewTemplate.name}" template with ${previewTemplate.elements?.length || 0} elements` : 'Using default template layout with standard fields'}
                   </div>
                   <div className="flex gap-2">
                     <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                       Close
                     </Button>
                     <Button onClick={() => {
                       setIsPreviewDialogOpen(false);
                       handlePrintItem(previewItem);
                     }}>
                       <Printer className="w-4 h-4 mr-2" />
                       Print This Label
                     </Button>
                   </div>
                 </div>
               </div>}
           </DialogContent>
         </Dialog>
       </div>
     );
}