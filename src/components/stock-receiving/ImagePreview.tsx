import { useState } from 'react';
import { Package, X } from 'lucide-react';
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
    <div className="flex items-start gap-3">
      {/* Expanded preview - shows to the left of thumbnail */}
      {showFullOnClick && imageUrl && showFullImage && (
        <div className="relative shrink-0 w-48 h-48 rounded-lg border-2 border-primary/30 bg-background shadow-lg overflow-hidden animate-in fade-in slide-in-from-right-2 duration-200">
          <img 
            src={imageUrl} 
            alt={alt} 
            className="w-full h-full object-contain p-2" 
          />
          <button
            onClick={(e) => { e.stopPropagation(); setShowFullImage(false); }}
            className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-muted border border-border transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Thumbnail */}
      <div 
        className={cn(
          sizeClasses[size],
          'shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden',
          showFullOnClick && imageUrl && 'cursor-pointer hover:ring-2 hover:ring-primary transition-all',
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (showFullOnClick && imageUrl) setShowFullImage(!showFullImage);
        }}
      >
        {content}
      </div>
    </div>
  );
};
