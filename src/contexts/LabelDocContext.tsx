import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { LabelDoc, LabelElement, LabelDataset, LabelSize } from '@/types/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LabelDocContextType {
  document: LabelDoc | null;
  dataset: LabelDataset | null;
  selectedElement: LabelElement | null;
  isLoading: boolean;
  
  // Document operations
  createDocument: (name: string, size: LabelSize) => Promise<void>;
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

export const LabelDocProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('LabelDocProvider rendering');
  const [document, setDocument] = useState<LabelDoc | null>(null);
  const [dataset, setDataset] = useState<LabelDataset | null>(null);
  const [selectedElement, setSelectedElement] = useState<LabelElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createDocument = useCallback(async (name: string, size: LabelSize) => {
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
          canvas_data: { elements: [] } as any,
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
        createdAt: (data as any)?.created_at,
        updatedAt: (data as any)?.updated_at,
      };
      
      setDocument(newDoc);
      toast.success('Label created successfully');
    } catch (error) {
      toast.error('Failed to create label');
      console.error(error);
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
      
      const doc: LabelDoc = {
        id: (data as any)?.id,
        name: (data as any)?.name,
        size: {
          width: (data as any)?.width || 100,
          height: (data as any)?.height || 50,
          unit: 'mm'
        },
        elements: Array.isArray(((data as any)?.canvas_data as any)?.elements) ? 
          ((data as any).canvas_data as any).elements.map((el: any) => ({
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
        datasetId: (data as any)?.description, // using description field temporarily
        createdAt: (data as any)?.created_at,
        updatedAt: (data as any)?.updated_at,
      };
      
      setDocument(doc);
      
      if (doc.datasetId) {
        await loadDataset(doc.datasetId);
      }
    } catch (error) {
      toast.error('Failed to load label');
      console.error(error);
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
          canvas_data: { elements: document.elements } as any,
          description: document.datasetId || null,
        } as any)
        .eq('id', document.id);

      if (error) throw error;
      
      setDocument(prev => prev ? { ...prev, updatedAt: new Date().toISOString() } : null);
      toast.success('Label saved successfully');
    } catch (error) {
      toast.error('Failed to save label');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [document]);

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
        id: (data as any)?.id,
        name: (data as any)?.name,
        description: (data as any)?.description || '',
        headers: Array.isArray((data as any)?.headers) ? (data as any).headers.map((h: any) => String(h)) : [],
        data: Array.isArray((data as any)?.data) ? (data as any).data as any[][] : [],
        rowCount: (data as any)?.row_count || 0,
        createdAt: (data as any)?.created_at,
        updatedAt: (data as any)?.updated_at,
      };
      
      setDataset(dataset);
      
      if (document) {
        setDocument(prev => prev ? { ...prev, datasetId: id } : null);
      }
    } catch (error) {
      toast.error('Failed to load dataset');
      console.error(error);
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
      toast.error('Failed to load documents');
      console.error(error);
      return [];
    }
  }, []);

  // Auto-save when elements change
  useEffect(() => {
    if (document && document.elements.length > 0) {
      const timeoutId = setTimeout(() => {
        saveDocument();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [document?.elements, document?.size, saveDocument]);

  console.log('LabelDocProvider providing context');
  
  return (
    <LabelDocContext.Provider value={{
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
    }}>
      {children}
    </LabelDocContext.Provider>
  );
};