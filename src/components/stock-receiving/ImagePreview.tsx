import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  // Close on Escape
  useEffect(() => {
    if (!showFullImage) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFullImage(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showFullImage]);

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

      {/* Full-size floating preview — portaled to body, outside search results */}
      {showFullOnClick && imageUrl && showFullImage && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 animate-in fade-in duration-150"
          onClick={() => setShowFullImage(false)}
        >
          <div 
            className="relative max-w-[min(90vw,480px)] max-h-[80vh] rounded-xl border-2 border-primary/20 bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={imageUrl} 
              alt={alt} 
              className="w-full h-full object-contain p-3" 
            />
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-2 right-2 p-1 rounded-full bg-background/90 hover:bg-muted border border-border transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
