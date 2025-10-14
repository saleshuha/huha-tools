import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Eye, Package } from 'lucide-react';
import { useSunskyImages, ProductImage } from '@/hooks/useSunskyImages';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductPreviewCardProps {
  itemNo: string;
  title: string;
  price: number;
  stock: number;
  warehouse: string;
  leadTime: string;
  brandName?: string;
  convertedPrice?: number;
  convertedCurrency?: string;
  onViewDetails?: () => void;
  thumbnailUrl?: string | null;
  imageCount?: number;
  imagesDownloaded?: boolean;
}

export const ProductPreviewCard: React.FC<ProductPreviewCardProps> = ({
  itemNo,
  title,
  price,
  stock,
  warehouse,
  leadTime,
  brandName,
  convertedPrice,
  convertedCurrency,
  onViewDetails,
  thumbnailUrl,
  imageCount = 0,
  imagesDownloaded = false
}) => {
  const { downloadSingleImage, isDownloading } = useSunskyImages();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDownloadImages = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await downloadSingleImage(itemNo);
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden">
      <CardContent className="p-4">
        {/* Image Section */}
        <div 
          className="relative aspect-square mb-3 bg-muted rounded-md overflow-hidden"
          onClick={onViewDetails}
        >
          {imagesDownloaded && thumbnailUrl ? (
            <>
              {!imageLoaded && !imageError && (
                <Skeleton className="w-full h-full absolute inset-0" />
              )}
              <img
                src={thumbnailUrl}
                alt={title}
                className={`w-full h-full object-contain transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(true);
                }}
              />
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Image count badge */}
          {imageCount > 0 && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
            >
              {imageCount} images
            </Badge>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-mono">{itemNo}</p>
              <h3 className="text-sm font-semibold line-clamp-2 leading-tight mt-1">
                {title}
              </h3>
            </div>
          </div>

          {brandName && (
            <Badge variant="outline" className="text-xs">
              {brandName}
            </Badge>
          )}

          {/* Price & Stock */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <div className="space-y-1">
              <p className="text-lg font-bold text-primary">
                ${price}
              </p>
              {convertedPrice && (
                <p className="text-xs text-muted-foreground">
                  ≈ {convertedCurrency} {convertedPrice.toFixed(2)}
                </p>
              )}
            </div>
            <div className="text-right">
              <Badge variant={stock > 0 ? 'default' : 'secondary'} className="text-xs">
                Stock: {stock}
              </Badge>
            </div>
          </div>

          {/* Warehouse & Lead Time */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 bg-muted rounded">{warehouse}</span>
            <span className="truncate">{leadTime}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {!imagesDownloaded ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={handleDownloadImages}
                disabled={isDownloading}
              >
                <Download className="w-3 h-3 mr-1" />
                Download Images
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onViewDetails}
              >
                <Eye className="w-3 h-3 mr-1" />
                View Details
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
