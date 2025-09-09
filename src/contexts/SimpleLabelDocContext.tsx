import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { LabelDoc, LabelElement, LabelDataset, LabelSize, LabelDomain } from '@/types/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LabelDocContextType {
  document: LabelDoc | null;
  dataset: LabelDataset | null;
  selectedElement: LabelElement | null;
  isLoading: boolean;
  
  // Document operations
  createDocument: (name: string, size: LabelSize, domain?: LabelDomain) => Promise<void>;
  loadDocument: (id: string) => Promise<void>;
  saveDocument: () => Promise<void>;
  loadUserDocuments: () => Promise<any[]>;
  
  // Dataset operations
  loadDataset: (id: string) => Promise<void>;
  setDataset: (dataset: LabelDataset) => void;
  
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
        })
        .select()
        .single();

      if (error) throw error;
      
      const newDoc: LabelDoc = {
        id: data.id,
        name: data.name,
        size: {
          width: data.width,
          height: data.height,
          unit: 'mm'
        },
        elements: [],
        domain,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
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
      
      const canvasData = data.canvas_data as any;
      const meta = canvasData?.meta || {};
      
      const doc: LabelDoc = {
        id: data.id,
        name: data.name,
        size: {
          width: data.width || 100,
          height: data.height || 50,
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
        datasetId: meta.datasetId || data.description, // new location or fallback to description
        createdAt: data.created_at,
        updatedAt: data.updated_at,
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
    if (!document) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('label_templates')
        .update({
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
        })
        .eq('id', document.id);

      if (error) throw error;
      
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

  const loadDataset = useCallback(async (id: string) => {
    if (id === 'inventory' || id === 'orders') {
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
        id: data.id,
        name: data.name,
        description: data.description || '',
        headers: Array.isArray(data.headers) ? data.headers.map(h => String(h)) : [],
        data: Array.isArray(data.data) ? data.data as any[][] : [],
        rowCount: data.row_count || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
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
    createDocument,
    loadDocument,
    saveDocument,
    loadUserDocuments,
    loadDataset,
    setDataset: setDatasetDirectly,
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