import React, { useCallback, useRef, useState } from 'react';

interface ColumnResizeHandleProps {
  columnId: string;
  currentWidth: number;
  onResize: (columnId: string, newWidth: number) => void;
}

export function ColumnResizeHandle({ columnId, currentWidth, onResize }: ColumnResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      const newWidth = startWidthRef.current + deltaX;
      onResize(columnId, newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnId, currentWidth, onResize]);

  return (
    <div
      className={`
        absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-20
        hover:bg-primary/50 transition-colors duration-150
        ${isDragging ? 'bg-primary' : 'bg-transparent hover:bg-primary/30'}
      `}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Wider invisible hit area for easier grabbing */}
      <div className="absolute -left-2 -right-2 top-0 bottom-0" />
    </div>
  );
}
