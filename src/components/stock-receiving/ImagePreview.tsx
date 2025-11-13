import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagePreviewProps {
  imageUrl?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showFullOnClick?: boolean;
}

export const ImagePreview = ({ 
  imageUrl, 
  alt = 'Product', 
  size = 'md',
  className,
  showFullOnClick = true 
}: ImagePreviewProps) => {
  const [showFullImage, setShowFullImage] = useState(false);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const content = imageUrl ? (
    <img 
      src={imageUrl} 
      alt={alt} 
      className="w-full h-full object-contain"
    />
  ) : (
    <Package className="w-1/2 h-1/2 text-muted-foreground" />
  );

  return (
    <>
      <div 
        className={cn(
          sizeClasses[size],
          'shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden',
          showFullOnClick && imageUrl && 'cursor-pointer hover:ring-2 hover:ring-primary transition-all',
          className
        )}
        onClick={() => showFullOnClick && imageUrl && setShowFullImage(true)}
      >
        {content}
      </div>

      {showFullOnClick && imageUrl && (
        <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
          <DialogContent className="max-w-4xl">
            <img src={imageUrl} alt={alt} className="w-full h-auto" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
