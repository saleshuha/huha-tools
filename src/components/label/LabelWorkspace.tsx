import React, { useRef, useEffect, useState } from 'react';
import { useLabelDoc } from '@/contexts/LabelDocContext';
import { LabelElement } from '@/types/label';
import { mmToPx } from '@/utils/label-serializer';
import { Card } from '@/components/ui/card';

export const LabelWorkspace: React.FC = () => {
  const { document, selectedElement, selectElement, updateElement } = useLabelDoc();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!document) {
    return (
      <Card className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No label document loaded</p>
      </Card>
    );
  }

  const handleElementClick = (element: LabelElement, e: React.MouseEvent) => {
    e.stopPropagation();
    selectElement(element.id);
  };

  const handleCanvasClick = () => {
    selectElement(null);
  };

  const handleMouseDown = (element: LabelElement, e: React.MouseEvent) => {
    if (!selectedElement || selectedElement.id !== element.id) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - element.x,
      y: e.clientY - element.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newX = Math.max(0, Math.min(
      mmToPx(document.size.width) - selectedElement.width,
      e.clientX - rect.left - dragStart.x
    ));
    const newY = Math.max(0, Math.min(
      mmToPx(document.size.height) - selectedElement.height,
      e.clientY - rect.top - dragStart.y
    ));

    updateElement(selectedElement.id, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const renderElement = (element: LabelElement) => {
    const isSelected = selectedElement?.id === element.id;
    
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      cursor: 'pointer',
      border: isSelected ? '2px solid hsl(var(--primary))' : '1px solid transparent',
      transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    };

    switch (element.type) {
      case 'text':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              fontSize: element.fontSize || 12,
              fontFamily: element.fontFamily || 'Arial',
              fontWeight: element.fontWeight || 'normal',
              textAlign: element.textAlign || 'left',
              color: element.color || '#000000',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
              backgroundColor: isSelected ? 'rgba(var(--primary), 0.1)' : 'transparent',
            }}
            onClick={(e) => handleElementClick(element, e)}
            onMouseDown={(e) => handleMouseDown(element, e)}
          >
            {element.text || 'Sample Text'}
          </div>
        );

      case 'rectangle':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              backgroundColor: element.fill || 'transparent',
              border: `${element.strokeWidth || 1}px solid ${element.stroke || '#000000'}`,
              borderRadius: element.borderRadius || 0,
            }}
            onClick={(e) => handleElementClick(element, e)}
            onMouseDown={(e) => handleMouseDown(element, e)}
          />
        );

      case 'circle':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              backgroundColor: element.fill || 'transparent',
              border: `${element.strokeWidth || 1}px solid ${element.stroke || '#000000'}`,
              borderRadius: '50%',
            }}
            onClick={(e) => handleElementClick(element, e)}
            onMouseDown={(e) => handleMouseDown(element, e)}
          />
        );

      case 'barcode':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              backgroundColor: '#ffffff',
              border: '1px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontFamily: 'monospace',
            }}
            onClick={(e) => handleElementClick(element, e)}
            onMouseDown={(e) => handleMouseDown(element, e)}
          >
            ||||| {element.text || 'BARCODE'} |||||
          </div>
        );

      case 'qr':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              backgroundColor: '#ffffff',
              border: '1px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
            }}
            onClick={(e) => handleElementClick(element, e)}
            onMouseDown={(e) => handleMouseDown(element, e)}
          >
            QR
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="flex-1 p-4">
      <div className="flex flex-col items-center">
        <div
          ref={canvasRef}
          className="relative bg-white shadow-lg border-2 border-dashed border-muted-foreground/20"
          style={{
            width: mmToPx(document.size.width),
            height: mmToPx(document.size.height),
            minWidth: 200,
            minHeight: 100,
          }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {document.elements.map(renderElement)}
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          {document.size.width}mm × {document.size.height}mm
          {document.elements.length > 0 && (
            <span className="ml-4">{document.elements.length} elements</span>
          )}
        </div>
      </div>
    </Card>
  );
};