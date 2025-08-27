import React, { createContext, useContext, useState, useCallback } from 'react';
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

export const SimpleLabelDocProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core state
  const [document, setDocument] = useState<LabelDoc | null>(null);
  const [dataset, setDataset] = useState<LabelDataset | null>(null);
  const [selectedElement, setSelectedElement] = useState<LabelElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Simple implementations that won't fail
  const createDocument = useCallback(async (name: string, size: LabelSize) => {
    try {
      const newDoc: LabelDoc = {
        id: crypto.randomUUID(),
        name,
        size,
        elements: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDocument(newDoc);
      toast.success('Label created successfully');
    } catch (error) {
      console.error('Create document error:', error);
      toast.error('Failed to create label');
    }
  }, []);

  const loadDocument = useCallback(async (id: string) => {
    // Simple placeholder - you can enhance later
    toast.info('Load document not yet implemented');
  }, []);

  const saveDocument = useCallback(async () => {
    if (!document) return;
    try {
      // Simple placeholder - you can enhance later
      toast.success('Document saved (local only)');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save document');
    }
  }, [document]);

  const loadUserDocuments = useCallback(async () => {
    return [];
  }, []);

  const loadDataset = useCallback(async (id: string) => {
    // Simple placeholder
  }, []);

  const setDatasetDirectly = useCallback((newDataset: LabelDataset) => {
    setDataset(newDataset);
  }, []);

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
  };

  return (
    <LabelDocContext.Provider value={contextValue}>
      {children}
    </LabelDocContext.Provider>
  );
};