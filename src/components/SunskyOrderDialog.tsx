import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, Truck, ExternalLink, Save, BookOpen, Trash2, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SunskyDataViewer } from '@/components/SunskyDataViewer';

interface SunskyOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: any[];
  onOrderSuccess: (orderNumber: string, selectedOrderIds: string[]) => void;
  onItemsUnavailable?: (unavailableItems: any[]) => void;
}

interface Country {
  id: string;
  name: string;
  code: string;
  shipToState: boolean;
  stateList?: Array<{
    code: string;
    name: string;
  }>;
}

interface ShippingMethod {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  website?: string;
  transitTime: string;
  shippingCost: number;
}

interface OrderItem {
  itemNo: string;
  qty: number;
  title: string;
  price?: number;
  amount?: number;
  remark?: string;
}

interface SavedAddress {
  id: string;
  name: string;
  country_id: string;
  state: string;
  city: string;
  company: string;
  address: string;
  address2: string;
  postcode: string;
  receiver: string;
  telephone: string;
  email: string;
  is_default: boolean;
}

interface SunskyCredential {
  id: string;
  name?: string;
  key_last4: string;
  is_active: boolean;
  created_at: string;
}

export function SunskyOrderDialog({ open, onOpenChange, selectedOrders, onOrderSuccess, onItemsUnavailable }: SunskyOrderDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'items' | 'address' | 'shipping' | 'review'>('items');
  
  // States
  const [countries, setCountries] = useState<Country[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [catalogSearching, setCatalogSearching] = useState(false);
  const [processingItems, setProcessingItems] = useState(false);
  const [itemsProgress, setItemsProgress] = useState({ current: 0, total: 0 });
  const [currentItemName, setCurrentItemName] = useState('');
  
  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);
  const [saveAddressName, setSaveAddressName] = useState('');
  const [showSaveAddress, setShowSaveAddress] = useState(false);
  
  // Sunsky credentials state
  const [sunskyCredentials, setSunskyCredentials] = useState<SunskyCredential[]>([]);
  
  // Data viewer state
  const [showDataViewer, setShowDataViewer] = useState(false);
  const [invalidItemsData, setInvalidItemsData] = useState<any[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  
  // Order items state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  
  // Delivery address state
  const [deliveryAddress, setDeliveryAddress] = useState({
    countryId: '',
    state: '',
    city: '',
    company: '',
    address: '',
    address2: '',
    postcode: '',
    receiver: '',
    telephone: '',
    email: '',
    shippingWayId: '',
    shipment: 'wholesale' // wholesale or drop
  });

  // Order options
  const [orderOptions, setOrderOptions] = useState({
    siteNumber: '',
    useBalanceOnly: false,
    vatNumber: '',
    eoriNumber: '',
    iossNumber: '',
    coupon: ''
  });

  // Store validated items to avoid re-validation
  const [validatedItems, setValidatedItems] = useState<Set<string>>(new Set());

  // Load countries on mount
  useEffect(() => {
    if (open && selectedOrders.length > 0) {
      loadCountries();
      loadSavedAddresses();
      loadSunskyCredentials();
      initializeOrderItems();
      // Auto-populate site number with PO number
      const poNumber = selectedOrders[0]?.po_number || '';
      setOrderOptions(prev => ({ ...prev, siteNumber: poNumber }));
    }
  }, [open, selectedOrders]);

  // Load saved addresses
  const loadSavedAddresses = async () => {
    try {
      setLoadingSavedAddresses(true);
      const { data, error } = await supabase
        .from('saved_delivery_addresses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedAddresses(data || []);
    } catch (error) {
      console.error('Failed to load saved addresses:', error);
      toast({
        title: "Failed to Load Saved Addresses",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingSavedAddresses(false);
    }
  };

  // Load Sunsky credentials
  const loadSunskyCredentials = async () => {
    try {
      setLoadingCredentials(true);
      const { data, error } = await supabase
        .rpc('get_user_sunsky_credentials_secure');

      if (error) throw error;
      
      const credentials = data || [];
      setSunskyCredentials(credentials);
      
      // Auto-select the first credential if available
      if (credentials.length > 0) {
        setSelectedCredentialId(credentials[0].id);
      }
    } catch (error) {
      console.error('Failed to load Sunsky credentials:', error);
      toast({
        title: "Failed to Load Sunsky Credentials",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingCredentials(false);
    }
  };

  // Save current address
  const handleSaveAddress = async () => {
    if (!saveAddressName.trim()) {
      toast({
        title: "Address Name Required",
        description: "Please enter a name for this address",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('saved_delivery_addresses')
        .insert({
          user_id: user.id,
          name: saveAddressName.trim(),
          country_id: deliveryAddress.countryId,
          state: deliveryAddress.state,
          city: deliveryAddress.city,
          company: deliveryAddress.company,
          address: deliveryAddress.address,
          address2: deliveryAddress.address2,
          postcode: deliveryAddress.postcode,
          receiver: deliveryAddress.receiver,
          telephone: deliveryAddress.telephone,
          email: deliveryAddress.email,
          is_default: savedAddresses.length === 0 // First address becomes default
        });

      if (error) throw error;

      toast({
        title: "Address Saved",
        description: `Address "${saveAddressName}" has been saved for future use`,
      });

      setSaveAddressName('');
      setShowSaveAddress(false);
      loadSavedAddresses(); // Refresh the list
    } catch (error) {
      toast({
        title: "Failed to Save Address",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Load address from saved addresses
  const handleLoadAddress = (address: SavedAddress) => {
    setDeliveryAddress({
      countryId: address.country_id,
      state: address.state,
      city: address.city,
      company: address.company,
      address: address.address,
      address2: address.address2,
      postcode: address.postcode,
      receiver: address.receiver,
      telephone: address.telephone,
      email: address.email,
      shippingWayId: '',
      shipment: 'wholesale'
    });

    toast({
      title: "Address Loaded",
      description: `Loaded address "${address.name}"`,
    });
  };

  // Delete saved address
  const handleDeleteAddress = async (addressId: string, addressName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete the address "${addressName}"?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('saved_delivery_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      toast({
        title: "Address Deleted",
        description: `Address "${addressName}" has been deleted`,
      });

      loadSavedAddresses(); // Refresh the list
    } catch (error) {
      toast({
        title: "Failed to Delete Address",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const initializeOrderItems = () => {
    // Filter out closed, delivered, or fulfilled items
    const activeOrders = selectedOrders.filter(order => {
      const status = order.status || order.order_status || order.item_status || '';
      const statusLower = status.toLowerCase();
      
      // Skip items that are already closed, delivered, fulfilled, or completed
      const excludedStatuses = ['delivered', 'closed', 'completed', 'fulfilled', 'shipped', 'cancelled'];
      const isExcluded = excludedStatuses.some(excludedStatus => statusLower.includes(excludedStatus));
      
      if (isExcluded) {
        console.log(`⏭️ Skipping ${order.sku_code || order.partner_sku || 'unknown'} - Status: ${status}`);
        return false;
      }
      
      return true;
    });
    
    if (activeOrders.length < selectedOrders.length) {
      const skippedCount = selectedOrders.length - activeOrders.length;
      toast({
        title: `Filtered Items`,
        description: `Skipped ${skippedCount} item(s) that are already closed, delivered, or fulfilled`,
        variant: "default"
      });
    }
    
    const items = activeOrders.map(order => ({
      // Handle both PO orders and Noon orders
      itemNo: order.partner_sku || order.sunsky_sku?.sku_code || order.sku_code,
      qty: order.quantity || 1,
      title: order.title || order.sunsky_sku?.title || order.partner_sku || order.sku_code,
      remark: `Order: ${order.order_nr || order.po_number || order.id}`
    }));
    
    // Filter out items without valid SKU codes
    const validItems = items.filter(item => item.itemNo && item.itemNo.trim() !== '');
    
    if (validItems.length === 0) {
      toast({
        title: "No Valid Items Selected",
        description: "All selected items are either completed/fulfilled or don't have valid SKU codes",
        variant: "destructive"
      });
      return;
    }
    
    console.log(`📋 Processing ${validItems.length} active items (skipped ${selectedOrders.length - activeOrders.length} completed items)`);
    
    setOrderItems(validItems);
    setCheckedItems(new Set(validItems.map(item => item.itemNo)));
  };

  const loadCountries = async () => {
    try {
      const response = await supabase.functions.invoke('sunsky-api', {
        body: { action: 'getCountries' }
      });

      if (response.error) throw response.error;
      
      const data = response.data;
      if (data.result === 'success' && data.data) {
        setCountries(data.data);
      } else {
        throw new Error(data.message || 'Failed to load countries');
      }
    } catch (error) {
      toast({
        title: "Failed to Load Countries",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const loadShippingMethods = async () => {
    if (!deliveryAddress.countryId || checkedItems.size === 0) {
      console.error('Cannot load shipping methods:', {
        hasCountryId: !!deliveryAddress.countryId,
        checkedItemsCount: checkedItems.size,
        deliveryAddress
      });
      toast({
        title: "Cannot Load Shipping Methods",
        description: checkedItems.size === 0 ? "Please select at least one item first" : "Please select a country first",
        variant: "destructive"
      });
      return;
    }
    
    setLoadingShipping(true);
    setLoadingProgress(0);
    setLoadingStatus('Preparing request...');
    
    try {
      // Step 1: Connecting to Sunsky catalog (10%)
      setLoadingProgress(10);
      setLoadingStatus('Connecting to Sunsky catalog...');
      
      // Step 2: Validating items (20%)
      setLoadingProgress(20);
      setLoadingStatus('Validating selected items...');
      console.log('All order items before filtering:', orderItems);
      console.log('Checked items:', Array.from(checkedItems));
      
      // Deduplicate items by itemNo and sum quantities
      const itemsMap = new Map<string, { itemNo: string, qty: number }>();
      
      orderItems
        .filter(item => checkedItems.has(item.itemNo) && item.qty > 0 && item.itemNo)
        .forEach(item => {
          const existing = itemsMap.get(item.itemNo);
          if (existing) {
            existing.qty += item.qty;
          } else {
            itemsMap.set(item.itemNo, { itemNo: item.itemNo, qty: item.qty });
          }
        });
      
      const items = Array.from(itemsMap.values());

      console.log('Filtered items for API:', items);
      
      if (items.length === 0) {
        toast({
          title: "No Valid Items Selected",
          description: "Please ensure items have valid SKU codes and quantities greater than 0",
          variant: "destructive"
        });
        return;
      }

      // Step 2: Preparing request data (40%)
      setLoadingProgress(40);

      console.log('Loading shipping methods with params:', {
        items,
        deliveryAddress: {
          countryId: deliveryAddress.countryId,
          state: deliveryAddress.state,
          city: deliveryAddress.city,
          postcode: deliveryAddress.postcode
        }
      });

      // Step 3: Making API call (60%)
      setLoadingProgress(60);
      setLoadingStatus('Requesting shipping methods from Sunsky...');

      const response = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action: 'getPricesAndFreights',
          items,
          deliveryAddress: {
            countryId: deliveryAddress.countryId,
            state: deliveryAddress.state,
            city: deliveryAddress.city,
            postcode: deliveryAddress.postcode
          }
        }
      });

      // Step 4: Processing response (80%)
      setLoadingProgress(80);
      setLoadingStatus('Processing shipping options...');

      console.log('Shipping methods response:', response);

      if (response.error) {
        console.error('Supabase function error:', response.error);
        throw response.error;
      }
      
      const data = response.data;
      console.log('Shipping methods data:', data);
      
      if (data.result === 'success' && data.data?.freightList) {
        const methods = data.data.freightList.map((method: any) => ({
          id: method.id,
          name: method.name,
          logo: method.logo,
          description: method.description,
          website: method.website,
          transitTime: method.transitTime || 'N/A',
          shippingCost: method.shippingCost || 0
        }));
        
        console.log('Processed shipping methods:', methods);
        setShippingMethods(methods);
        
        // Step 5: Finalizing (100%)
        setLoadingProgress(100);
        setLoadingStatus('Finalizing shipping options...');
        
        // Auto-select the first shipping method
        if (methods.length > 0 && !deliveryAddress.shippingWayId) {
          setDeliveryAddress(prev => ({ ...prev, shippingWayId: methods[0].id }));
        }

        toast({
          title: "Shipping Methods Loaded",
          description: `Found ${methods.length} shipping options`,
        });
      } else if (data.result === 'error') {
        console.error('Sunsky API error:', data);
        
        // Check if error is due to unavailable items
        const errorMessage = data.message || data.messages?.[0] || '';
        console.log('Sunsky API error response:', JSON.stringify(data, null, 2));
        
        const hasItemNotExistError = 
          (Array.isArray(data.messages) && data.messages.includes('ITEM_NOT_EXIST')) ||
          errorMessage.includes('ITEM_NOT_EXIST') ||
          errorMessage.includes('not available in Sunsky catalog') ||
          data.originalError === 'ITEM_NOT_EXIST' ||
          (Array.isArray(data.messages) && data.messages.some(msg => typeof msg === 'string' && msg.includes('ITEM_NOT_EXIST')));
                                   
        console.log('Has ITEM_NOT_EXIST error:', hasItemNotExistError);
        
        if (hasItemNotExistError) {
          console.log('Detected ITEM_NOT_EXIST error, filtering unavailable items...');
          // Filter out unavailable items and retry with available ones only
          await filterAndRetryShippingMethods(items);
          return;
        }
        
        toast({
          title: "Failed to Load Shipping Methods",
          description: errorMessage || 'Unable to get shipping options for this location',
          variant: "destructive"
        });
      } else {
        console.error('Unexpected response format:', data);
        throw new Error(data.message || data.messages?.[0] || 'Failed to load shipping methods');
      }
    } catch (error) {
      console.error('Error in loadShippingMethods:', error);
      toast({
        title: "Failed to Load Shipping Methods",
        description: error.message || 'An unexpected error occurred while loading shipping options',
        variant: "destructive"
      });
    } finally {
      setLoadingShipping(false);
      setLoadingProgress(0);
      setLoadingStatus('');
    }
  };

  // Helper function to filter out unavailable items and retry
  const filterAndRetryShippingMethods = async (originalItems: any[]) => {
    console.log('Filtering unavailable items and retrying...');
    
    // Set up progress tracking
    setItemsProgress({ current: 0, total: originalItems.length });
    setLoadingStatus('Checking items in Sunsky catalog...');
    
    // Test each item individually to see which ones are available
    const availableItems = [];
    const unavailableItems = [];
    
    for (let i = 0; i < originalItems.length; i++) {
      const item = originalItems[i];
      setCurrentItemName(item.itemNo);
      setItemsProgress({ current: i + 1, total: originalItems.length });
      
      try {
        const testResponse = await supabase.functions.invoke('sunsky-api', {
          body: { 
            action: 'getPricesAndFreights',
            items: [item], // Test one item at a time
            deliveryAddress: {
              countryId: deliveryAddress.countryId,
              state: deliveryAddress.state,
              city: deliveryAddress.city,
              postcode: deliveryAddress.postcode
            }
          }
        });
        
        if (testResponse.data?.result === 'success') {
          availableItems.push(item);
        } else {
          unavailableItems.push(item);
        }
      } catch (error) {
        console.log(`Item ${item.itemNo} not available:`, error);
        unavailableItems.push(item);
      }
    }
    
    console.log('Available items:', availableItems);
    console.log('Unavailable items:', unavailableItems);
    
    // Store validated items to avoid re-validation during order creation
    setValidatedItems(new Set(availableItems.map(item => item.itemNo)));
    
    // Reset progress tracking
    setItemsProgress({ current: 0, total: 0 });
    setCurrentItemName('');
    
    // Uncheck unavailable items
    unavailableItems.forEach(item => {
      setCheckedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.itemNo);
        return newSet;
      });
    });
    
    // Notify parent component about unavailable items
    if (onItemsUnavailable && unavailableItems.length > 0) {
      onItemsUnavailable(unavailableItems);
    }
    
    if (availableItems.length === 0) {
      toast({
        title: "Items Moved to Out of Stock",
        description: `${unavailableItems.length} items not available in Sunsky catalog have been moved to Out of Stock tab`,
        variant: "default"
      });
      // Close the dialog since there are no items left to order
      if (onOpenChange) {
        onOpenChange(false);
      }
      return;
    }
    
    // Retry with only available items
    try {
      const response = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action: 'getPricesAndFreights',
          items: availableItems,
          deliveryAddress: {
            countryId: deliveryAddress.countryId,
            state: deliveryAddress.state,
            city: deliveryAddress.city,
            postcode: deliveryAddress.postcode
          }
        }
      });
      
      if (response.data?.result === 'success' && response.data?.data?.freightList) {
        const methods = response.data.data.freightList.map((method: any) => ({
          id: method.id,
          name: method.name,
          logo: method.logo,
          description: method.description,
          website: method.website,
          transitTime: method.transitTime || 'N/A',
          shippingCost: method.shippingCost || 0
        }));
        
        setShippingMethods(methods);
        
        // Auto-select the first shipping method
        if (methods.length > 0 && !deliveryAddress.shippingWayId) {
          setDeliveryAddress(prev => ({ ...prev, shippingWayId: methods[0].id }));
        }
        
        toast({
          title: "Shipping Methods Loaded",
          description: `${unavailableItems.length} unavailable items removed. Found ${methods.length} shipping options for ${availableItems.length} available items.`,
        });
      }
    } catch (error) {
      console.error('Error retrying with filtered items:', error);
      toast({
        title: "Failed to Load Shipping Methods",
        description: "Unable to get shipping options even after filtering unavailable items",
        variant: "destructive"
      });
    }
  };

  const handleItemToggle = (itemNo: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemNo)) {
      newChecked.delete(itemNo);
    } else {
      newChecked.add(itemNo);
    }
    setCheckedItems(newChecked);
  };

  const validateItemsExistence = async (items: OrderItem[]) => {
    const validItems: OrderItem[] = [];
    const invalidItems: OrderItem[] = [];
    
    setLoadingStatus('Validating items with Sunsky...');
    setLoadingProgress(10);
    
    // Log delivery address for debugging
    console.log('🏠 Delivery address for validation:', {
      countryId: deliveryAddress.countryId,
      state: deliveryAddress.state,
      city: deliveryAddress.city,
      postcode: deliveryAddress.postcode
    });
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setCurrentItemName(item.itemNo);
      setItemsProgress({ current: i + 1, total: items.length });
      setLoadingProgress(10 + (i / items.length) * 30); // 10-40% for validation
      
      console.log(`🔍 Validating item ${item.itemNo} (${item.title})`);
      
      try {
        const testResponse = await supabase.functions.invoke('sunsky-api', {
          body: { 
            action: 'getPricesAndFreights',
            items: [item],
            deliveryAddress: {
              countryId: deliveryAddress.countryId,
              state: deliveryAddress.state,
              city: deliveryAddress.city,
              postcode: deliveryAddress.postcode
            }
          }
        });

        console.log(`📋 API response for ${item.itemNo}:`, testResponse);

        if (testResponse.error) {
          console.warn(`❌ Item ${item.itemNo} validation failed:`, testResponse.error);
          invalidItems.push(item);
        } else if (testResponse.data?.result === 'success' && testResponse.data?.data?.items?.[0]) {
          console.log(`✅ Item ${item.itemNo} is VALID in Sunsky catalog`);
          validItems.push(item);
        } else {
          console.warn(`⚠️ Item ${item.itemNo} not found in Sunsky catalog. Response:`, testResponse.data);
          invalidItems.push(item);
        }
      } catch (error) {
        console.warn(`💥 Item ${item.itemNo} validation error:`, error);
        invalidItems.push(item);
      }
    }

    return { validItems, invalidItems };
  };

  const handleCreateOrder = async () => {
    console.log("🚀 Starting order creation process...");
    
    if (checkedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to order",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCredentialId) {
      toast({
        title: "No Sunsky Account Selected",
        description: "Please select a Sunsky account to place the order",
        variant: "destructive"
      });
      return;
    }

    console.log(`📋 Creating order with ${checkedItems.size} selected items`);
    console.log("🔑 Using Sunsky credential ID:", selectedCredentialId);
    
    setLoading(true);
    try {
      // Deduplicate items by itemNo and sum quantities
      const itemsMap = new Map<string, { itemNo: string, qty: number, remark?: string }>();
      
      orderItems
        .filter(item => checkedItems.has(item.itemNo) && item.qty > 0)
        .forEach(item => {
          const existing = itemsMap.get(item.itemNo);
          if (existing) {
            existing.qty += item.qty;
            // Keep the first remark or combine them
            if (item.remark && !existing.remark) {
              existing.remark = item.remark;
            }
          } else {
            itemsMap.set(item.itemNo, {
              itemNo: item.itemNo,
              qty: item.qty,
              remark: item.remark
            });
          }
        });
      
      const items = Array.from(itemsMap.values());

      // Add required title property for API
      const itemsWithTitles = items.map(item => ({
        ...item,
        title: item.remark || 'PO Item'
      }));
      
      // Skip validation if items were already validated during shipping step
      const alreadyValidated = itemsWithTitles.every(item => validatedItems.has(item.itemNo));
      let validItems = itemsWithTitles;
      let invalidItems: any[] = [];
      
      if (!alreadyValidated) {
        // Only validate if items weren't validated during shipping
        const validationResult = await validateItemsExistence(itemsWithTitles);
        validItems = validationResult.validItems;
        invalidItems = validationResult.invalidItems;
      } else {
        // Items already validated, just show progress
        setLoadingProgress(50);
        setLoadingStatus('Using pre-validated items...');
      }

      if (invalidItems.length > 0) {
        const invalidSkus = invalidItems.map(item => item.itemNo).join(', ');
        const message = invalidItems.length === items.length 
          ? `All ${invalidItems.length} item(s) are no longer available in Sunsky's catalog. Your SKU database may need updating.` 
          : `${invalidItems.length} item(s) are no longer available in Sunsky's catalog and will be excluded: ${invalidSkus.length > 50 ? invalidSkus.substring(0, 50) + '...' : invalidSkus}`;
        
        toast({
          title: invalidItems.length === items.length ? "All Items Unavailable" : "Some Items Unavailable",
          description: message,
          variant: "destructive"
        });

        if (onItemsUnavailable) {
          onItemsUnavailable(invalidItems);
        }
      }

      if (validItems.length === 0) {
        // Store invalid items for the data viewer
        setInvalidItemsData(invalidItems);
        
        console.log("🚫 NO VALID ITEMS - Showing Data Viewer button");
        console.log("Invalid items data:", invalidItems);
        
        toast({
          title: "No Valid Items",
          description: `None of the selected items exist in Sunsky's current catalog. Sunsky API returned "ITEM_NOT_EXIST" for your items.`,
          variant: "destructive",
          duration: 5000,
        });
        
        // Log the invalid SKUs for debugging
        console.log("Invalid SKUs that failed validation:", invalidItems.map(item => item.itemNo));
        
        setLoading(false);
        return;
      }

      setLoadingProgress(80);
      setLoadingStatus('Creating order with validated items...');

      const orderData = {
        ...orderOptions,
        items: validItems, // Use only valid items
        deliveryAddress,
        selectedOrderIds: selectedOrders
          .filter(order => {
            const itemNo = order.partner_sku || order.sunsky_sku?.sku_code || order.sku_code;
            return validItems.some(validItem => validItem.itemNo === itemNo);
          })
          .map(order => order.id)
      };

      console.log("📦 Order data prepared:", {
        itemCount: validItems.length,
        orderOptions,
        deliveryAddress: {
          countryId: deliveryAddress.countryId,
          receiver: deliveryAddress.receiver,
          city: deliveryAddress.city
        }
      });

      setLoadingProgress(80);

      console.log("🔄 Calling Sunsky API to create order...");
      const response = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action: 'createOrder',
          orderData,
          apiId: selectedCredentialId // Pass selected credential ID
        }
      });

      console.log("📡 Sunsky API response received:", response);

      // Handle edge function errors (non-2xx status codes)
      if (response.error) {
        console.error('Edge function error:', response.error);
        
        // Check if it's a specific Sunsky API error
        if (response.error.message && response.error.message.includes('已下单')) {
          throw new Error('This order has already been placed. Please check your Sunsky account or try with different items.');
        }
        
        // Generic edge function error
        throw new Error(`Service error: ${response.error.message || 'Unable to process order request'}`);
      }
      
      const data = response.data;
      
      // Handle API response errors
      if (!data) {
        throw new Error('No response from order service');
      }
      
      if (data.result === 'error') {
        const errorMsg = data?.messages?.[0] || data?.message || 'Unknown API error';
        console.error('Sunsky API error:', errorMsg);
        
        // Handle specific error messages
        if (errorMsg.includes('已下单')) {
          throw new Error('This order has already been placed. Please check your Sunsky account or try with different items.');
        }
        
        throw new Error(errorMsg);
      }
      
      if (data.result === 'success' && data.data?.number) {
        const orderNumber = data.data.number;
        const selectedOrderIds = selectedOrders
          .filter(order => {
            // Handle both noon orders and PO orders
            const itemNo = order.partner_sku || order.sunsky_sku?.sku_code || order.sku_code;
            return checkedItems.has(itemNo);
          })
          .map(order => order.id);
        
        onOrderSuccess(orderNumber, selectedOrderIds);
        onOpenChange(false);
        
        toast({
          title: "Order Created Successfully",
          description: `Sunsky Order #${orderNumber} has been created`,
        });
      } else {
        // Handle specific Sunsky API errors
        if (data.messages && data.messages.includes('已下单。')) {
          throw new Error('This order has already been placed. Please check your Sunsky account or try with different items.');
        }
        throw new Error(data.message || data.messages?.[0] || 'Failed to create order');
      }
    } catch (error) {
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes('已下单')) {
        errorMessage = 'This order has already been placed. Please check your Sunsky account or try with different items.';
      }
      
      toast({
        title: "Failed to Create Order",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceedToAddress = checkedItems.size > 0;
  const canProceedToShipping = deliveryAddress.countryId && deliveryAddress.receiver && deliveryAddress.address && deliveryAddress.city && deliveryAddress.postcode;
  
  // For loading shipping, only require selected items, country, and state (if country requires it)
  const selectedCountry = countries.find(c => c.id === deliveryAddress.countryId);
  const requiresState = selectedCountry?.shipToState === true;
  const canLoadShipping = checkedItems.size > 0 && deliveryAddress.countryId && (!requiresState || deliveryAddress.state);
  
  const canProceedToReview = typeof deliveryAddress.shippingWayId !== 'undefined' && deliveryAddress.shippingWayId !== null && deliveryAddress.shippingWayId !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order at Sunsky-Online.com
          </DialogTitle>
          <DialogDescription>
            Create a new order on Sunsky for the selected PO items
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {['items', 'address', 'shipping', 'review'].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === stepName 
                  ? 'bg-primary text-primary-foreground' 
                  : index < ['items', 'address', 'shipping', 'review'].indexOf(step)
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              {index < 3 && <div className="w-16 h-0.5 bg-muted mx-2" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-6">
        {step === 'items' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Items to Order</h3>
            
            {/* Sunsky Account Selector */}
            <Card className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium text-blue-900 dark:text-blue-100">Sunsky Account Selection</h4>
              </div>
              
              {loadingCredentials ? (
                <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-center gap-3">
                    <div className="relative">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                      <div className="absolute inset-0 rounded-full border border-amber-300 animate-pulse"></div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-amber-900 dark:text-amber-100">
                        Loading Sunsky Accounts
                      </div>
                      <div className="text-sm text-amber-700 dark:text-amber-200">
                        Searching available accounts...
                      </div>
                    </div>
                  </div>
                </Card>
              ) : sunskyCredentials.length > 0 ? (
                <div className="space-y-3">
                  <Label htmlFor="sunskyAccount">Select Sunsky Account *</Label>
                  <Select value={selectedCredentialId} onValueChange={setSelectedCredentialId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose which Sunsky account to use" />
                    </SelectTrigger>
                    <SelectContent>
                      {sunskyCredentials.map((credential) => (
                        <SelectItem key={credential.id} value={credential.id}>
                          <div className="flex items-center gap-2">
                            <span>{credential.name || 'Unnamed Account'}</span>
                            <Badge variant="outline" className="text-xs">
                              ***{credential.key_last4 || 'N/A'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the correct Sunsky account where you want the order to be placed.
                    The order will appear in the selected account's dashboard.
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-red-600 mb-2">⚠️ No Sunsky credentials found</div>
                  <p className="text-xs text-muted-foreground">
                    Please configure your Sunsky API credentials first to place orders.
                  </p>
                </div>
              )}
            </Card>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {orderItems.map((item) => (
                <Card key={item.itemNo} className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={checkedItems.has(item.itemNo)}
                      onCheckedChange={() => handleItemToggle(item.itemNo)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">
                        SKU: {item.itemNo} • Qty: {item.qty}
                      </div>
                      {item.remark && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Note: {item.remark}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">
                {checkedItems.size} of {orderItems.length} items selected
              </div>
            </div>
          </div>
        )}

          {step === 'address' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Delivery Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Select 
                    value={deliveryAddress.countryId} 
                    onValueChange={(value) => setDeliveryAddress({...deliveryAddress, countryId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="receiver">Receiver Name *</Label>
                  <Input
                    id="receiver"
                    value={deliveryAddress.receiver}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, receiver: e.target.value})}
                    placeholder="Full name of receiver"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={deliveryAddress.company}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, company: e.target.value})}
                    placeholder="Company name (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    value={deliveryAddress.address}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, address: e.target.value})}
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <Label htmlFor="address2">Address Line 2</Label>
                  <Input
                    id="address2"
                    value={deliveryAddress.address2}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, address2: e.target.value})}
                    placeholder="Apartment, suite, etc. (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">
                    State/Province {countries.find(c => c.id === deliveryAddress.countryId)?.shipToState ? '*' : ''}
                  </Label>
                  {(() => {
                    const selectedCountry = countries.find(c => c.id === deliveryAddress.countryId);
                    if (selectedCountry?.stateList && selectedCountry.stateList.length > 0) {
                      return (
                        <Select 
                          value={deliveryAddress.state} 
                          onValueChange={(value) => setDeliveryAddress({...deliveryAddress, state: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select state/province" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedCountry.stateList.map((state) => (
                              <SelectItem key={state.code} value={state.code}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    } else {
                      return (
                        <Input
                          id="state"
                          value={deliveryAddress.state}
                          onChange={(e) => setDeliveryAddress({...deliveryAddress, state: e.target.value})}
                          placeholder="State or province"
                        />
                      );
                    }
                  })()}
                </div>
                <div>
                  <Label htmlFor="postcode">Postal Code *</Label>
                  <Input
                    id="postcode"
                    value={deliveryAddress.postcode}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, postcode: e.target.value})}
                    placeholder="Postal/ZIP code"
                  />
                </div>
                <div>
                  <Label htmlFor="telephone">Phone</Label>
                  <Input
                    id="telephone"
                    value={deliveryAddress.telephone}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, telephone: e.target.value})}
                    placeholder="Contact phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={deliveryAddress.email}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, email: e.target.value})}
                    placeholder="Contact email"
                  />
                 </div>
               </div>
               
               {/* Saved Addresses Section */}
               <div className="mt-8 space-y-4">
                 <div className="flex items-center justify-between">
                   <h4 className="text-md font-semibold flex items-center gap-2">
                     <BookOpen className="h-4 w-4" />
                     Saved Addresses
                   </h4>
                   {canProceedToShipping && (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setShowSaveAddress(!showSaveAddress)}
                       className="flex items-center gap-2"
                     >
                       <Save className="h-4 w-4" />
                       Save Current Address
                     </Button>
                   )}
                 </div>

                 {/* Save Address Form */}
                 {showSaveAddress && (
                   <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                     <div className="flex gap-3 items-end">
                       <div className="flex-1">
                         <Label htmlFor="addressName">Address Name *</Label>
                         <Input
                           id="addressName"
                           value={saveAddressName}
                           onChange={(e) => setSaveAddressName(e.target.value)}
                           placeholder="e.g., Home, Office, Warehouse"
                         />
                       </div>
                       <Button onClick={handleSaveAddress} disabled={!saveAddressName.trim()}>
                         Save
                       </Button>
                       <Button
                         variant="outline"
                         onClick={() => {
                           setShowSaveAddress(false);
                           setSaveAddressName('');
                         }}
                       >
                         Cancel
                       </Button>
                     </div>
                   </Card>
                 )}

                 {/* Saved Addresses List */}
                 {loadingSavedAddresses ? (
                   <div className="flex items-center justify-center py-8">
                     <Loader2 className="h-6 w-6 animate-spin mr-2" />
                     Loading saved addresses...
                   </div>
                 ) : savedAddresses.length > 0 ? (
                   <div className="grid gap-3 max-h-60 overflow-y-auto">
                     {savedAddresses.map((address) => (
                       <Card key={address.id} className="p-4 hover:shadow-md transition-shadow">
                         <div className="flex justify-between items-start">
                           <div className="flex-1 cursor-pointer" onClick={() => handleLoadAddress(address)}>
                             <div className="flex items-center gap-2 mb-2">
                               <h5 className="font-medium">{address.name}</h5>
                               {address.is_default && (
                                 <Badge variant="secondary" className="text-xs">Default</Badge>
                               )}
                             </div>
                             <div className="text-sm text-muted-foreground space-y-1">
                               <div>{address.receiver}</div>
                               {address.company && <div>{address.company}</div>}
                               <div>{address.address}</div>
                               {address.address2 && <div>{address.address2}</div>}
                               <div>{address.city}, {address.state} {address.postcode}</div>
                               <div>{countries.find(c => c.id === address.country_id)?.name}</div>
                             </div>
                           </div>
                           <div className="flex gap-2 ml-4">
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleLoadAddress(address)}
                               className="text-xs"
                             >
                               Load
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleDeleteAddress(address.id, address.name)}
                               className="text-xs text-red-600 hover:text-red-700"
                             >
                               <Trash2 className="h-3 w-3" />
                             </Button>
                           </div>
                         </div>
                       </Card>
                     ))}
                   </div>
                 ) : (
                   <Card className="p-6 text-center text-muted-foreground">
                     <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                     <p>No saved addresses yet</p>
                     <p className="text-sm">Fill out the address form above and save it for future orders</p>
                   </Card>
                 )}
               </div>
             </div>
          )}

          {step === 'shipping' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Shipping Method</h3>
               <Button 
                 onClick={loadShippingMethods} 
                 disabled={loadingShipping || !canLoadShipping}
                 className="mb-4"
               >
                 {loadingShipping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
                 Load Shipping Options
               </Button>

               {loadingShipping && (
                  <Card className="mb-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                          <div className="absolute inset-0 rounded-full border-2 border-blue-200"></div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            Loading Shipping Options
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-200">
                            {loadingStatus || 'Preparing request...'}
                          </div>
                          {itemsProgress.total > 0 && (
                            <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                              Processing item {itemsProgress.current} of {itemsProgress.total}
                              {currentItemName && <span className="block font-mono">{currentItemName}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm font-medium text-blue-800 dark:text-blue-200">
                        <span>Progress</span>
                        <span>{loadingProgress}%</span>
                      </div>
                      
                      <div className="relative h-3 bg-blue-100 dark:bg-blue-800/30 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${loadingProgress}%` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                      </div>
                      
                      {/* Items Progress Bar */}
                      {itemsProgress.total > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-medium text-blue-700 dark:text-blue-300">
                            <span>Items Checked</span>
                            <span>{itemsProgress.current}/{itemsProgress.total}</span>
                          </div>
                          <div className="relative h-2 bg-blue-100 dark:bg-blue-800/30 rounded-full overflow-hidden">
                            <div 
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${itemsProgress.total > 0 ? (itemsProgress.current / itemsProgress.total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-blue-300">
                        <div className={`w-2 h-2 rounded-full ${loadingProgress >= 20 ? 'bg-blue-500' : 'bg-blue-200'} transition-colors`}></div>
                        <span className={loadingProgress >= 20 ? 'font-medium' : ''}>Validate Items</span>
                        <div className={`w-2 h-2 rounded-full ${loadingProgress >= 40 ? 'bg-blue-500' : 'bg-blue-200'} transition-colors`}></div>
                        <span className={loadingProgress >= 40 ? 'font-medium' : ''}>Prepare Request</span>
                        <div className={`w-2 h-2 rounded-full ${loadingProgress >= 60 ? 'bg-blue-500' : 'bg-blue-200'} transition-colors`}></div>
                        <span className={loadingProgress >= 60 ? 'font-medium' : ''}>Query Sunsky</span>
                        <div className={`w-2 h-2 rounded-full ${loadingProgress >= 80 ? 'bg-blue-500' : 'bg-blue-200'} transition-colors`}></div>
                        <span className={loadingProgress >= 80 ? 'font-medium' : ''}>Process Results</span>
                        <div className={`w-2 h-2 rounded-full ${loadingProgress >= 100 ? 'bg-green-500' : 'bg-blue-200'} transition-colors`}></div>
                        <span className={loadingProgress >= 100 ? 'font-medium text-green-600' : ''}>Complete</span>
                      </div>
                    </div>
                  </Card>
                )}
              
              {!canLoadShipping && (
                <p className="text-sm text-muted-foreground mb-4">
                  Please select items and choose a country{requiresState ? ' and state' : ''} to load shipping options.
                </p>
              )}
              
              {shippingMethods.length > 0 && (
                <div className="space-y-3">
                  {shippingMethods.map((method) => (
                    <Card 
                      key={method.id} 
                      className={`cursor-pointer transition-colors ${
                        deliveryAddress.shippingWayId === method.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setDeliveryAddress({...deliveryAddress, shippingWayId: method.id})}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{method.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Transit Time: {method.transitTime}
                            </div>
                            {method.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {method.description}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary">
                              ${typeof method.shippingCost === 'number' ? method.shippingCost.toFixed(2) : parseFloat(method.shippingCost || '0').toFixed(2)}
                            </Badge>
                            {method.website && (
                              <div className="mt-1">
                                <a 
                                  href={method.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Website <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'review' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Review Order</h3>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Available Items ({checkedItems.size})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {orderItems
                        .filter(item => checkedItems.has(item.itemNo) && (validatedItems.size === 0 || validatedItems.has(item.itemNo)))
                        .map((item) => (
                        <div key={item.itemNo} className="flex justify-between">
                          <span className="truncate">{item.title}</span>
                          <span className="text-sm text-muted-foreground">Qty: {item.qty}</span>
                        </div>
                      ))}
                    </div>
                    {checkedItems.size > 0 && orderItems.filter(item => checkedItems.has(item.itemNo) && (validatedItems.size === 0 || validatedItems.has(item.itemNo))).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <p>No valid items available for ordering</p>
                        <p className="text-sm">All selected items were filtered out during validation</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Delivery Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <div>{deliveryAddress.receiver}</div>
                      {deliveryAddress.company && <div>{deliveryAddress.company}</div>}
                      <div>{deliveryAddress.address}</div>
                      {deliveryAddress.address2 && <div>{deliveryAddress.address2}</div>}
                      <div>{deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.postcode}</div>
                      <div>{countries.find(c => c.id === deliveryAddress.countryId)?.name}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Order Options</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="siteNumber">Site Number (Optional)</Label>
                        <Input
                          id="siteNumber"
                          value={orderOptions.siteNumber}
                          onChange={(e) => setOrderOptions({...orderOptions, siteNumber: e.target.value})}
                          placeholder="Enter site number or PO number"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Checkbox
                          checked={orderOptions.useBalanceOnly}
                          onCheckedChange={(checked) => setOrderOptions({...orderOptions, useBalanceOnly: !!checked})}
                        />
                        <Label>Use balance only</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {step !== 'items' && (
              <Button 
                variant="outline" 
                onClick={() => {
                  const steps = ['items', 'address', 'shipping', 'review'];
                  const currentIndex = steps.indexOf(step);
                  setStep(steps[currentIndex - 1] as any);
                }}
              >
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            
            {step === 'items' && (
              <Button 
                onClick={() => setStep('address')}
                disabled={!canProceedToAddress || !selectedCredentialId || sunskyCredentials.length === 0}
              >
                Next: Address
              </Button>
            )}
            
            {step === 'address' && (
              <Button 
                onClick={() => setStep('shipping')}
                disabled={!canProceedToShipping}
              >
                Next: Shipping
              </Button>
            )}
            
            {step === 'shipping' && (
              <Button 
                onClick={() => setStep('review')}
                disabled={!canProceedToReview}
              >
                Next: Review
              </Button>
            )}
            
            {step === 'review' && (
              loading ? (
                <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center gap-3">
                    <div className="relative">
                      <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                      <div className="absolute inset-0 rounded-full border border-green-300 animate-pulse"></div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        Creating Order
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-200">
                        Processing your order with Sunsky...
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateOrder}
                    disabled={loading || checkedItems.size === 0}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Create Order
                  </Button>
                  
                  {invalidItemsData.length > 0 && (
                    <Button
                      variant="outline" 
                      onClick={() => {
                        console.log("📊 Opening Data Viewer");
                        setShowDataViewer(true);
                      }}
                    >
                      <Database className="h-4 w-4 mr-2" />
                      View Data Issues
                    </Button>
                  )}
                </div>
              )
            )}
          </div>
        </DialogFooter>
      </DialogContent>
      
      <SunskyDataViewer
        open={showDataViewer}
        onOpenChange={setShowDataViewer}
        invalidItems={invalidItemsData}
        onRefreshComplete={() => {
          // Optionally refresh the dialog data
          setShowDataViewer(false);
          toast({
            title: "Data Refreshed",
            description: "You can now retry creating your order",
          });
        }}
      />
    </Dialog>
  );
}