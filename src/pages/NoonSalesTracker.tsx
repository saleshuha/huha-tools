import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, BarChart3, FileText, Download, TrendingUp, DollarSign, Store, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { NoonFeesUpload } from "@/components/noon/NoonFeesUpload";
import { NoonFeesAnalytics } from "@/components/noon/NoonFeesAnalytics";
import { NoonFeesTable } from "@/components/noon/NoonFeesTable";
import { SKUCostManager, SKUCost } from "@/components/noon/SKUCostManager";
import { NoonProfitAnalytics } from "@/components/noon/NoonProfitAnalytics";
import { NoonOrderFeesData } from "@/types/noon-fees";

export default function NoonSalesTracker() {
  const [feesData, setFeesData] = useState<NoonOrderFeesData[]>([]);
  const [skuCosts, setSkuCosts] = useState<SKUCost[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [stores, setStores] = useState<Array<{id: string, name: string}>>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Store creation modal states
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreLocation, setNewStoreLocation] = useState("");
  const [newStoreDescription, setNewStoreDescription] = useState("");
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  // Load data on component mount and when filters change
  useEffect(() => {
    loadFeesData();
    loadStores();
    loadMonths();
  }, [selectedCountry]);

  useEffect(() => {
    loadFeesData();
  }, [selectedStore, selectedMonth, selectedCountry]);

  const loadFeesData = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('noon_order_fees')
        .select('*')
        .eq('country_code', selectedCountry)
        .order('ordered_date', { ascending: false });

      if (selectedStore !== "all") {
        query = query.eq('store_id', selectedStore);
      }

      if (selectedMonth !== "all") {
        query = query.eq('report_month', selectedMonth);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform database data to match expected format
      const transformedData: NoonOrderFeesData[] = (data || []).map(item => ({
        id_partner: item.id_partner || '',
        marketplace: item.marketplace || '',
        order_nr: item.order_nr || '',
        item_nr: item.item_nr || '',
        partner_sales_nr: item.partner_sales_nr || '',
        awb_nr: item.awb_nr || '',
        sku: item.sku || '',
        partner_sku: item.partner_sku || '',
        fulfillment_mode: item.fulfillment_mode || '',
        family: item.family || '',
        product_type: item.product_type || '',
        brand: item.brand || '',
        product_title: item.product_title || '',
        item_status: item.item_status || '',
        country_code: item.country_code || '',
        last_statement_date: item.last_statement_date || '',
        ordered_date: item.ordered_date || '',
        shipped_date: item.shipped_date || '',
        delivered_date: item.delivered_date || '',
        returned_date: item.returned_date || '',
        currency_code: item.currency_code || '',
        seller_price: item.seller_price || 0,
        seller_promo: item.seller_promo || 0,
        base_price: item.base_price || 0,
        promo_deal: item.promo_deal || 0,
        noon_markup: item.noon_markup || 0,
        offer_price: item.offer_price || 0,
        promo_coupon: item.promo_coupon || 0,
        invoice_price: item.invoice_price || 0,
        fee_noon_promo: item.fee_noon_promo || 0,
        fee_noon_markup: item.fee_noon_markup || 0,
        fee_referral: item.fee_referral || 0,
        fee_noon_rocket_referral: item.fee_noon_rocket_referral || 0,
        fee_outbound_fbn: item.fee_outbound_fbn || 0,
        fee_weight_handling: item.fee_weight_handling || 0,
        fee_crossdock: item.fee_crossdock || 0,
        fee_directship_outbound: item.fee_directship_outbound || 0,
        fee_shipping: item.fee_shipping || 0,
        fee_damaged_return: item.fee_damaged_return || 0,
        fee_noon_penalty: item.fee_noon_penalty || 0,
        fee_item_cancellation: item.fee_item_cancellation || 0,
        fee_warranty_penalty: item.fee_warranty_penalty || 0,
        fee_retention_penalty: item.fee_retention_penalty || 0,
        fee_alternate_seller_fulfillment: item.fee_alternate_seller_fulfillment || 0,
        fee_miscellaneous: item.fee_miscellaneous || 0,
        fee_direct_collection: item.fee_direct_collection || 0,
        fee_reinvoicing: item.fee_reinvoicing || 0,
        total_payment: item.total_payment || 0,
        statement_nr: item.statement_nr || '',
        invoice_nr: item.invoice_nr || '',
        creditnote_nr: item.creditnote_nr || '',
      }));

      setFeesData(transformedData);
    } catch (error) {
      console.error('Error loading fees data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load fees data from database",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('country', selectedCountry)
        .eq('platform', 'noon')
        .order('name');
      
      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const loadMonths = async () => {
    try {
      const { data, error } = await supabase
        .from('noon_order_fees')
        .select('report_month')
        .eq('country_code', selectedCountry)
        .not('report_month', 'is', null);
      
      if (error) throw error;
      
      const uniqueMonths: string[] = [...new Set<string>(data?.map((item: any) => item.report_month as string) || [])];
      setMonths(uniqueMonths.sort().reverse());
    } catch (error) {
      console.error('Error loading months:', error);
    }
  };

  const handleDataUploaded = (data: NoonOrderFeesData[]) => {
    loadFeesData(); // Reload data after upload
    loadMonths(); // Reload months in case new month was added
    toast({
      title: "Data uploaded successfully",
      description: `${data.length} records uploaded to database`,
    });
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) {
      toast({
        title: "Store name required",
        description: "Please enter a store name",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingStore(true);
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('stores')
        .insert({
          user_id: user.data.user.id,
          name: newStoreName.trim(),
          location: newStoreLocation.trim() || null,
          description: newStoreDescription.trim() || null,
          country: selectedCountry,
          currency: selectedCountry === 'UAE' ? 'AED' : 'SAR',
          platform: 'noon'
        })
        .select()
        .single();

      if (error) throw error;

      // Add to stores list and select it
      setStores(prev => [...prev, { id: data.id, name: data.name }]);
      setSelectedStore(data.id);
      
      // Reset modal
      setNewStoreName("");
      setNewStoreLocation("");
      setNewStoreDescription("");
      setShowStoreModal(false);

      toast({
        title: "Store created successfully",
        description: `${data.name} has been added to your stores`,
      });
    } catch (error) {
      console.error('Error creating store:', error);
      toast({
        title: "Error creating store",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsCreatingStore(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Noon Order Fees Tracker</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select store..." />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={showStoreModal} onOpenChange={setShowStoreModal}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  Add Store
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background border z-50">
                <DialogHeader>
                  <DialogTitle>Add New Noon Store</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Store Name *</Label>
                    <Input
                      id="storeName"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      placeholder="Enter store name..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeLocation">Location</Label>
                    <Input
                      id="storeLocation"
                      value={newStoreLocation}
                      onChange={(e) => setNewStoreLocation(e.target.value)}
                      placeholder="Store location (optional)..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeDescription">Description</Label>
                    <Textarea
                      id="storeDescription"
                      value={newStoreDescription}
                      onChange={(e) => setNewStoreDescription(e.target.value)}
                      placeholder="Store description (optional)..."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <Button 
                      onClick={handleCreateStore} 
                      disabled={isCreatingStore}
                      className="flex-1"
                    >
                      {isCreatingStore ? "Creating..." : "Create Store"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowStoreModal(false)}
                      disabled={isCreatingStore}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Month..." />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="all">All Months</SelectItem>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadFeesData} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Data
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            SKU Costs
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Order Level Fees Report</CardTitle>
            </CardHeader>
            <CardContent>
              <NoonFeesUpload onDataUploaded={handleDataUploaded} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          {feesData.length > 0 ? (
            <SKUCostManager 
              feesData={feesData} 
              onCostsUpdated={setSkuCosts}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Orders Data</h3>
                  <p>Upload your Noon order fees report first to manage SKU costs.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {feesData.length > 0 ? (
            <>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Basic Analytics
                  </TabsTrigger>
                  <TabsTrigger value="profit" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Profit Analysis
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Order Details
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <NoonFeesAnalytics feesData={feesData} />
                </TabsContent>

                <TabsContent value="profit" className="space-y-4">
                  <NoonProfitAnalytics feesData={feesData} skuCosts={skuCosts} />
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <NoonFeesTable feesData={feesData} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                  <p>Upload your Noon order fees report to view analytics and insights.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}