import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { useInventoryAsinImages } from '@/hooks/useInventoryAsinImages';
import { Download, Upload, Image as ImageIcon, Package, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function InventoryAsinManager() {
  const {
    inventoryAsinItems,
    missingAsinItems,
    coveredAsinItems,
    isLoading,
    bulkUploadImages,
    exportMissingAsins,
    uploadProgress,
    isProcessing
  } = useInventoryAsinImages();

  const [bulkImageData, setBulkImageData] = useState('');
  const [missingCurrentPage, setMissingCurrentPage] = useState(1);
  const [coveredCurrentPage, setCoveredCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const handleBulkImageUpload = async () => {
    if (!bulkImageData.trim()) {
      toast({
        title: "No Data",
        description: "Please paste your ASIN-URL pairs first",
        variant: "destructive"
      });
      return;
    }

    const lines = bulkImageData.trim().split('\n');
    const asinImagePairs: Array<{ asin: string; imageUrl: string }> = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      let asin = '';
      let imageUrl = '';

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
      }

      if (asin && imageUrl) {
        try {
          new URL(imageUrl);
          asinImagePairs.push({ asin, imageUrl });
        } catch {
          // Invalid URL, skip
        }
      }
    }

    if (asinImagePairs.length === 0) {
      toast({
        title: "Invalid Data",
        description: "No valid ASIN-URL pairs found",
        variant: "destructive"
      });
      return;
    }

    await bulkUploadImages(asinImagePairs);
    setBulkImageData('');
  };

  // Pagination logic
  const getMissingPaginatedItems = () => {
    const startIndex = (missingCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return missingAsinItems.slice(startIndex, endIndex);
  };

  const getCoveredPaginatedItems = () => {
    const startIndex = (coveredCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return coveredAsinItems.slice(startIndex, endIndex);
  };

  const missingTotalPages = Math.ceil(missingAsinItems.length / itemsPerPage);
  const coveredTotalPages = Math.ceil(coveredAsinItems.length / itemsPerPage);

  const renderPagination = (currentPage: number, totalPages: number, onPageChange: (page: number) => void) => {
    if (totalPages <= 1) return null;

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={() => onPageChange(page)}
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext 
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory ASINs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryAsinItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Unique ASINs in inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Images</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{missingAsinItems.length}</div>
            <p className="text-xs text-muted-foreground">
              ASINs without product images
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Images Available</CardTitle>
            <ImageIcon className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{coveredAsinItems.length}</div>
            <p className="text-xs text-muted-foreground">
              ASINs with product images
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Upload Section */}
      {missingAsinItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Image Upload for Missing ASINs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={exportMissingAsins}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Missing ASINs
              </Button>
            </div>

            <Textarea
              placeholder="Paste your ASIN-URL pairs here:
B07XYZ123,https://example.com/image1.jpg
B08ABC456|https://example.com/image2.jpg
B09DEF789 https://example.com/image3.jpg"
              value={bulkImageData}
              onChange={(e) => setBulkImageData(e.target.value)}
              className="h-32"
            />

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    Processing {uploadProgress.currentAsin ? `ASIN: ${uploadProgress.currentAsin}` : 'images...'}
                  </span>
                  <span>{Math.round((uploadProgress.processed / uploadProgress.total) * 100)}%</span>
                </div>
                <Progress value={(uploadProgress.processed / uploadProgress.total) * 100} />
              </div>
            )}

            <Button 
              onClick={handleBulkImageUpload}
              disabled={!bulkImageData.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? 'Processing...' : 'Upload Images'}
            </Button>
          </CardContent>
        </Card>
      )}

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
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">ASIN</th>
                    <th className="px-4 py-2 text-left">Title</th>
                    <th className="px-4 py-2 text-left">Quantity</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Image Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getMissingPaginatedItems().map((item) => (
                    <tr key={item.asin} className="border-b">
                      <td className="px-4 py-2 font-mono text-sm">{item.asin}</td>
                      <td className="px-4 py-2">{item.title || 'No title'}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline">{item.status}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="destructive">No Image</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(missingCurrentPage, missingTotalPages, setMissingCurrentPage)}
          </CardContent>
        </Card>
      )}

      {/* Covered ASINs Table */}
      {coveredAsinItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-success" />
              ASINs with Images ({coveredAsinItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">ASIN</th>
                    <th className="px-4 py-2 text-left">Title</th>
                    <th className="px-4 py-2 text-left">Quantity</th>
                    <th className="px-4 py-2 text-left">Image Preview</th>
                    <th className="px-4 py-2 text-left">Image URL</th>
                  </tr>
                </thead>
                <tbody>
                  {getCoveredPaginatedItems().map((item) => (
                    <tr key={item.asin} className="border-b">
                      <td className="px-4 py-2 font-mono text-sm">{item.asin}</td>
                      <td className="px-4 py-2">{item.title || 'No title'}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={`Image for ${item.asin}`}
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <a 
                          href={item.imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm truncate block max-w-[200px]"
                        >
                          {item.imageUrl}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(coveredCurrentPage, coveredTotalPages, setCoveredCurrentPage)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}