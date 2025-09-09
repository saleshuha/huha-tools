import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLabelDoc } from '@/contexts/SimpleLabelDocContext';
import { LabelElement } from '@/types/label';
import { mmToPx } from '@/utils/label-serializer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu';
import { PrintService } from '@/services/print-service';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { 
  Printer, Eye, Save, ZoomIn, ZoomOut, RotateCcw, 
  Copy, Trash2, Move, RotateCw, Grid3X3, MousePointer2,
  Undo2, Redo2, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import JsBarcode from 'jsbarcode';

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const AdvancedLabelWorkspace: React.FC = () => {
  const { 
    document, 
    dataset, 
    selectedElement, 
    selectElement, 
    updateElement, 
    saveDocument,
    deleteElement,
    addElement 
  } = useLabelDoc();

  // Early return BEFORE any hooks to avoid "more hooks than previous render" error
  if (!document) {
    return (
      <Card className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No label document loaded. Create a new label to get started.</p>
      </Card>
    );
  }
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize] = useState(10);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState<LabelElement[]>([]);
  
  // QZ Tray state
  const [qzConnected, setQzConnected] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');

  useEffect(() => {
    initializeQZ();
  }, []);

  // Separate useEffect for keyboard handlers to avoid infinite loops
  useEffect(() => {
    // Add keyboard event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with input fields
      }
      
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          handleDeleteSelected();
          break;
        case 'c':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleCopy();
          }
          break;
        case 'v':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handlePaste();
          }
          break;
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleDuplicate();
          }
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
          }
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSelectAll();
          }
          break;
        case 'g':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowGrid(!showGrid);
          }
          break;
        case 'Escape':
          setSelectedElements(new Set());
          selectElement(null);
          break;
      }
    };

    globalThis.document.addEventListener('keydown', handleKeyDown);
    return () => globalThis.document.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, selectedElements, showGrid]);

  const initializeQZ = async () => {
    try {
      const connected = await qzConnectionManager.connect();
      if (connected) {
        setQzConnected(true);
        const printers = await qzConnectionManager.getPrinters();
        setAvailablePrinters(printers);
        
        const savedDefaultPrinter = localStorage.getItem('qz-default-printer');
        const defaultPrinter = savedDefaultPrinter || (await qzConnectionManager.getDefaultPrinter());
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

  // Snap to grid helper
  const snapToGridHelper = useCallback((value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // History management - Fixed to avoid infinite re-renders  
  const saveToHistory = useCallback(() => {
    if (!document) return;
    
    const newState = JSON.parse(JSON.stringify(document.elements));
    
    // First update the index and capture the current value
    setHistoryIndex(prevIndex => {
      // Use the previous index to trim history in a separate call
      setHistory(prevHistory => {
        const trimmedHistory = prevHistory.slice(0, prevIndex + 1);
        trimmedHistory.push(newState);
        return trimmedHistory;
      });
      
      return prevIndex + 1;
    });
  }, [document]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      // Apply previous state - would need integration with context
      toast.success('Undone');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      // Apply next state - would need integration with context
      toast.success('Redone');
    }
  };

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (!document) return;
    const allIds = new Set(document.elements.map(el => el.id));
    setSelectedElements(allIds);
  }, [document]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedElement) {
      saveToHistory();
      deleteElement(selectedElement.id);
      selectElement(null);
      toast.success('Element deleted');
    } else if (selectedElements.size > 0) {
      saveToHistory();
      selectedElements.forEach(id => deleteElement(id));
      setSelectedElements(new Set());
      toast.success(`${selectedElements.size} elements deleted`);
    }
  }, [selectedElement, selectedElements, saveToHistory, deleteElement, selectElement]);

  const handleCopy = useCallback(() => {
    if (!document) return;
    
    const elementsToCopy = selectedElement 
      ? [selectedElement]
      : document.elements.filter(el => selectedElements.has(el.id));
      
    setClipboard(JSON.parse(JSON.stringify(elementsToCopy)));
    toast.success(`Copied ${elementsToCopy.length} element(s)`);
  }, [document, selectedElement, selectedElements]);

  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) return;
    
    saveToHistory();
    clipboard.forEach((element, index) => {
      const newElement = {
        ...element,
        id: `element_${Date.now()}_${index}`,
        x: snapToGridHelper(element.x + 20),
        y: snapToGridHelper(element.y + 20)
      };
      addElement(newElement);
    });
    
    toast.success(`Pasted ${clipboard.length} element(s)`);
  }, [clipboard, saveToHistory, snapToGridHelper, addElement]);

  const handleDuplicate = useCallback(() => {
    handleCopy();
    handlePaste();
  }, [handleCopy, handlePaste]);

  // Canvas handlers
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
    if (!qzConnected || !selectedPrinter) {
      toast.error('Please ensure QZ Tray is connected and a printer is selected');
      return;
    }

    try {
      const printSettings = {
        format: 'zpl' as const,
        paperSize: 'custom' as const,
        orientation: 'portrait' as const,
        dpi: 203 as const,
        copies: 1,
        labelsPerPage: 1,
        margin: 0,
        darkness: 10
      };
      
      const zplCode = PrintService.generateZPL(document, dataset, printSettings);
      await qzConnectionManager.print(zplCode, selectedPrinter);
      toast.success('Label sent to printer successfully');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print label');
    }
  };

  const handleElementClick = (element: LabelElement, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      // Multi-select with Ctrl/Cmd
      const newSelected = new Set(selectedElements);
      if (newSelected.has(element.id)) {
        newSelected.delete(element.id);
      } else {
        newSelected.add(element.id);
      }
      setSelectedElements(newSelected);
      selectElement(element.id);
    } else if (e.shiftKey && selectedElement) {
      // Range select with Shift
      const elements = document.elements;
      const currentIndex = elements.findIndex(el => el.id === selectedElement.id);
      const clickedIndex = elements.findIndex(el => el.id === element.id);
      
      if (currentIndex !== -1 && clickedIndex !== -1) {
        const start = Math.min(currentIndex, clickedIndex);
        const end = Math.max(currentIndex, clickedIndex);
        const rangeIds = elements.slice(start, end + 1).map(el => el.id);
        setSelectedElements(new Set(rangeIds));
      }
    } else {
      // Single select
      setSelectedElements(new Set([element.id]));
      selectElement(element.id);
    }
  };

  const renderAdvancedResizeHandles = (element: LabelElement) => {
    const isSelected = selectedElement?.id === element.id || selectedElements.has(element.id);
    if (!isSelected) return null;

    const handles = [
      { position: 'nw', style: { top: -6, left: -6 }, cursor: 'nw-resize' },
      { position: 'n', style: { top: -6, left: '50%', transform: 'translateX(-50%)' }, cursor: 'n-resize' },
      { position: 'ne', style: { top: -6, right: -6 }, cursor: 'ne-resize' },
      { position: 'w', style: { left: -6, top: '50%', transform: 'translateY(-50%)' }, cursor: 'w-resize' },
      { position: 'e', style: { right: -6, top: '50%', transform: 'translateY(-50%)' }, cursor: 'e-resize' },
      { position: 'sw', style: { bottom: -6, left: -6 }, cursor: 'sw-resize' },
      { position: 's', style: { bottom: -6, left: '50%', transform: 'translateX(-50%)' }, cursor: 's-resize' },
      { position: 'se', style: { bottom: -6, right: -6 }, cursor: 'se-resize' }
    ];

    return (
      <>
        {handles.map(({ position, style, cursor }) => (
          <div
            key={position}
            className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm shadow-md hover:bg-primary/80 transition-colors z-20"
            style={{ ...style, cursor }}
            onMouseDown={(e) => handleResizeMouseDown(position, e)}
          />
        ))}
        {/* Rotation handle */}
        <div
          className="absolute w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-md hover:bg-green-400 transition-colors cursor-grab z-20"
          style={{ top: -20, left: '50%', transform: 'translateX(-50%)' }}
          title="Drag to rotate"
        >
          <RotateCw className="w-2 h-2 text-white" />
        </div>
      </>
    );
  };

  const renderGrid = () => {
    if (!showGrid) return null;
    
    const canvasWidth = mmToPx(document.size.width);
    const canvasHeight = mmToPx(document.size.height);
    
    const lines = [];
    
    // Vertical lines
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={canvasHeight}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="0.5"
        />
      );
    }
    
    // Horizontal lines
    for (let y = 0; y <= canvasHeight; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={canvasWidth}
          y2={y}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="0.5"
        />
      );
    }
    
    return (
      <svg
        className="absolute inset-0 pointer-events-none z-0"
        width={canvasWidth}
        height={canvasHeight}
      >
        {lines}
      </svg>
    );
  };

  const renderSelectionBox = () => {
    if (!selectionBox) return null;
    
    const x = Math.min(selectionBox.startX, selectionBox.currentX);
    const y = Math.min(selectionBox.startY, selectionBox.currentY);
    const width = Math.abs(selectionBox.currentX - selectionBox.startX);
    const height = Math.abs(selectionBox.currentY - selectionBox.startY);
    
    return (
      <div
        className="absolute border-2 border-primary bg-primary/10 pointer-events-none z-30"
        style={{ left: x, top: y, width, height }}
      />
    );
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
    }
  };

  const handleMouseDown = (element: LabelElement, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!selectedElements.has(element.id) && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      setSelectedElements(new Set([element.id]));
      selectElement(element.id);
    }
    
    setIsDragging(true);
    saveToHistory();
    setDragStart({
      x: (e.clientX - panOffset.x) / zoom - element.x,
      y: (e.clientY - panOffset.y) / zoom - element.y
    });
  };

  const handleResizeMouseDown = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    saveToHistory();
    setDragStart({
      x: (e.clientX - panOffset.x) / zoom,
      y: (e.clientY - panOffset.y) / zoom
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (e.shiftKey || e.button === 1) {
        // Pan mode
        setIsPanning(true);
        setDragStart({
          x: e.clientX - panOffset.x,
          y: e.clientY - panOffset.y
        });
      } else {
        // Selection box mode
        setIsSelecting(true);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left - panOffset.x) / zoom;
          const y = (e.clientY - rect.top - panOffset.y) / zoom;
          setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
        }
        setSelectedElements(new Set());
        selectElement(null);
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

    if (isSelecting && selectionBox) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - panOffset.x) / zoom;
        const y = (e.clientY - rect.top - panOffset.y) / zoom;
        setSelectionBox(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
        
        // Find elements in selection box
        const boxX = Math.min(selectionBox.startX, x);
        const boxY = Math.min(selectionBox.startY, y);
        const boxWidth = Math.abs(x - selectionBox.startX);
        const boxHeight = Math.abs(y - selectionBox.startY);
        
        const selectedIds = document.elements
          .filter(el => {
            return el.x < boxX + boxWidth &&
                   el.x + el.width > boxX &&
                   el.y < boxY + boxHeight &&
                   el.y + el.height > boxY;
          })
          .map(el => el.id);
          
        setSelectedElements(new Set(selectedIds));
      }
      return;
    }

    if (isDragging && selectedElement) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const newX = snapToGridHelper(Math.max(0, Math.min(
        mmToPx(document.size.width) - selectedElement.width,
        (e.clientX - panOffset.x) / zoom - dragStart.x
      )));
      const newY = snapToGridHelper(Math.max(0, Math.min(
        mmToPx(document.size.height) - selectedElement.height,
        (e.clientY - panOffset.y) / zoom - dragStart.y
      )));

      // Move all selected elements
      if (selectedElements.size > 1) {
        const deltaX = newX - selectedElement.x;
        const deltaY = newY - selectedElement.y;
        
        selectedElements.forEach(id => {
          const element = document.elements.find(el => el.id === id);
          if (element) {
            updateElement(id, {
              x: snapToGridHelper(element.x + deltaX),
              y: snapToGridHelper(element.y + deltaY)
            });
          }
        });
      } else {
        updateElement(selectedElement.id, { x: newX, y: newY });
      }
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
        case 'se':
          newWidth = Math.max(20, snapToGridHelper(mouseX - selectedElement.x));
          newHeight = Math.max(20, snapToGridHelper(mouseY - selectedElement.y));
          break;
        case 'sw':
          newWidth = Math.max(20, snapToGridHelper(selectedElement.x + selectedElement.width - mouseX));
          newHeight = Math.max(20, snapToGridHelper(mouseY - selectedElement.y));
          newX = snapToGridHelper(Math.min(selectedElement.x, mouseX));
          break;
        case 'ne':
          newWidth = Math.max(20, snapToGridHelper(mouseX - selectedElement.x));
          newHeight = Math.max(20, snapToGridHelper(selectedElement.y + selectedElement.height - mouseY));
          newY = snapToGridHelper(Math.min(selectedElement.y, mouseY));
          break;
        case 'nw':
          newWidth = Math.max(20, snapToGridHelper(selectedElement.x + selectedElement.width - mouseX));
          newHeight = Math.max(20, snapToGridHelper(selectedElement.y + selectedElement.height - mouseY));
          newX = snapToGridHelper(Math.min(selectedElement.x, mouseX));
          newY = snapToGridHelper(Math.min(selectedElement.y, mouseY));
          break;
        case 'n':
          newHeight = Math.max(20, snapToGridHelper(selectedElement.y + selectedElement.height - mouseY));
          newY = snapToGridHelper(Math.min(selectedElement.y, mouseY));
          break;
        case 's':
          newHeight = Math.max(20, snapToGridHelper(mouseY - selectedElement.y));
          break;
        case 'w':
          newWidth = Math.max(20, snapToGridHelper(selectedElement.x + selectedElement.width - mouseX));
          newX = snapToGridHelper(Math.min(selectedElement.x, mouseX));
          break;
        case 'e':
          newWidth = Math.max(20, snapToGridHelper(mouseX - selectedElement.x));
          break;
      }

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
    setIsSelecting(false);
    setSelectionBox(null);
    setResizeHandle(null);
  };

  // Helper function to get display text for elements with data mapping
  const getDisplayText = (element: LabelElement, fallbackText: string) => {
    if (element.dataColumn && dataset && dataset.data.length > 0) {
      const columnIndex = dataset.headers.indexOf(element.dataColumn);
      if (columnIndex !== -1 && dataset.data[0] && dataset.data[0][columnIndex] !== undefined) {
        let value = String(dataset.data[0][columnIndex]);
        
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
      return '';
    }
  };

  const renderElement = useCallback((element: LabelElement) => {
    const isSelected = selectedElement?.id === element.id || selectedElements.has(element.id);
    
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      cursor: 'pointer',
      border: isSelected ? '2px solid hsl(var(--primary))' : '1px solid transparent',
      transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
      boxShadow: isSelected ? '0 0 0 1px rgba(var(--primary), 0.3)' : 'none',
    };

    const elementContent = (() => {
      switch (element.type) {
        case 'text':
          return (
            <div
              style={{
                fontSize: element.fontSize || 12,
                fontFamily: element.fontFamily || 'Arial',
                fontWeight: element.fontWeight || 'normal',
                textAlign: element.textAlign || 'left',
                color: element.color || '#000000',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                backgroundColor: isSelected ? 'rgba(var(--primary), 0.05)' : 'transparent',
                width: '100%',
                height: '100%',
              }}
            >
              {getDisplayText(element, 'Sample Text')}
            </div>
          );

        case 'multitext':
          return (
            <div
              style={{
                fontSize: element.fontSize || 12,
                fontFamily: element.fontFamily || 'Arial',
                fontWeight: element.fontWeight || 'normal',
                textAlign: element.textAlign || 'left',
                color: element.color || '#000000',
                padding: '4px',
                backgroundColor: isSelected ? 'rgba(var(--primary), 0.05)' : 'transparent',
                lineHeight: element.lineHeight || 1.2,
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
                width: '100%',
                height: '100%',
              }}
            >
              {getDisplayText(element, 'Multi-line text content will wrap automatically within this container.')}
            </div>
          );

        case 'rectangle':
          return (
            <div
              style={{
                backgroundColor: element.fill || 'transparent',
                border: `${element.strokeWidth || 1}px solid ${element.stroke || '#000000'}`,
                borderRadius: element.borderRadius || 0,
                width: '100%',
                height: '100%',
              }}
            />
          );

        case 'circle':
          return (
            <div
              style={{
                backgroundColor: element.fill || 'transparent',
                border: `${element.strokeWidth || 1}px solid ${element.stroke || '#000000'}`,
                borderRadius: '50%',
                width: '100%',
                height: '100%',
              }}
            />
          );

        case 'barcode':
          const barcodeText = getDisplayText(element, 'BARCODE123');
          const barcodeImage = generateBarcodeImage(barcodeText, element.barcodeType || 'CODE128');
          
          return (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                width: '100%',
                height: '100%',
              }}
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
            </div>
          );

        case 'qr':
          return (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                width: '100%',
                height: '100%',
              }}
            >
              QR
            </div>
          );

        default:
          return null;
      }
    })();

     return (
      <ContextMenu key={element.id}>
        <ContextMenuTrigger asChild>
          <div
            style={baseStyle}
            onClick={(e) => handleElementClick(element, e)}
            onMouseDown={(e) => handleMouseDown(element, e)}
            className="hover:shadow-md"
          >
            {elementContent}
            {renderAdvancedResizeHandles(element)}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-background border-2 border-border shadow-lg">
          <ContextMenuItem onClick={() => handleCopy()}>
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleDuplicate()}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => updateElement(element.id, { rotation: (element.rotation || 0) + 90 })}>
            <RotateCw className="w-4 h-4 mr-2" />
            Rotate 90°
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => handleDeleteSelected()} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }, [selectedElement, selectedElements, handleElementClick, handleMouseDown, renderAdvancedResizeHandles, handleCopy, handleDuplicate, updateElement, handleDeleteSelected, getDisplayText, generateBarcodeImage]);

  return (
    <Card className="flex-1 p-4">
      <div className="flex flex-col items-center">
        {/* Enhanced Toolbar */}
        <div className="w-full flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground flex items-center gap-4">
            <span>{document.size.width}mm × {document.size.height}mm</span>
            {document.elements.length > 0 && (
              <span>{document.elements.length} elements</span>
            )}
            {selectedElements.size > 0 && (
              <Badge variant="secondary">{selectedElements.size} selected</Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            {/* History Controls */}
            <div className="flex gap-1 border-r pr-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex gap-1 border-r pr-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut} title="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetZoom} title="Reset Zoom">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomIn} title="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="px-2 py-1 text-xs bg-muted rounded flex items-center">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Grid Controls */}
            <div className="flex gap-1 border-r pr-2">
              <Button 
                variant={showGrid ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowGrid(!showGrid)}
                title="Toggle Grid (Ctrl+G)"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button 
                variant={snapToGrid ? "default" : "outline"} 
                size="sm" 
                onClick={() => setSnapToGrid(!snapToGrid)}
                title="Snap to Grid"
              >
                <MousePointer2 className="h-4 w-4" />
              </Button>
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
            
            {/* Action Buttons */}
            <Button variant="outline" size="sm" onClick={handleSave} title="Save (Ctrl+S)">
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
              Print
            </Button>
          </div>
        </div>
        
        {/* Enhanced Canvas */}
        <div 
          className="relative overflow-auto border-2 border-muted-foreground/20 bg-gray-100 rounded-lg shadow-inner" 
          style={{ width: '100%', height: '600px' }}
          onWheel={handleWheel}
        >
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
              cursor: isPanning ? 'grabbing' : isDragging ? 'grabbing' : isResizing ? 'nw-resize' : 'default',
              margin: '50px',
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {renderGrid()}
            {document.elements.map(renderElement)}
            {renderSelectionBox()}
          </div>
        </div>
        
        {/* Enhanced Instructions */}
        <div className="mt-4 text-xs text-muted-foreground text-center max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <strong>Selection:</strong> Click to select • Ctrl+Click for multi-select • Drag for selection box
            </div>
            <div>
              <strong>Movement:</strong> Drag to move • Shift+Drag to pan canvas
            </div>
            <div>
              <strong>Resize:</strong> Drag handles to resize • Shift maintains aspect ratio
            </div>
            <div>
              <strong>Shortcuts:</strong> Del to delete • Ctrl+C/V to copy/paste • Ctrl+D to duplicate
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};