import { useState } from 'react';
import { useToast } from "@/hooks/use-toast"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FirecrawlService } from '@/lib/FirecrawlService';
import { Globe, Key, Loader2, Package, ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';

interface ProductData {
  title?: string;
  price?: string;
  description?: string;
  brand?: string;
  sku?: string;
  availability?: string;
  images?: string[];
  category?: string;
  rating?: string;
  reviews?: string;
  weight?: string;
  dimensions?: string;
  [key: string]: any;
}

interface ProductScraperProps {
  onBack: () => void;
}

export const ProductScraper = ({ onBack }: ProductScraperProps) => {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState(FirecrawlService.getApiKey() || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTested, setKeyTested] = useState(!!FirecrawlService.getApiKey());
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [rawData, setRawData] = useState<any>(null);

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your API key",
        variant: "destructive",
      });
      return;
    }

    setIsTestingKey(true);
    const isValid = await FirecrawlService.testApiKey(apiKey);
    
    if (isValid) {
      FirecrawlService.saveApiKey(apiKey);
      setKeyTested(true);
      toast({
        title: "Success",
        description: "API key is valid and saved",
      });
    } else {
      toast({
        title: "Error",
        description: "Invalid API key. Please check and try again.",
        variant: "destructive",
      });
    }
    setIsTestingKey(false);
  };

  const extractProductData = (data: any): ProductData => {
    const extracted: ProductData = {};
    
    // Extract from metadata
    if (data.metadata) {
      extracted.title = data.metadata.title;
      extracted.description = data.metadata.description;
    }

    // Try to extract price patterns from markdown/html
    const content = data.markdown || data.html || '';
    
    // Price patterns
    const priceMatch = content.match(/\$[\d,]+\.?\d*/g) || content.match(/[\d,]+\.?\d*\s*USD/g);
    if (priceMatch) {
      extracted.price = priceMatch[0];
    }

    // Brand patterns
    const brandMatch = content.match(/brand[:\s]+([^\n\r,]+)/i);
    if (brandMatch) {
      extracted.brand = brandMatch[1].trim();
    }

    // SKU patterns
    const skuMatch = content.match(/sku[:\s]+([^\n\r,\s]+)/i) || content.match(/model[:\s]+([^\n\r,\s]+)/i);
    if (skuMatch) {
      extracted.sku = skuMatch[1].trim();
    }

    // Availability patterns
    const availMatch = content.match(/(in stock|out of stock|available|unavailable)/i);
    if (availMatch) {
      extracted.availability = availMatch[1];
    }

    // Extract other fields from the structured data if available
    if (data.extracted) {
      Object.assign(extracted, data.extracted);
    }

    return extracted;
  };

  const handleScrape = async () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a product URL",
        variant: "destructive",
      });
      return;
    }

    if (!keyTested) {
      toast({
        title: "Error",
        description: "Please test your API key first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProductData(null);
    setRawData(null);
    
    try {
      const result = await FirecrawlService.scrapeProduct(url);
      
      if (result.success && result.data) {
        const extracted = extractProductData(result.data);
        setProductData(extracted);
        setRawData(result.data);
        
        toast({
          title: "Success",
          description: "Product data scraped successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to scrape product data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error scraping product:', error);
      toast({
        title: "Error",
        description: "Failed to scrape product data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProductField = (field: string, value: string) => {
    setProductData(prev => prev ? { ...prev, [field]: value } : { [field]: value });
  };

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="default"
            onClick={onBack}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Batch Processor
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary shadow-soft mb-4">
            <Package className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Product Scraper</h1>
          <p className="text-muted-foreground text-lg">
            Extract product information from any e-commerce website
          </p>
        </div>

        {/* API Key Setup */}
        {!keyTested && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Setup Firecrawl API Key
              </CardTitle>
              <CardDescription>
                You need a Firecrawl API key to scrape websites. Get one from{" "}
                <a href="https://firecrawl.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  firecrawl.dev
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Firecrawl API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="fc-..."
                />
              </div>
              <Button
                onClick={handleTestApiKey}
                disabled={isTestingKey || !apiKey.trim()}
                className="w-full"
              >
                {isTestingKey ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing API Key...
                  </>
                ) : (
                  "Test & Save API Key"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* API Key Status */}
        {keyTested && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              API key is configured and ready to use.
            </AlertDescription>
          </Alert>
        )}

        {/* URL Input */}
        {keyTested && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Product URL
              </CardTitle>
              <CardDescription>
                Enter the URL of the product page you want to scrape
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productUrl">Product URL</Label>
                <Input
                  id="productUrl"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example-store.com/product/..."
                />
              </div>
              <Button
                onClick={handleScrape}
                disabled={isLoading || !url.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scraping Product...
                  </>
                ) : (
                  "Scrape Product Data"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading Progress */}
        {isLoading && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Scraping product data...</span>
                </div>
                <Progress value={undefined} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Data Form */}
        {productData && (
          <Card>
            <CardHeader>
              <CardTitle>Scraped Product Data</CardTitle>
              <CardDescription>
                Review and edit the extracted product information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={productData.title || ''}
                    onChange={(e) => updateProductField('title', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    value={productData.price || ''}
                    onChange={(e) => updateProductField('price', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={productData.brand || ''}
                    onChange={(e) => updateProductField('brand', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={productData.sku || ''}
                    onChange={(e) => updateProductField('sku', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Input
                    id="availability"
                    value={productData.availability || ''}
                    onChange={(e) => updateProductField('availability', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={productData.category || ''}
                    onChange={(e) => updateProductField('category', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={productData.description || ''}
                  onChange={(e) => updateProductField('description', e.target.value)}
                  rows={4}
                />
              </div>

              {/* Additional extracted fields */}
              {Object.keys(productData).filter(key => 
                !['title', 'price', 'brand', 'sku', 'availability', 'category', 'description'].includes(key)
              ).length > 0 && (
                <div className="space-y-2">
                  <Label>Additional Fields</Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(productData)
                      .filter(([key]) => !['title', 'price', 'brand', 'sku', 'availability', 'category', 'description'].includes(key))
                      .map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                          <Input
                            id={key}
                            value={String(value || '')}
                            onChange={(e) => updateProductField(key, e.target.value)}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button onClick={() => console.log('Product data:', productData)}>
                  Export Data
                </Button>
                <Button variant="outline" onClick={() => setProductData(null)}>
                  Clear Data
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Raw Data Debug */}
        {rawData && (
          <Card>
            <CardHeader>
              <CardTitle>Raw Scraped Data</CardTitle>
              <CardDescription>
                Debug information from the scraping process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-60 text-sm">
                {JSON.stringify(rawData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};