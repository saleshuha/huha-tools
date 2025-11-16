import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { LabelDoc, LabelElement, LabelDataset, LabelSize, LabelDomain } from '@/types/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LabelDocContextType {
  document: LabelDoc | null;
  dataset: LabelDataset | null;
  selectedElement: LabelElement | null;
  isLoading: boolean;
  previewIndex: number;
  
  // Document operations
  createDocument: (name: string, size: LabelSize, domain?: LabelDomain) => Promise<void>;
  loadDocument: (id: string) => Promise<void>;
  saveDocument: () => Promise<void>;
  loadUserDocuments: () => Promise<any[]>;
  deleteDocument: (id: string) => Promise<void>;
  
  // Dataset operations
  loadDataset: (id: string) => Promise<void>;
  setDataset: (dataset: LabelDataset) => void;
  setPreviewIndex: (index: number) => void;
  
  // Element operations
  addElement: (element: Omit<LabelElement, 'id'>) => void;
  updateElement: (id: string, updates: Partial<LabelElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  
  // Canvas operations
  updateCanvasSize: (size: LabelSize) => void;
  
  // Alignment operations
  alignElements: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeElements: (direction: 'horizontal' | 'vertical') => void;
}

const LabelDocContext = createContext<LabelDocContextType | null>(null);

export const useLabelDoc = () => {
  const context = useContext(LabelDocContext);
  if (!context) {
    console.error('useLabelDoc called outside provider - context is null');
    throw new Error('useLabelDoc must be used within a LabelDocProvider');
  }
  return context;
};

