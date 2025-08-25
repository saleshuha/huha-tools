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
  
  // Dataset operations
  loadDataset: (id: string) => Promise<void>;
  
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
    throw new Error('useLabelDoc must be used within a LabelDocProvider');
  }
  return context;
};

export const LabelDocProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [document, setDocument] = useState<LabelDoc | null>(null);
  const [dataset, setDataset] = useState<LabelDataset | null>(null);
  const [selectedElement, setSelectedElement] = useState<LabelElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createDocument = useCallback(async (name: string, size: LabelSize) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const newDoc: LabelDoc = {
        id: crypto.randomUUID(),
        name,
        size,
        elements: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('label_templates')
        .insert({
          name: newDoc.name,
          width: size.width,
          height: size.height,
          canvas_data: { elements: [] } as any,
          user_id: user.id,
        });

      if (error) throw error;
      
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
        id: data.id,
        name: data.name,
        size: {
          width: data.width || 100,
          height: data.height || 50,
          unit: 'mm'
        },
        elements: (data.canvas_data as any)?.elements || [],
        datasetId: data.description, // using description field temporarily
        createdAt: data.created_at,
        updatedAt: data.updated_at,
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
        })
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
      toast.error('Failed to load dataset');
      console.error(error);
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

  return (
    <LabelDocContext.Provider value={{
      document,
      dataset,
      selectedElement,
      isLoading,
      createDocument,
      loadDocument,
      saveDocument,
      loadDataset,
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