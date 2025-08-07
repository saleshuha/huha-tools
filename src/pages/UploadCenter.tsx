import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Package, ShoppingCart, Upload, Plus, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const UploadCenter = () => {
  const navigate = useNavigate();

  const uploadOptions = [
    {
      title: "SKU Management",
      description: "Upload and manage SKU data with advanced column mapping",
      icon: Package,
      path: "/po-tracker",
      features: ["Bulk SKU Upload", "Column Mapping", "Multi-threaded Processing", "Duplicate Handling"],
      color: "bg-blue-500"
    },
    {
      title: "Excel Data Processing",
      description: "Upload Excel files for data mapping and processing",
      icon: FileSpreadsheet,
      path: "/excel-mapper",
      features: ["Excel Mapping", "Data Transformation", "Multi-sheet Support", "Export Options"],
      color: "bg-green-500"
    },
    {
      title: "Batch File Processing",
      description: "Process multiple files in batches with automated workflows",
      icon: FileText,
      path: "/batch",
      features: ["Batch Processing", "File Validation", "Error Handling", "Progress Tracking"],
      color: "bg-purple-500"
    },
    {
      title: "Noon Sales Data",
      description: "Upload and analyze Noon marketplace sales data",
      icon: ShoppingCart,
      path: "/noon-sales-data",
      features: ["Sales Analytics", "Revenue Tracking", "Performance Metrics", "Fee Analysis"],
      color: "bg-orange-500"
    },
    {
      title: "ZIP File Splitter",
      description: "Extract and process files from ZIP archives",
      icon: Upload,
      path: "/zip-splitter",
      features: ["ZIP Extraction", "File Organization", "Bulk Processing", "Format Support"],
      color: "bg-red-500"
    },
    {
      title: "File Merger",
      description: "Combine multiple data files into unified datasets",
      icon: Plus,
      path: "/file-merger",
      features: ["Data Merging", "Format Conversion", "Duplicate Removal", "Validation"],
      color: "bg-teal-500"
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Upload Center</h1>
        <p className="text-muted-foreground text-lg">
          Choose from various upload options to process your data efficiently
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {uploadOptions.map((option, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-300 cursor-pointer group">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${option.color} text-white`}>
                  <option.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {option.title}
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="text-sm">
                {option.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {option.features.map((feature, featureIndex) => (
                    <Badge key={featureIndex} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
                
                <Button 
                  onClick={() => navigate(option.path)}
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  variant="outline"
                >
                  Open Upload Tool
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 bg-muted/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Upload Guidelines</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-foreground mb-2">Supported File Formats</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Excel files (.xlsx, .xls)</li>
              <li>• CSV files (.csv)</li>
              <li>• ZIP archives (.zip)</li>
              <li>• Tab-separated values (.tsv)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-2">Best Practices</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Ensure headers are in the first row</li>
              <li>• Use consistent data formats</li>
              <li>• Check for duplicate entries</li>
              <li>• Verify file size limits before upload</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadCenter;