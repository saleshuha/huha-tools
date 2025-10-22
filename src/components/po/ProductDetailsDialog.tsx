import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSunskyImages, ProductImage } from '@/hooks/useSunskyImages';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Package, ZoomIn } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ExtendedProductImage extends ProductImage {
  publicUrl: string | null;
}

interface ProductDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    itemNo: string;
    title: string;
    price: number;
    stock: number;
    warehouse: string;
    leadTime: string;
    brandName?: string;
    convertedPrice?: number;
    convertedCurrency?: string;
    imageCount?: number;
  } | null;
}

export const ProductDetailsDialog: React.FC<ProductDetailsDialogProps> = ({
  open,
  onOpenChange,
  product,
}) => {
  const { getProductImages } = useSunskyImages();
  const [images, setImages] = useState<ExtendedProductImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (open && product?.itemNo) {
      loadImages();
    } else {
      setImages([]);
      setCurrentImageIndex(0);
    }
  }, [open, product?.itemNo]);

  const loadImages = async () => {
    if (!product?.itemNo) return;
    
    setIsLoadingImages(true);
    try {
      const productImages = await getProductImages(product.itemNo);
      console.log('[ProductDetails] Loaded images:', productImages);
      
      // Get public URLs for images with storage_path
      const imagesWithUrls = productImages.map(img => ({
        ...img,
        publicUrl: img.storage_path 
          ? supabase.storage.from('product-images').getPublicUrl(img.storage_path).data.publicUrl
          : null
      }));
      
      setImages(imagesWithUrls);
      setCurrentImageIndex(0);
    } catch (error) {
      console.error('[ProductDetails] Error loading images:', error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setImageLoaded(false);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setImageLoaded(false);
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index);
    setImageLoaded(false);
  };

  if (!product) return null;

  const currentImage = images[currentImageIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left: Image Gallery */}
          <div className="space-y-4">
            {/* Main Image Display */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square bg-muted">
                  {isLoadingImages ? (
                    <Skeleton className="w-full h-full" />
                  ) : images.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Package className="w-16 h-16 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">No images available</span>
                    </div>
                  ) : (
                    <>
                      {!imageLoaded && (
                        <Skeleton className="w-full h-full absolute inset-0" />
                      )}
                      <img
                        src={currentImage?.publicUrl || ''}
                        alt={`${product.title} - Image ${currentImageIndex + 1}`}
                        className={`w-full h-full object-contain transition-opacity duration-300 ${
                          imageLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageLoaded(true)}
                      />
                      
                      {/* Image Navigation */}
                      {images.length > 1 && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                            onClick={handlePreviousImage}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                            onClick={handleNextImage}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                          
                          {/* Image Counter */}
                          <Badge className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm">
                            {currentImageIndex + 1} / {images.length}
                          </Badge>
                        </>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => handleThumbnailClick(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-primary scale-105'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={img.publicUrl || ''}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Information */}
          <div className="space-y-6">
            {/* Item Number */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Item Number</p>
              <p className="text-lg font-mono font-semibold">{product.itemNo}</p>
            </div>

            {/* Title */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Product Title</p>
              <h3 className="text-base font-semibold leading-tight">{product.title}</h3>
            </div>

            {/* Brand */}
            {product.brandName && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Brand</p>
                <Badge variant="outline">{product.brandName}</Badge>
              </div>
            )}

            {/* Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Price (USD)</p>
                <p className="text-2xl font-bold text-primary">${product.price}</p>
              </div>
              {product.convertedPrice && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Price ({product.convertedCurrency})
                  </p>
                  <p className="text-2xl font-bold">
                    {product.convertedCurrency} {product.convertedPrice.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Stock & Warehouse */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Stock Status</p>
                <Badge variant={product.stock > 0 ? 'default' : 'secondary'}>
                  Stock: {product.stock}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Warehouse</p>
                <Badge variant="outline">{product.warehouse}</Badge>
              </div>
            </div>

            {/* Lead Time */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Lead Time</p>
              <p className="text-sm">{product.leadTime}</p>
            </div>

            {/* Image Info */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Product Images</p>
                  <p className="text-sm font-medium">
                    {images.length > 0 ? `${images.length} images` : 'No images downloaded'}
                  </p>
                </div>
                {images.length > 0 && (
                  <Badge variant="outline" className="bg-primary/10">
                    ✓ Downloaded
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
