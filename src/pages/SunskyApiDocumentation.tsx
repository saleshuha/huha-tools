import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { HuhaTab01 } from '@/components/ui/huha-tab-01';
import { ApiDocSection } from '@/components/sunsky/ApiDocSection';
import { ApiCodeBlock } from '@/components/sunsky/ApiCodeBlock';
import { 
  Book, 
  Search, 
  Key, 
  Package, 
  ShoppingCart, 
  Wallet, 
  Tag,
  Bell,
  Code,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const SunskyApiDocumentation = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('getting-started');
  const navigate = useNavigate();

  const signatureExample = `// Generate signature for Sunsky API
const params = {
  name: "John Smith",
  age: 19,
  gender: "male"
};

const key = "MYKEY";
const secret = "MYSECRET";

// Step 1: Sort parameters by name and concatenate values with key
const sortedValues = Object.keys(params)
  .sort()
  .map(k => params[k])
  .join('') + key;
// Result: "19maleJohn SmithMYKEY"

// Step 2: Append @ and secret
const signatureString = sortedValues + "@" + secret;
// Result: "19maleJohn SmithMYKEY@MYSECRET"

// Step 3: Calculate MD5
const signature = md5(signatureString);`;

  const exampleResponse = `// Success Response
{
  "result": "success",
  "data": [{
    "id": 1032,
    "code": "003",
    "gmtCreated": "01/31/2013 00:00",
    "name": "N Style Phone",
    "parentId": 408,
    "status": 1
  }]
}

// Error Response
{
  "result": "error",
  "messages": ["The record you visiting does NOT exist."]
}`;

  const tabs = [
    {
      value: 'getting-started',
      label: 'Getting Started',
      content: (
        <div className="space-y-6">
          {/* Hero Section */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Book className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Sunsky API Documentation</CardTitle>
                  <CardDescription className="text-base">
                    Complete reference for integrating with Sunsky wholesale platform
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="gap-1">
                  <Code className="h-3 w-3" />
                  REST API
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  JSON Format
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Key className="h-3 w-3" />
                  MD5 Signature
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* API Endpoint */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                API Endpoint
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Base URL:</p>
                <code className="block bg-muted px-4 py-3 rounded-lg font-mono text-sm">
                  https://open.sunsky-online.com
                </code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Example API URL:</p>
                <code className="block bg-muted px-4 py-3 rounded-lg font-mono text-sm break-all">
                  https://open.sunsky-online.com/openapi/category!getChildren.do
                </code>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-400">Important</p>
                  <p className="text-muted-foreground mt-1">
                    We recommend using <strong>POST</strong> method to pass parameters for all API calls.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Authentication & Signature
              </CardTitle>
              <CardDescription>
                All API calls require a key and signature for authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Required Parameters</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Badge className="mt-0.5">key</Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">API Key</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your API key obtained from the sales manager
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Badge className="mt-0.5">signature</Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">MD5 Signature</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Generated with key, secret, and parameter values
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Signature Generation Steps</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex gap-3">
                    <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center flex-shrink-0">1</Badge>
                    <p>Sort parameters by name and concatenate values with your API key</p>
                  </div>
                  <div className="flex gap-3">
                    <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center flex-shrink-0">2</Badge>
                    <p>Append '@' character and your secret to the string</p>
                  </div>
                  <div className="flex gap-3">
                    <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center flex-shrink-0">3</Badge>
                    <p>Calculate MD5 hash of the resulting string</p>
                  </div>
                </div>
              </div>

              <ApiCodeBlock 
                code={signatureExample}
                language="typescript"
                title="Signature Generation Example"
              />

              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">Security Note</p>
                  <p className="text-muted-foreground mt-1">
                    Do NOT place the secret in the request parameters. Only use it to generate the signature.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Format */}
          <Card>
            <CardHeader>
              <CardTitle>Response Format</CardTitle>
              <CardDescription>All responses are formatted in JSON</CardDescription>
            </CardHeader>
            <CardContent>
              <ApiCodeBlock 
                code={exampleResponse}
                language="json"
              />
            </CardContent>
          </Card>

          {/* Rate Limiting */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
              <CardDescription>
                API call frequency is controlled to protect server resources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sunsky limits API call frequency to prevent server overload. Check the frequency control info at:
              </p>
              <code className="block bg-muted px-4 py-3 rounded-lg font-mono text-xs break-all">
                https://open.sunsky-online.com/admin/apiAccessControl!list.do
              </code>
            </CardContent>
          </Card>

          {/* Credentials Management */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Managing Your API Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your Sunsky API keys are securely stored in the <code className="bg-muted px-1.5 py-0.5 rounded">sunsky_credentials</code> table 
                and are automatically used by our system's edge functions.
              </p>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => navigate('/sunsky-importer')}
                  className="gap-2"
                >
                  <Key className="h-4 w-4" />
                  Manage Credentials
                </Button>
                <p className="text-xs text-muted-foreground">
                  Add, edit, or test your API keys
                </p>
              </div>
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <Code className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Implementation: <code className="bg-background px-1.5 py-0.5 rounded">supabase/functions/sunsky-api/index.ts</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      value: 'products',
      label: 'Product APIs',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Product Management APIs</h2>
              <p className="text-muted-foreground">Search, retrieve, and manage product data</p>
            </div>
          </div>

          <ApiDocSection
            title="Get Category Children"
            url="/openapi/category!getChildren.do"
            category="product"
            description="Retrieve categories and their hierarchy. Returns all categories if no parameters specified."
            parameters={[
              { name: 'lang', type: 'string', required: false, description: 'Language code (en, ru, fr, es, pt, de, it, nl, ar, vi, th, ko, ja, zh_CN, zh_TW)' },
              { name: 'parentId', type: 'number', required: false, description: 'Parent category ID (0 for top-level, omit for all)' },
              { name: 'gmtModifiedStart', type: 'datetime', required: false, description: 'Fetch categories changed since this date (MM/dd/yyyy HH:mm:ss)' }
            ]}
            resultFields={[
              { name: 'id', type: 'number', description: 'Unique category ID' },
              { name: 'code', type: 'string', description: 'Category code for sorting' },
              { name: 'name', type: 'string', description: 'Full category name' },
              { name: 'shortName', type: 'string', description: 'Short name (may be empty)' },
              { name: 'hsCode', type: 'string', description: 'HS code for customs' },
              { name: 'status', type: 'number', description: '1=Valid, 2=Deleted' },
              { name: 'parentId', type: 'number', description: 'Parent category ID' },
              { name: 'gmtModified', type: 'datetime', description: 'Last modification time' }
            ]}
          />

          <ApiDocSection
            title="Search Products"
            url="/openapi/product!search.do"
            category="product"
            description="Search for products with various filters. Supports pagination and incremental updates."
            parameters={[
              { name: 'lang', type: 'string', required: false, description: 'Language code for product descriptions' },
              { name: 'categoryId', type: 'number', required: false, description: 'Search within category (includes subcategories)' },
              { name: 'pageSize', type: 'number', required: false, description: 'Results per page (default: 40, max: 100)' },
              { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
              { name: 'gmtModifiedStart', type: 'datetime', required: false, description: 'Products changed since date' },
              { name: 'status', type: 'number', required: false, description: '-1 for all, 1=Valid, 2=Deleted, 3=Out of stock, 4=Hidden' },
              { name: 'brandName', type: 'string', required: false, description: 'Filter by brand (e.g., Xiaomi, Huawei)' },
              { name: 'leadTimeLevel', type: 'number', required: false, description: '1-5, where 5=same-day shipping' }
            ]}
            resultFields={[
              { name: 'total', type: 'number', description: 'Total matching products' },
              { name: 'pageCount', type: 'number', description: 'Total pages available' },
              { name: 'result', type: 'array', description: 'Array of product records' }
            ]}
          />

          <ApiDocSection
            title="Get Product Details"
            url="/openapi/product!detail.do"
            category="product"
            description="Retrieve complete information for a specific product including pricing, specifications, and images."
            parameters={[
              { name: 'lang', type: 'string', required: false, description: 'Language for product description' },
              { name: 'itemNo', type: 'string', required: true, description: 'Product item number' }
            ]}
            resultFields={[
              { name: 'id', type: 'number', description: 'Unique product ID' },
              { name: 'itemNo', type: 'string', description: 'Product item number' },
              { name: 'name', type: 'string', description: 'Product name' },
              { name: 'description', type: 'string', description: 'Detailed description' },
              { name: 'price', type: 'number', description: 'Current price' },
              { name: 'priceList', type: 'array', description: 'Wholesale pricing tiers' },
              { name: 'stock', type: 'number', description: 'Current stock quantity' },
              { name: 'warehouse', type: 'string', description: 'Warehouse location (CN, HK, RU)' },
              { name: 'leadTime', type: 'string', description: 'Shipping time description' },
              { name: 'unitWeight', type: 'number', description: 'Product weight' },
              { name: 'modelList', type: 'array', description: 'Available models/variants' },
              { name: 'picCount', type: 'number', description: 'Number of product images' }
            ]}
          />

          <ApiDocSection
            title="Download Product Images"
            url="/openapi/product!getImages.do"
            category="product"
            description="Download all images for a specific product as a ZIP file."
            parameters={[
              { name: 'itemNo', type: 'string', required: true, description: 'Product item number' },
              { name: 'size', type: 'number', required: false, description: 'Image size in pixels (max: 800)' },
              { name: 'watermark', type: 'string', required: false, description: 'Custom watermark text' }
            ]}
            resultFields={[
              { name: 'stream', type: 'binary', description: 'ZIP file containing all product images' }
            ]}
          />

          <ApiDocSection
            title="Get Image Changelist"
            url="/openapi/product!getImageChangeList.do"
            category="product"
            description="Retrieve list of products whose images have been updated. Use this to sync image changes."
            parameters={[
              { name: 'pageSize', type: 'number', required: false, description: 'Results per page (default: 40, max: 100)' },
              { name: 'page', type: 'number', required: false, description: 'Page number' },
              { name: 'gmtModifiedStart', type: 'datetime', required: false, description: 'Images changed since date' }
            ]}
            resultFields={[
              { name: 'total', type: 'number', description: 'Total items with image changes' },
              { name: 'pageCount', type: 'number', description: 'Total pages' },
              { name: 'result', type: 'array', description: 'Array of {itemNo, gmtModified}' }
            ]}
          />
        </div>
      )
    },
    {
      value: 'orders',
      label: 'Order APIs',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <ShoppingCart className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Order Management APIs</h2>
              <p className="text-muted-foreground">Create, track, and manage orders</p>
            </div>
          </div>

          <ApiDocSection
            title="Get Countries"
            url="/openapi/order!getCountries.do"
            category="order"
            description="Retrieve list of countries available for shipping, including states/provinces."
            parameters={[]}
            resultFields={[
              { name: 'id', type: 'number', description: 'Unique country ID' },
              { name: 'code', type: 'string', description: 'ISO 3166 country code' },
              { name: 'name', type: 'string', description: 'Country name' },
              { name: 'shipToState', type: 'boolean', description: 'Whether shipping cost varies by state' },
              { name: 'stateList', type: 'array', description: 'List of states/provinces {code, name}' }
            ]}
          />

          <ApiDocSection
            title="Get Prices and Shipping"
            url="/openapi/order!getPricesAndFreights.do"
            category="order"
            description="Calculate prices and shipping costs for a list of items before creating an order."
            parameters={[
              { name: 'countryId', type: 'number', required: true, description: 'Destination country ID' },
              { name: 'state', type: 'string', required: false, description: 'State/province code' },
              { name: 'items.#.itemNo', type: 'string', required: true, description: 'Product item number (# = 1,2,3...)' },
              { name: 'items.#.qty', type: 'number', required: true, description: 'Quantity for item' }
            ]}
            resultFields={[
              { name: 'priceList', type: 'array', description: 'Pricing for each item {itemNo, qty, price, amount}' },
              { name: 'freightList', type: 'array', description: 'Available shipping methods with costs' }
            ]}
          />

          <ApiDocSection
            title="Create Order"
            url="/openapi/order!createOrder.do"
            category="order"
            description="Create a new order with items and delivery address. Returns order details including tracking."
            parameters={[
              { name: 'siteNumber', type: 'string', required: false, description: 'Your reference number (max 32 chars)' },
              { name: 'useBalanceOnly', type: 'boolean', required: false, description: 'Require sufficient balance (default: false)' },
              { name: 'lockStock', type: 'boolean', required: false, description: 'Reserve inventory immediately to prevent stock issues (default: false)' },
              { name: 'deliveryAddress.countryId', type: 'number', required: true, description: 'Country ID' },
              { name: 'deliveryAddress.state', type: 'string', required: true, description: 'State/province (max 40 chars)' },
              { name: 'deliveryAddress.city', type: 'string', required: true, description: 'City (max 40 chars)' },
              { name: 'deliveryAddress.address', type: 'string', required: true, description: 'Street address (max 100 chars)' },
              { name: 'deliveryAddress.postcode', type: 'string', required: true, description: 'Postal code (max 20 chars)' },
              { name: 'deliveryAddress.receiver', type: 'string', required: true, description: 'Receiver name (max 32 chars)' },
              { name: 'deliveryAddress.telephone', type: 'string', required: false, description: 'Contact phone (recommended)' },
              { name: 'deliveryAddress.email', type: 'string', required: false, description: 'Contact email (recommended)' },
              { name: 'deliveryAddress.shippingWayId', type: 'number', required: true, description: 'Shipping method ID' },
              { name: 'items.#.itemNo', type: 'string', required: true, description: 'Product item number' },
              { name: 'items.#.qty', type: 'number', required: true, description: 'Quantity' },
              { name: 'items.#.remark', type: 'string', required: false, description: 'Item note (max 100 chars)' }
            ]}
            resultFields={[
              { name: 'number', type: 'string', description: 'Sunsky order number' },
              { name: 'status', type: 'number', description: '1=Unpaid, 2=Paid, 3=Shipped, 4=Cancelled, 5=Delivered' },
              { name: 'amount', type: 'number', description: 'Subtotal for items' },
              { name: 'shippingCost', type: 'number', description: 'Shipping cost' },
              { name: 'totalAmount', type: 'number', description: 'Total amount (items + shipping)' },
              { name: 'trackingNumber', type: 'string', description: 'Tracking number' },
              { name: 'gmtCreated', type: 'datetime', description: 'Order creation time' },
              { name: 'detailList', type: 'array', description: 'Ordered items with prices' }
            ]}
          />

          <ApiDocSection
            title="Search Orders"
            url="/openapi/order!getOrderList.do"
            category="order"
            description="Search and filter your orders. Supports pagination and date range filtering."
            parameters={[
              { name: 'pageSize', type: 'number', required: false, description: 'Results per page (default: 40, max: 100)' },
              { name: 'page', type: 'number', required: false, description: 'Page number' },
              { name: 'status', type: 'number', required: false, description: 'Filter by order status' },
              { name: 'siteNumber', type: 'string', required: false, description: 'Your reference number' },
              { name: 'gmtCreatedStart', type: 'date', required: false, description: 'Orders after date (MM/dd/yyyy)' },
              { name: 'gmtCreatedEnd', type: 'date', required: false, description: 'Orders before date (MM/dd/yyyy)' }
            ]}
            resultFields={[
              { name: 'total', type: 'number', description: 'Total matching orders' },
              { name: 'pageCount', type: 'number', description: 'Total pages' },
              { name: 'result', type: 'array', description: 'Array of orders (without detailList)' }
            ]}
          />

          <ApiDocSection
            title="Get Order Details"
            url="/openapi/order!getOrderDetails.do"
            category="order"
            description="Retrieve complete information for a specific order including all items."
            parameters={[
              { name: 'number', type: 'string', required: true, description: 'Sunsky order number' }
            ]}
            resultFields={[
              { name: 'number', type: 'string', description: 'Order number' },
              { name: 'status', type: 'number', description: 'Order status' },
              { name: 'amount', type: 'number', description: 'Order subtotal' },
              { name: 'shippingCost', type: 'number', description: 'Shipping cost' },
              { name: 'totalAmount', type: 'number', description: 'Total amount' },
              { name: 'trackingNumber', type: 'string', description: 'Tracking number' },
              { name: 'deliveryAddress', type: 'object', description: 'Full delivery address' },
              { name: 'detailList', type: 'array', description: 'Order items with full details' }
            ]}
          />
        </div>
      )
    },
    {
      value: 'account',
      label: 'Account APIs',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Wallet className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Account Management APIs</h2>
              <p className="text-muted-foreground">Check balance and transaction history</p>
            </div>
          </div>

          <ApiDocSection
            title="Check Balance"
            url="/openapi/order!getBalance.do"
            category="account"
            description="Check your current account balance on Sunsky platform."
            parameters={[]}
            resultFields={[
              { name: 'balance', type: 'string', description: 'Current balance amount (e.g., "1200.00")' }
            ]}
          />

          <ApiDocSection
            title="Get Balance History"
            url="/openapi/order!getBillList.do"
            category="account"
            description="Retrieve your transaction history including prepayments, orders, and refunds."
            parameters={[
              { name: 'pageSize', type: 'number', required: false, description: 'Results per page (default: 40, max: 100)' },
              { name: 'page', type: 'number', required: false, description: 'Page number' },
              { name: 'gmtCreatedStart', type: 'date', required: false, description: 'Transactions after date (MM/dd/yyyy)' },
              { name: 'gmtCreatedEnd', type: 'date', required: false, description: 'Transactions before date (MM/dd/yyyy)' }
            ]}
            resultFields={[
              { name: 'total', type: 'number', description: 'Total transactions' },
              { name: 'pageCount', type: 'number', description: 'Total pages' },
              { name: 'result', type: 'array', description: 'Transaction records' }
            ]}
          />
        </div>
      )
    },
    {
      value: 'reference',
      label: 'Reference',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Book className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">API Reference</h2>
              <p className="text-muted-foreground">Status codes, enumerations, and constants</p>
            </div>
          </div>

          {/* Status Codes */}
          <Card>
            <CardHeader>
              <CardTitle>Category Status Codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge variant="default">1</Badge>
                <span className="text-sm">Valid</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge variant="destructive">2</Badge>
                <span className="text-sm">Deleted</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Status Codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge variant="default">1</Badge>
                <span className="text-sm">Valid</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge variant="destructive">2</Badge>
                <span className="text-sm">Deleted</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge variant="secondary">3</Badge>
                <span className="text-sm">Out of Stock</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge variant="outline">4</Badge>
                <span className="text-sm">Hidden (too old)</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Status Codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge variant="secondary">1</Badge>
                <span className="text-sm">Unpaid</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge className="bg-blue-500">2</Badge>
                <span className="text-sm">Paid</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge className="bg-yellow-500">3</Badge>
                <span className="text-sm">Shipped</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge variant="destructive">4</Badge>
                <span className="text-sm">Cancelled</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge className="bg-green-500">5</Badge>
                <span className="text-sm">Delivered</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Time Levels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge className="bg-green-600">5</Badge>
                <span className="text-sm">Same-day shipping</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge className="bg-green-500">4</Badge>
                <span className="text-sm">Ship in 2 days</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge className="bg-yellow-500">3</Badge>
                <span className="text-sm">Ship in 2-3 days</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge className="bg-orange-500">2</Badge>
                <span className="text-sm">Ship in 3-5 days</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Badge variant="destructive">1</Badge>
                <span className="text-sm">Out of stock</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supported Languages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { code: 'en', name: 'English' },
                  { code: 'ru', name: 'русский язык' },
                  { code: 'fr', name: 'Français' },
                  { code: 'es', name: 'Español' },
                  { code: 'pt', name: 'Português' },
                  { code: 'de', name: 'Deutsche' },
                  { code: 'it', name: 'Italiano' },
                  { code: 'nl', name: 'Nederlands' },
                  { code: 'ar', name: 'عربي' },
                  { code: 'vi', name: 'Tiếng Việt' },
                  { code: 'th', name: 'ไทย' },
                  { code: 'ko', name: '한국어' },
                  { code: 'ja', name: '日本語' },
                  { code: 'zh_CN', name: '中文简体' },
                  { code: 'zh_TW', name: '中文繁体' }
                ].map((lang) => (
                  <div key={lang.code} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <code className="text-xs font-mono bg-background px-1.5 py-0.5 rounded">{lang.code}</code>
                    <span className="text-sm">{lang.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Book className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Sunsky API Documentation
                </h1>
                <p className="text-muted-foreground mt-1">
                  Complete integration guide for wholesale platform
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <HuhaTab01
          items={tabs}
          value={activeTab}
          onValueChange={setActiveTab}
        />
      </div>
    </div>
  );
};

export default SunskyApiDocumentation;
