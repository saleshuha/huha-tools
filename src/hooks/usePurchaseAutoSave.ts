import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface AutoSaveOptions {
  onSave: (data: any) => Promise<void>;
  debounceMs?: number;
}

export const usePurchaseAutoSave = ({ onSave, debounceMs = 2000 }: AutoSaveOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pendingDataRef = useRef<any>(null);
  const isSavingRef = useRef(false);

  const save = useCallback(async (data: any) => {
    if (isSavingRef.current) return;
    
    isSavingRef.current = true;
    try {
      await onSave(data);
    } catch (error) {
      console.error('Auto-save error:', error);
      toast.error('Failed to save changes');
    } finally {
      isSavingRef.current = false;
      pendingDataRef.current = null;
    }
  }, [onSave]);

  const scheduleAutoSave = useCallback((data: any) => {
    pendingDataRef.current = data;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current && !isSavingRef.current) {
        save(pendingDataRef.current);
      }
    }, debounceMs);
  }, [debounceMs, save]);

  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (pendingDataRef.current && !isSavingRef.current) {
      save(pendingDataRef.current);
    }
  }, [save]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    scheduleAutoSave,
    forceSave,
    isSaving: isSavingRef.current
  };
};
