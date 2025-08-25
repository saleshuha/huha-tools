import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Hash, 
  FileText, 
  DollarSign, 
  BarChart, 
  QrCode,
  Zap,
  CheckCircle
} from "lucide-react";

interface QuickAddEcommerceProps {
  datasetHeaders: string[];
  onQuickAdd: (elementType: string, mapping: string) => void;
}

interface EcommerceField {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  elementType: 'text' | 'barcode' | 'qr';
  headerMatches: string[];
  barcodeOptions?: any;
  qrTemplate?: string;
}

const ecommerceFields: EcommerceField[] = [
  {
    id: 'sku',
    label: 'SKU',
    icon: Package,
    description: 'Product SKU code',
    elementType: 'text',
    headerMatches: ['sku', 'SKU', 'product_sku', 'item_sku', 'partner_sku']
  },
  {
    id: 'asin',
    label: 'ASIN',
    icon: Hash,
    description: 'Amazon ASIN code',
    elementType: 'text',
    headerMatches: ['asin', 'ASIN', 'amazon_asin']
  },
  {
    id: 'title',
    label: 'Title',
    icon: FileText,
    description: 'Product title/name',
    elementType: 'text',
    headerMatches: ['title', 'name', 'product_title', 'item_title', 'product_name', 'title_en']
  },
  {
    id: 'price',
    label: 'Price',
    icon: DollarSign,
    description: 'Product price',
    elementType: 'text',
    headerMatches: ['price', 'unit_price', 'cost', 'amount', 'invoice_price', 'base_price']
  },
  {
    id: 'sku_barcode',
    label: 'SKU Barcode',
    icon: BarChart,
    description: 'Barcode from SKU',
    elementType: 'barcode',
    headerMatches: ['sku', 'SKU', 'product_sku', 'item_sku', 'partner_sku'],
    barcodeOptions: {
      symbology: 'CODE128',
      height: 50,
      displayValue: true
    }
  },
  {
    id: 'fnsku',
    label: 'FNSKU',
    icon: Package,
    description: 'Amazon FNSKU code',
    elementType: 'text',
    headerMatches: ['fnsku', 'FNSKU', 'amazon_fnsku', 'fba_sku']
  },
  {
    id: 'fnsku_barcode',
    label: 'FNSKU Barcode',
    icon: BarChart,
    description: 'Barcode from FNSKU',
    elementType: 'barcode',
    headerMatches: ['fnsku', 'FNSKU', 'amazon_fnsku', 'fba_sku'],
    barcodeOptions: {
      symbology: 'CODE128',
      height: 50,
      displayValue: true
    }
  },
  {
    id: 'product_qr',
    label: 'Product QR',
    icon: QrCode,
    description: 'QR code to product page',
    elementType: 'qr',
    headerMatches: ['sku', 'SKU', 'asin', 'ASIN'],
    qrTemplate: 'https://amazon.com/dp/{{asin}}'
  }
];

export function QuickAddEcommerce({ datasetHeaders, onQuickAdd }: QuickAddEcommerceProps) {
  const detectMappings = () => {
    const mappings: { [key: string]: string } = {};
    
    ecommerceFields.forEach(field => {
      const matchedHeader = field.headerMatches.find(pattern => 
        datasetHeaders.some(header => 
          header.toLowerCase().includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(header.toLowerCase())
        )
      );
      
      if (matchedHeader) {
        const exactHeader = datasetHeaders.find(header =>
          header.toLowerCase().includes(matchedHeader.toLowerCase()) ||
          matchedHeader.toLowerCase().includes(header.toLowerCase())
        );
        if (exactHeader) {
          mappings[field.id] = exactHeader;
        }
      }
    });
    
    return mappings;
  };

  const detectedMappings = detectMappings();
  const availableFields = ecommerceFields.filter(field => detectedMappings[field.id]);

  if (availableFields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Quick Add E-commerce
          </CardTitle>
          <CardDescription>
            No matching columns detected for common e-commerce fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Import data with columns like SKU, ASIN, Title, Price to see quick add options
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Quick Add E-commerce
        </CardTitle>
        <CardDescription>
          One-click elements for common e-commerce fields
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {availableFields.map(field => {
            const Icon = field.icon;
            const mappedColumn = detectedMappings[field.id];
            
            return (
              <Button
                key={field.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary"
                onClick={() => onQuickAdd(field.elementType, mappedColumn)}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{field.label}</span>
                  <CheckCircle className="w-3 h-3 text-success ml-auto" />
                </div>
                <div className="w-full text-left">
                  <p className="text-xs text-muted-foreground mb-1">{field.description}</p>
                  <Badge variant="secondary" className="text-xs">
                    {mappedColumn}
                  </Badge>
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <CheckCircle className="w-3 h-3 inline mr-1" />
            {availableFields.length} field{availableFields.length !== 1 ? 's' : ''} detected and ready to add
          </p>
        </div>
      </CardContent>
    </Card>
  );
}