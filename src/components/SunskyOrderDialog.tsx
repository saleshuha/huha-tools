import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, Truck, ExternalLink, Save, BookOpen, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SunskyOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: any[];
  onOrderSuccess: (orderNumber: string, selectedOrderIds: string[]) => void;
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

export function SunskyOrderDialog({ open, onOpenChange, selectedOrders, onOrderSuccess }: SunskyOrderDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'items' | 'address' | 'shipping' | 'review'>('items');
  
  // States
  const [countries, setCountries] = useState<Country[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  
  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);
  const [saveAddressName, setSaveAddressName] = useState('');
  const [showSaveAddress, setShowSaveAddress] = useState(false);
  
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

  // Load countries on mount
  useEffect(() => {
    if (open && selectedOrders.length > 0) {
      loadCountries();
      loadSavedAddresses();
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
    const items = selectedOrders.map(order => ({
      itemNo: order.sunsky_sku?.sku_code || order.sku_code,
      qty: order.quantity,
      title: order.sunsky_sku?.title || order.title || order.sku_code,
      remark: `PO: ${order.po_number}`
    }));
    setOrderItems(items);
    setCheckedItems(new Set(items.map(item => item.itemNo)));
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
    if (!deliveryAddress.countryId || checkedItems.size === 0) return;
    
    setLoadingShipping(true);
    try {
      const items = orderItems
        .filter(item => checkedItems.has(item.itemNo) && item.qty > 0)
        .map(item => ({ itemNo: item.itemNo, qty: item.qty }));

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

      if (response.error) throw response.error;
      
      const data = response.data;
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
        setShippingMethods(methods);
        
        // Auto-select the first shipping method
        if (methods.length > 0 && !deliveryAddress.shippingWayId) {
          setDeliveryAddress(prev => ({ ...prev, shippingWayId: methods[0].id }));
        }
      } else if (data.result === 'error') {
        toast({
          title: "Failed to Load Shipping Methods",
          description: data.message || 'Unable to get shipping options for this location',
          variant: "destructive"
        });
      } else {
        throw new Error(data.message || 'Failed to load shipping methods');
      }
    } catch (error) {
      toast({
        title: "Failed to Load Shipping Methods",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingShipping(false);
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

  const handleCreateOrder = async () => {
    if (checkedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to order",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const items = orderItems
        .filter(item => checkedItems.has(item.itemNo) && item.qty > 0)
        .map(item => ({
          itemNo: item.itemNo,
          qty: item.qty,
          remark: item.remark
        }));

      const orderData = {
        ...orderOptions,
        items,
        deliveryAddress
      };

      const response = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action: 'createOrder',
          orderData
        }
      });

      if (response.error) throw response.error;
      
      const data = response.data;
      if (data.result === 'success' && data.data?.number) {
        const orderNumber = data.data.number;
        const selectedOrderIds = selectedOrders
          .filter(order => checkedItems.has(order.sunsky_sku?.sku_code || order.sku_code))
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
                    <CardTitle className="text-base">Selected Items ({checkedItems.size})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {orderItems.filter(item => checkedItems.has(item.itemNo)).map((item) => (
                        <div key={item.itemNo} className="flex justify-between">
                          <span className="truncate">{item.title}</span>
                          <span className="text-sm text-muted-foreground">Qty: {item.qty}</span>
                        </div>
                      ))}
                    </div>
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
                          readOnly
                          placeholder="PO Number (Auto-filled)"
                          className="bg-muted"
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
                disabled={!canProceedToAddress}
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
              <Button 
                onClick={handleCreateOrder}
                disabled={loading || checkedItems.size === 0}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                {loading ? 'Creating Order...' : 'Create Order'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}