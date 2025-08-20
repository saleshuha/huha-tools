import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, Truck, ExternalLink } from 'lucide-react';
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

export function SunskyOrderDialog({ open, onOpenChange, selectedOrders, onOrderSuccess }: SunskyOrderDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'items' | 'address' | 'shipping' | 'review'>('items');
  
  // States
  const [countries, setCountries] = useState<Country[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  
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
    if (open) {
      loadCountries();
      initializeOrderItems();
    }
  }, [open, selectedOrders]);

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
        .filter(item => checkedItems.has(item.itemNo))
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
        .filter(item => checkedItems.has(item.itemNo))
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
        throw new Error(data.message || 'Failed to create order');
      }
    } catch (error) {
      toast({
        title: "Failed to Create Order",
        description: error.message,
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
                          onChange={(e) => setOrderOptions({...orderOptions, siteNumber: e.target.value})}
                          placeholder="Your reference number"
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