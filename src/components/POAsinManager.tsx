import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePOAsinImages } from '@/hooks/usePOAsinImages';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Upload, 
  Package, 
  ImageIcon, 
  AlertCircle, 
  CheckCircle2,
  FileText,
  Loader2
} from 'lucide-react';

export const POAsinManager: React.FC = () => {
  const [bulkImageData, setBulkImageData] = useState('');
  const { toast } = useToast();
  
  const {
    poAsinItems,
    missingAsinItems,
    coveredAsinItems,
    isLoading,
    uploadProgress,
    isProcessing,
    bulkUploadImages,
    exportMissingAsins
  } = usePOAsinImages();

  const handleBulkImageUpload = async () => {
    if (!bulkImageData.trim()) {
      toast({
        title: "No Data",
        description: "Please paste your ASIN/URL data first",
        variant: "destructive"
      });
      return;
    }

    const lines = bulkImageData.trim().split('\n');
    const asinImagePairs: Array<{ asin: string; imageUrl: string }> = [];
    let invalidLines = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      let asin = '';
      let imageUrl = '';

      // Support multiple formats
      if (trimmedLine.includes(',')) {
        [asin, imageUrl] = trimmedLine.split(',').map(s => s.trim());
      } else if (trimmedLine.includes('|')) {
        [asin, imageUrl] = trimmedLine.split('|').map(s => s.trim());
      } else if (trimmedLine.includes('\t')) {
        [asin, imageUrl] = trimmedLine.split('\t').map(s => s.trim());
      } else if (trimmedLine.includes(' ')) {
        const parts = trimmedLine.split(' ');
        asin = parts[0].trim();
        imageUrl = parts.slice(1).join(' ').trim();
      } else {
        invalidLines++;
        continue;
      }

      if (!asin || !imageUrl) {
        invalidLines++;
        continue;
      }

      // Validate URL format
      try {
        new URL(imageUrl);
        // Only add if ASIN exists in our PO items and is missing image
        if (missingAsinItems.some(item => item.asin === asin)) {
          asinImagePairs.push({ asin, imageUrl });
        }
      } catch {
        invalidLines++;
      }
    }

    if (asinImagePairs.length === 0) {
      toast({
        title: "No Valid Data",
        description: `No valid ASIN/URL pairs found for missing PO ASINs${invalidLines > 0 ? ` (${invalidLines} invalid lines)` : ''}`,
        variant: "destructive"
      });
      return;
    }

    await bulkUploadImages(asinImagePairs);
    setBulkImageData('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading PO ASINs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total PO ASINs</p>
                <p className="text-2xl font-bold">{poAsinItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Missing Images</p>
                <p className="text-2xl font-bold text-destructive">{missingAsinItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">With Images</p>
                <p className="text-2xl font-bold text-green-600">{coveredAsinItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Image Upload for PO ASINs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadProgress.processing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading images...</span>
                <span>{uploadProgress.current} / {uploadProgress.total}</span>
              </div>
              <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
              {uploadProgress.currentAsin && (
                <p className="text-xs text-muted-foreground">
                  Processing: {uploadProgress.currentAsin}
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="bulk-image-data" className="text-sm font-medium">
              Paste ASIN/URL Data
            </Label>
            <Textarea
              id="bulk-image-data"
              placeholder="Paste your ASIN and image URL pairs here:
B07XYZ123,https://example.com/image1.jpg
B08ABC456|https://example.com/image2.jpg
B09DEF789 https://example.com/image3.jpg"
              value={bulkImageData}
              onChange={(e) => setBulkImageData(e.target.value)}
              className="h-32 resize-none mt-2"
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Only ASINs from your PO orders that are missing images will be processed
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleBulkImageUpload}
              disabled={!bulkImageData.trim() || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Images
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={exportMissingAsins}
              disabled={missingAsinItems.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Missing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Missing ASINs Table */}
      {missingAsinItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Missing Images ({missingAsinItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ASIN</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingAsinItems.map((item) => (
                    <TableRow key={item.asin}>
                      <TableCell className="font-mono text-sm">{item.asin}</TableCell>
                      <TableCell className="max-w-48 truncate" title={item.title}>
                        {item.title}
                      </TableCell>
                      <TableCell>{item.po_number}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'pending' ? 'secondary' : 'default'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Covered ASINs Table */}
      {coveredAsinItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              ASINs with Images ({coveredAsinItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ASIN</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Image</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coveredAsinItems.map((item) => (
                    <TableRow key={item.asin}>
                      <TableCell className="font-mono text-sm">{item.asin}</TableCell>
                      <TableCell className="max-w-48 truncate" title={item.title}>
                        {item.title}
                      </TableCell>
                      <TableCell>{item.po_number}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.title}
                            className="w-8 h-8 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};