import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Download, RefreshCw, Filter, Grid3x3, List } from 'lucide-react';
import { ProductPreviewCard } from './ProductPreviewCard';
import { useSKUManager } from '@/hooks/useSKUManager';
import { useSunskyImages } from '@/hooks/useSunskyImages';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ImageGalleryTabProps {
  selectedAPI?: string;
}

export const ImageGalleryTab: React.FC<ImageGalleryTabProps> = ({ selectedAPI }) => {
  const { sunskySKUs, isLoading, refreshSKUs } = useSKUManager();
  const { downloadImages, isDownloading, downloadProgress } = useSunskyImages();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'with-images' | 'without-images'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter SKUs based on search and image status
  const filteredSKUs = sunskySKUs.filter(sku => {
    const matchesSearch = !searchTerm || 
      sku.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'with-images' && sku.images_downloaded) ||
      (filterStatus === 'without-images' && !sku.images_downloaded);

    return matchesSearch && matchesFilter;
  });

  const handleSelectAll = () => {
    if (selectedItems.size === filteredSKUs.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredSKUs.map(sku => sku.sku_code)));
    }
  };

  const handleSelectItem = (itemNo: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemNo)) {
      newSelected.delete(itemNo);
    } else {
      newSelected.add(itemNo);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkDownload = async () => {
    if (selectedItems.size === 0) return;
    
    console.log('[ImageGallery] Starting bulk download for', selectedItems.size, 'items');
    
    await downloadImages(Array.from(selectedItems), {
      apiId: selectedAPI
    });
    
    // Clear selection after download
    setSelectedItems(new Set());
    
    console.log('[ImageGallery] Download complete, refreshing SKUs');
    
    // Refresh SKU list to show updated image status
    await refreshSKUs();
    
    console.log('[ImageGallery] SKUs refreshed');
  };

  const handleDownloadVisible = async () => {
    const itemsWithoutImages = filteredSKUs
      .filter(sku => !sku.images_downloaded)
      .map(sku => sku.sku_code);
    
    if (itemsWithoutImages.length === 0) return;
    
    console.log('[ImageGallery] Downloading images for visible items:', itemsWithoutImages);
    
    await downloadImages(itemsWithoutImages, {
      apiId: selectedAPI
    });
    
    console.log('[ImageGallery] Download complete, refreshing SKUs');
    await refreshSKUs();
    console.log('[ImageGallery] SKUs refreshed');
  };

  const statsWithImages = sunskySKUs.filter(sku => sku.images_downloaded).length;
  const statsWithoutImages = sunskySKUs.length - statsWithImages;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Products</div>
            <div className="text-2xl font-bold">{sunskySKUs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">With Images</div>
            <div className="text-2xl font-bold text-primary">{statsWithImages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Without Images</div>
            <div className="text-2xl font-bold text-destructive">{statsWithoutImages}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by SKU or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="with-images">With Images</SelectItem>
            <SelectItem value="without-images">Without Images</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={refreshSKUs}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <Checkbox
            checked={selectedItems.size === filteredSKUs.length}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm font-medium">
            {selectedItems.size} selected
          </span>
          <Button
            size="sm"
            onClick={handleBulkDownload}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Images
          </Button>
        </div>
      )}

      {/* Quick Action */}
      {statsWithoutImages > 0 && selectedItems.size === 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Download missing images</p>
                <p className="text-sm text-muted-foreground">
                  {statsWithoutImages} products don't have images yet
                </p>
              </div>
              <Button onClick={handleDownloadVisible} disabled={isDownloading}>
                <Download className="w-4 h-4 mr-2" />
                Download All Visible
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download Progress */}
      {isDownloading && downloadProgress.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Downloading images...</span>
                <span className="text-sm text-muted-foreground">
                  {Array.from(downloadProgress.values()).filter(p => p === 100).length} / {downloadProgress.size}
                </span>
              </div>
              <Progress 
                value={(Array.from(downloadProgress.values()).filter(p => p === 100).length / downloadProgress.size) * 100} 
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Grid/List */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-4'}>
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="aspect-square mb-3" />
                <Skeleton className="h-4 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSKUs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchTerm ? 'No products match your search' : 'No products found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-4'}>
          {filteredSKUs.map((sku) => (
            <div key={sku.id} className="relative">
              {viewMode === 'grid' && (
                <Checkbox
                  className="absolute top-2 left-2 z-10 bg-background"
                  checked={selectedItems.has(sku.sku_code)}
                  onCheckedChange={() => handleSelectItem(sku.sku_code)}
                />
              )}
              <ProductPreviewCard
                itemNo={sku.sku_code}
                title={sku.title || sku.sku_code}
                price={Number(sku.cost) || 0}
                stock={0}
                warehouse={sku.country || 'Unknown'}
                leadTime="N/A"
                brandName={undefined}
                convertedPrice={Number(sku.cost) || 0}
                convertedCurrency={sku.currency}
                thumbnailUrl={sku.thumbnail_url || null}
                imageCount={sku.image_count || 0}
                imagesDownloaded={sku.images_downloaded || false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