export const SimpleLabelDocProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core state
  const [document, setDocument] = useState<LabelDoc | null>(null);
  const [dataset, setDataset] = useState<LabelDataset | null>(null);
  const [selectedElement, setSelectedElement] = useState<LabelElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Reset previewIndex when dataset changes
  useEffect(() => {
    setPreviewIndex(0);
  }, [dataset?.id]);

  const createDocument = useCallback(async (name: string, size: LabelSize, domain: LabelDomain = 'inventory') => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('label_templates')
        .insert({
          name,
          width: size.width,
          height: size.height,
          canvas_data: { 
            elements: [],
            meta: { domain, datasetId: null }
          } as any,
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      
      const newDoc: LabelDoc = {
        id: (data as any)?.id,
        name: (data as any)?.name,
        size: {
          width: (data as any)?.width,
          height: (data as any)?.height,
          unit: 'mm'
        },
        elements: [],
        domain,
        createdAt: (data as any)?.created_at,
        updatedAt: (data as any)?.updated_at,
      };
      
      setDocument(newDoc);
      toast.success('Label created successfully');
    } catch (error) {
      console.error('Create document error:', error);
      toast.error('Failed to create label');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDocument = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('label_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      const canvasData = (data as any)?.canvas_data as any;
      const meta = canvasData?.meta || {};
      
      const doc: LabelDoc = {
        id: (data as any)?.id,
        name: (data as any)?.name,
        size: {
          width: (data as any)?.width || 100,
          height: (data as any)?.height || 50,
          unit: 'mm'
        },
        elements: Array.isArray(canvasData?.elements) ? 
          canvasData.elements.map((el: any) => ({
            id: el.id || crypto.randomUUID(),
            type: el.type || 'text',
            x: Number(el.x) || 0,
            y: Number(el.y) || 0,
            width: Number(el.width) || 100,
            height: Number(el.height) || 20,
            rotation: Number(el.rotation) || 0,
            text: el.text || '',
            fontSize: Number(el.fontSize) || 12,
            fontFamily: el.fontFamily || 'Arial',
            fontWeight: el.fontWeight || 'normal',
            textAlign: el.textAlign || 'left',
            color: el.color || '#000000',
            lineHeight: Number(el.lineHeight) || 1.2,
            maxLines: Number(el.maxLines) || undefined,
            wordWrap: Boolean(el.wordWrap),
            fill: el.fill || 'transparent',
            stroke: el.stroke || '#000000',
            strokeWidth: Number(el.strokeWidth) || 1,
            borderRadius: Number(el.borderRadius) || 0,
            barcodeType: el.barcodeType || 'CODE128',
            showText: Boolean(el.showText),
            dataColumn: el.dataColumn || undefined,
            dataTransform: el.dataTransform || undefined,
            src: el.src || undefined,
            objectFit: el.objectFit || 'contain'
          })) : [],
        domain: meta.domain || 'inventory', // fallback to inventory for existing labels
        datasetId: meta.datasetId || (data as any)?.description, // new location or fallback to description
        createdAt: (data as any)?.created_at,
        updatedAt: (data as any)?.updated_at,
      };
      
      setDocument(doc);
      
      if (doc.datasetId) {
        await loadDataset(doc.datasetId);
      }
      
      toast.success('Label loaded successfully');
    } catch (error) {
      console.error('Load document error:', error);
      toast.error('Failed to load label');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveDocument = useCallback(async () => {
    if (!document) {
      console.log('No document to save');
      return;
    }
    
    console.log('Saving document:', document.id, 'with elements:', document.elements.length);
    
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated for save');
        throw new Error('User not authenticated');
      }
      
      console.log('User authenticated:', user.id, 'saving document for user_id check');
      
      const updateData = {
        name: document.name,
        width: document.size.width,
        height: document.size.height,
        canvas_data: { 
          elements: document.elements,
          meta: { 
            domain: document.domain || 'inventory',
            datasetId: document.datasetId || null
          }
        } as any,
        description: document.datasetId || null, // keep for backward compatibility
      };
      
      console.log('Update data prepared:', updateData);
      
      const { error } = await supabase
        .from('label_templates')
        .update(updateData as any)
        .eq('id', document.id);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      
      console.log('Document saved successfully to database');
      setDocument(prev => prev ? { ...prev, updatedAt: new Date().toISOString() } : null);
      toast.success('Label saved successfully');
    } catch (error) {
      console.error('Save document error:', error);
      toast.error('Failed to save label');
    } finally {
      setIsLoading(false);
    }
  }, [document]);

  const loadUserDocuments = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('label_templates')
        .select('id, name, width, height, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Load user documents error:', error);
      toast.error('Failed to load documents');
      return [];
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('label_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // If the deleted document is currently loaded, clear it
      if (document?.id === id) {
        setDocument(null);
        setDataset(null);
        setSelectedElement(null);
      }
      
      toast.success('Label deleted successfully');
    } catch (error) {
      console.error('Delete document error:', error);
      toast.error('Failed to delete label');
    } finally {
      setIsLoading(false);
    }
  }, [document]);

  const loadDataset = useCallback(async (id: string) => {
    if (id === 'inventory') {
      // Auto-load inventory dataset
      try {
        // Import the hook dynamically to avoid circular dependencies
        const { useInventoryData } = await import('@/hooks/useInventoryData');
        
        // We need to trigger inventory data loading in components that use this context
        console.log('Inventory dataset requested - will be loaded by InventoryDataMapper');
        return;
      } catch (error) {
        console.error('Failed to load inventory dataset:', error);
        return;
      }
    }
    
    if (id === 'orders') {
      // Handle in-memory datasets - they will be set directly via setDataset
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('label_datasets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      const dataset: LabelDataset = {
        id: (data as any).id,
        name: (data as any).name,
        description: (data as any).description || '',
        headers: Array.isArray((data as any).headers) ? (data as any).headers.map((h: any) => String(h)) : [],
        data: Array.isArray((data as any).data) ? (data as any).data as any[][] : [],
        rowCount: (data as any).row_count || 0,
        createdAt: (data as any).created_at,
        updatedAt: (data as any).updated_at,
      };
      
      setDataset(dataset);
      
      if (document) {
        setDocument(prev => prev ? { ...prev, datasetId: id } : null);
      }
    } catch (error) {
      console.error('Load dataset error:', error);
      toast.error('Failed to load dataset');
    }
  }, [document]);

  const setDatasetDirectly = useCallback((newDataset: LabelDataset) => {
    setDataset(newDataset);
    
    if (document) {
      setDocument(prev => prev ? { ...prev, datasetId: newDataset.id } : null);
    }
  }, [document]);

  const addElement = useCallback((element: Omit<LabelElement, 'id'>) => {
    if (!document) return;
    
    const newElement: LabelElement = {
      ...element,
      id: crypto.randomUUID(),
    };
    
    setDocument(prev => prev ? {
      ...prev,
      elements: [...prev.elements, newElement],
      updatedAt: new Date().toISOString(),
    } : null);
    
    setSelectedElement(newElement);
  }, [document]);

  const updateElement = useCallback((id: string, updates: Partial<LabelElement>) => {
    if (!document) return;
    
    setDocument(prev => prev ? {
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el),
      updatedAt: new Date().toISOString(),
    } : null);
    
    if (selectedElement?.id === id) {
      setSelectedElement(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [document, selectedElement]);

  const deleteElement = useCallback((id: string) => {
    if (!document) return;
    
    setDocument(prev => prev ? {
      ...prev,
      elements: prev.elements.filter(el => el.id !== id),
      updatedAt: new Date().toISOString(),
    } : null);
    
    if (selectedElement?.id === id) {
      setSelectedElement(null);
    }
  }, [document, selectedElement]);

  const selectElement = useCallback((id: string | null) => {
    if (!document) return;
    
    const element = id ? document.elements.find(el => el.id === id) || null : null;
    setSelectedElement(element);
  }, [document]);

  const updateCanvasSize = useCallback((size: LabelSize) => {
    if (!document) return;
    
    setDocument(prev => prev ? {
      ...prev,
      size,
      updatedAt: new Date().toISOString(),
    } : null);
  }, [document]);

  const alignElements = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!document || document.elements.length < 2) return;
    
    const elements = document.elements;
    let referenceValue: number;
    
    // Calculate reference point based on alignment type
    switch (alignment) {
      case 'left':
        referenceValue = Math.min(...elements.map(el => el.x));
        break;
      case 'right':
        referenceValue = Math.max(...elements.map(el => el.x + el.width));
        break;
      case 'center':
        const leftmost = Math.min(...elements.map(el => el.x));
        const rightmost = Math.max(...elements.map(el => el.x + el.width));
        referenceValue = (leftmost + rightmost) / 2;
        break;
      case 'top':
        referenceValue = Math.min(...elements.map(el => el.y));
        break;
      case 'bottom':
        referenceValue = Math.max(...elements.map(el => el.y + el.height));
        break;
      case 'middle':
        const topmost = Math.min(...elements.map(el => el.y));
        const bottommost = Math.max(...elements.map(el => el.y + el.height));
        referenceValue = (topmost + bottommost) / 2;
        break;
      default:
        return;
    }
    
    // Apply alignment to all elements
    const updatedElements = elements.map(element => {
      let updates: Partial<LabelElement> = {};
      
      switch (alignment) {
        case 'left':
          updates.x = referenceValue;
          break;
        case 'right':
          updates.x = referenceValue - element.width;
          break;
        case 'center':
          updates.x = referenceValue - element.width / 2;
          break;
        case 'top':
          updates.y = referenceValue;
          break;
        case 'bottom':
          updates.y = referenceValue - element.height;
          break;
        case 'middle':
          updates.y = referenceValue - element.height / 2;
          break;
      }
      
      return { ...element, ...updates };
    });
    
    setDocument(prev => prev ? {
      ...prev,
      elements: updatedElements,
      updatedAt: new Date().toISOString(),
    } : null);
    
    toast.success(`Elements aligned ${alignment}`);
  }, [document]);

  const distributeElements = useCallback((direction: 'horizontal' | 'vertical') => {
    if (!document || document.elements.length < 3) return;
    
    const elements = [...document.elements].sort((a, b) => 
      direction === 'horizontal' ? a.x - b.x : a.y - b.y
    );
    
    const first = elements[0];
    const last = elements[elements.length - 1];
    
    if (direction === 'horizontal') {
      const totalSpace = (last.x + last.width) - first.x;
      const totalElementWidth = elements.reduce((sum, el) => sum + el.width, 0);
      const spacing = (totalSpace - totalElementWidth) / (elements.length - 1);
      
      let currentX = first.x;
      const updatedElements = elements.map(element => {
        const updatedElement = { ...element, x: currentX };
        currentX += element.width + spacing;
        return updatedElement;
      });
      
      setDocument(prev => prev ? {
        ...prev,
        elements: updatedElements,
        updatedAt: new Date().toISOString(),
      } : null);
    } else {
      const totalSpace = (last.y + last.height) - first.y;
      const totalElementHeight = elements.reduce((sum, el) => sum + el.height, 0);
      const spacing = (totalSpace - totalElementHeight) / (elements.length - 1);
      
      let currentY = first.y;
      const updatedElements = elements.map(element => {
        const updatedElement = { ...element, y: currentY };
        currentY += element.height + spacing;
        return updatedElement;
      });
      
      setDocument(prev => prev ? {
        ...prev,
        elements: updatedElements,
        updatedAt: new Date().toISOString(),
      } : null);
    }
    
    toast.success(`Elements distributed ${direction}ly`);
  }, [document]);

  // Always provide context - no conditions that could fail
  const contextValue: LabelDocContextType = {
    document,
    dataset,
    selectedElement,
    isLoading,
    previewIndex,
    createDocument,
    loadDocument,
    saveDocument,
    loadUserDocuments,
    deleteDocument,
    loadDataset,
    setDataset: setDatasetDirectly,
    setPreviewIndex,
    addElement,
    updateElement,
    deleteElement,
    selectElement,
    updateCanvasSize,
    alignElements,
    distributeElements,
  };

  // Auto-save when elements change
  useEffect(() => {
    if (document && document.elements.length > 0 && document.id) {
      const timeoutId = setTimeout(() => {
        saveDocument();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [document?.elements, document?.size, document?.id, saveDocument]);

  return (
    <LabelDocContext.Provider value={contextValue}>
      {children}
    </LabelDocContext.Provider>
  );
};