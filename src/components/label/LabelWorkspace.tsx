import React, { useRef, useEffect, useState } from 'react';
import { useLabelDoc } from '@/contexts/SimpleLabelDocContext';
import { LabelElement } from '@/types/label';
import { mmToPx } from '@/utils/label-serializer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PrintService } from '@/services/print-service';
import QZTrayPrinter from '@/utils/qz-tray-printer';
import { Printer, Eye, Save, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import JsBarcode from 'jsbarcode';

export const LabelWorkspace: React.FC = () => {
  const { document, dataset, selectedElement, selectElement, updateElement, saveDocument } = useLabelDoc();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // QZ Tray state
  const [qzConnected, setQzConnected] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');

  useEffect(() => {
    initializeQZ();
  }, []);

  const initializeQZ = async () => {
    try {
      const connected = await QZTrayPrinter.connect();
      if (connected) {
        setQzConnected(true);
        const printers = await QZTrayPrinter.getPrinters();
        setAvailablePrinters(printers);
        
        // Set default printer
        const defaultPrinter = await QZTrayPrinter.getDefaultPrinter();
        if (defaultPrinter) {
          setSelectedPrinter(defaultPrinter);
        } else if (printers.length > 0) {
          setSelectedPrinter(printers[0]);
        }
        
        toast.success('QZ Tray connected successfully');
      }
    } catch (error) {
      console.error('Failed to connect to QZ Tray:', error);
      toast.error('Failed to connect to QZ Tray. Please ensure it is running.');
    }
  };

  const handleSave = async () => {
    await saveDocument();
  };

  const handlePreview = async () => {
    if (!document) return;
    const html = PrintService.generateHTMLPreview(document, dataset);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  const handlePrint = async () => {
    if (!document || !qzConnected || !selectedPrinter) {
      toast.error('Please ensure QZ Tray is connected and a printer is selected');
      return;
    }

    try {
      // Generate ZPL code for the label
      const printSettings = {
        format: 'zpl' as const,
        paperSize: 'custom' as const,
        orientation: 'portrait' as const,
        dpi: 203 as const,
        copies: 1,
        labelsPerPage: 1,
        margin: 0,
        darkness: 10 // Default Zebra print darkness
      };
      
      const zplCode = PrintService.generateZPL(document, dataset, printSettings);
      
      // Print directly to selected printer
      await QZTrayPrinter.printZPL(zplCode, { 
        printerName: selectedPrinter 
      });
      
      toast.success('Label sent to printer successfully');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print label');
    }
  };

  if (!document) {
    return (
      <Card className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No label document loaded. Create a new label to get started.</p>
      </Card>
    );
  }

  const handleElementClick = (element: LabelElement, e: React.MouseEvent) => {
    e.stopPropagation();
    selectElement(element.id);
  };

  const renderResizeHandles = (element: LabelElement) => {
    if (!selectedElement || selectedElement.id !== element.id) return null;

    const handles = [
      { position: 'nw', style: { top: -4, left: -4 } },
      { position: 'ne', style: { top: -4, right: -4 } },
      { position: 'sw', style: { bottom: -4, left: -4 } },
      { position: 'se', style: { bottom: -4, right: -4 } }
    ];

    return handles.map(({ position, style }) => (
      <div
        key={position}
        className="absolute w-2 h-2 bg-primary border-2 border-white cursor-nw-resize z-10"
        style={{
          ...style,
          cursor: position === 'nw' || position === 'se' ? 'nw-resize' : 'ne-resize'
        }}
        onMouseDown={(e) => handleResizeMouseDown(position, e)}
      />
    ));
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
    }
  };

  const handleMouseDown = (element: LabelElement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedElement || selectedElement.id !== element.id) {
      selectElement(element.id);
      return;
    }
    
    setIsDragging(true);
    setDragStart({
      x: (e.clientX - panOffset.x) / zoom - element.x,
      y: (e.clientY - panOffset.y) / zoom - element.y
    });
  };

  const handleResizeMouseDown = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart({
      x: (e.clientX - panOffset.x) / zoom,
      y: (e.clientY - panOffset.y) / zoom
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectElement(null);
      
      if (e.shiftKey || e.button === 1) { // Shift+click or middle mouse for panning
        setIsPanning(true);
        setDragStart({
          x: e.clientX - panOffset.x,
          y: e.clientY - panOffset.y
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    if (isDragging && selectedElement) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const newX = Math.max(0, Math.min(
        mmToPx(document.size.width) - selectedElement.width,
        (e.clientX - panOffset.x) / zoom - dragStart.x
      ));
      const newY = Math.max(0, Math.min(
        mmToPx(document.size.height) - selectedElement.height,
        (e.clientY - panOffset.y) / zoom - dragStart.y
      ));

      updateElement(selectedElement.id, { x: newX, y: newY });
    }

    if (isResizing && selectedElement && resizeHandle) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = (e.clientX - panOffset.x) / zoom;
      const mouseY = (e.clientY - panOffset.y) / zoom;
      
      let newWidth = selectedElement.width;
      let newHeight = selectedElement.height;
      let newX = selectedElement.x;
      let newY = selectedElement.y;

      switch (resizeHandle) {
        case 'se': // bottom-right
          newWidth = Math.max(20, mouseX - selectedElement.x);
          newHeight = Math.max(20, mouseY - selectedElement.y);
          break;
        case 'sw': // bottom-left
          newWidth = Math.max(20, selectedElement.x + selectedElement.width - mouseX);
          newHeight = Math.max(20, mouseY - selectedElement.y);
          newX = Math.min(selectedElement.x, mouseX);
          break;
        case 'ne': // top-right
          newWidth = Math.max(20, mouseX - selectedElement.x);
          newHeight = Math.max(20, selectedElement.y + selectedElement.height - mouseY);
          newY = Math.min(selectedElement.y, mouseY);
          break;
        case 'nw': // top-left
          newWidth = Math.max(20, selectedElement.x + selectedElement.width - mouseX);
          newHeight = Math.max(20, selectedElement.y + selectedElement.height - mouseY);
          newX = Math.min(selectedElement.x, mouseX);
          newY = Math.min(selectedElement.y, mouseY);
          break;
      }

      // Constrain to canvas bounds
      newWidth = Math.min(newWidth, mmToPx(document.size.width) - newX);
      newHeight = Math.min(newHeight, mmToPx(document.size.height) - newY);

      updateElement(selectedElement.id, { 
        x: newX, 
        y: newY, 
        width: newWidth, 
        height: newHeight 
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setIsPanning(false);
    setResizeHandle(null);
  };

  // Helper function to get display text for elements with data mapping
  const getDisplayText = (element: LabelElement, fallbackText: string) => {
    if (element.dataColumn && dataset && dataset.data.length > 0) {
      const columnIndex = dataset.headers.indexOf(element.dataColumn);
      if (columnIndex !== -1 && dataset.data[0] && dataset.data[0][columnIndex] !== undefined) {
        let value = String(dataset.data[0][columnIndex]);
        
        // Apply transformations
        if (element.dataTransform) {
          if (element.dataTransform.prefix) {
            value = element.dataTransform.prefix + value;
          }
          if (element.dataTransform.suffix) {
            value = value + element.dataTransform.suffix;
          }
          if (element.dataTransform.uppercase) {
            value = value.toUpperCase();
          }
          if (element.dataTransform.truncate && element.dataTransform.truncate > 0) {
            value = value.substring(0, element.dataTransform.truncate);
          }
        }
        
        return value;
      }
    }
    return element.text || fallbackText;
  };

  // Helper function to generate barcode image
  const generateBarcodeImage = (text: string, barcodeType: string = 'CODE128'): string => {
    try {
      const canvas = globalThis.document.createElement('canvas');
      JsBarcode(canvas, text, {
        format: barcodeType,
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 12,
        margin: 0,
      });
      return canvas.toDataURL();
    } catch (error) {
      console.error('Error generating barcode:', error);
      // Return a fallback image or empty string
      return '';
    }
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
            {getDisplayText(element, 'Sample Text')}
            {renderResizeHandles(element)}
          </div>
        );

      case 'multitext':
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
              padding: '4px',
              backgroundColor: isSelected ? 'rgba(var(--primary), 0.1)' : 'transparent',
              lineHeight: element.lineHeight || 1.2,
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
              display: 'block',
            }}
            onClick={(e) => handleElementClick(element, e)}
            onMouseDown={(e) => handleMouseDown(element, e)}
          >
            {getDisplayText(element, 'Multi-line text content will wrap automatically within this container to show all content across multiple lines.')}
            {renderResizeHandles(element)}
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
          >
            {renderResizeHandles(element)}
          </div>
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
          >
            {renderResizeHandles(element)}
          </div>
        );

      case 'barcode':
        const barcodeText = getDisplayText(element, 'BARCODE123');
        const barcodeImage = generateBarcodeImage(barcodeText, element.barcodeType || 'CODE128');
        
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
              padding: '2px',
            }}
            onClick={(e) => handleElementClick(element, e)}
            onMouseDown={(e) => handleMouseDown(element, e)}
          >
            {barcodeImage ? (
              <img 
                src={barcodeImage} 
                alt={barcodeText}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#666' }}>
                BARCODE: {barcodeText}
              </span>
            )}
            {renderResizeHandles(element)}
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
            {renderResizeHandles(element)}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="flex-1 p-4">
      <div className="flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            {document.size.width}mm × {document.size.height}mm
            {document.elements.length > 0 && (
              <span className="ml-4">{document.elements.length} elements</span>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 border-r pr-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetZoom}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="px-2 py-1 text-xs bg-muted rounded flex items-center">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            
            {/* QZ Tray Status and Printer Selection */}
            {qzConnected && availablePrinters.length > 0 && (
              <div className="flex items-center gap-2 border-r pr-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs">
                  QZ Connected
                </Badge>
                <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                  <SelectTrigger className="w-32 h-7 text-xs">
                    <SelectValue placeholder="Select printer" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrinters.map(printer => (
                      <SelectItem key={printer} value={printer} className="text-xs">
                        {printer.length > 20 ? `${printer.substring(0, 20)}...` : printer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handlePrint}
              disabled={!qzConnected || !selectedPrinter}
            >
              <Printer className="h-4 w-4 mr-2" />
              Direct Print
            </Button>
          </div>
        </div>
        
        <div className="relative overflow-auto border-2 border-muted-foreground/20 bg-gray-100 rounded-lg" 
             style={{ width: '100%', height: '500px' }}
             onWheel={handleWheel}>
          <div
            ref={canvasRef}
            className="relative bg-white shadow-lg"
            style={{
              width: mmToPx(document.size.width),
              height: mmToPx(document.size.height),
              minWidth: 200,
              minHeight: 100,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              cursor: isPanning ? 'grabbing' : isDragging ? 'grabbing' : isResizing ? 'nw-resize' : 'default'
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {document.elements.map(renderElement)}
          </div>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Shift+drag to pan • Ctrl+scroll to zoom • Click elements to select and resize
        </div>
      </div>
    </Card>
  );
};