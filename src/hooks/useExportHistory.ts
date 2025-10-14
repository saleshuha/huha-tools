import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface ExportHistoryEntry {
  id: string;
  user_id: string;
  export_type: string;
  filters: any; // Maps to database column
  total_items: number;
  status: string; // Allow any string from database
  file_path?: string;
  file_size?: number;
  error_message?: string;
  created_at: string; // Database returns string
  metadata?: any; // Allow any type from database
}

const MAX_HISTORY_ENTRIES = 10;

export const useExportHistory = () => {
  const [exportHistory, setExportHistory] = useState<ExportHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchExportHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('export_history')
        .select('*')
        .eq('user_id' as any, user.id as any)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY_ENTRIES);

      if (error) throw error;

      const historyEntries = ((data as any) || []).map((entry: any) => ({
        ...entry,
        metadata: typeof entry.metadata === 'object' ? entry.metadata : {}
      })) as ExportHistoryEntry[];

      setExportHistory(historyEntries);
    } catch (error) {
      console.error('Error fetching export history:', error);
      toast({
        title: "Error",
        description: "Failed to load export history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const addExportEntry = useCallback(async (entry: {
    export_type: string;
    filters: any;
    total_items: number;
    status: 'completed' | 'failed' | 'cancelled';
    file_path?: string;
    file_size?: number;
    error_message?: string;
    metadata?: any;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('export_history')
        .insert({
          user_id: user.id,
          export_type: entry.export_type,
          filters: entry.filters,
          total_items: entry.total_items,
          status: entry.status,
          file_path: entry.file_path,
          file_size: entry.file_size,
          error_message: entry.error_message,
          metadata: entry.metadata || {}
        } as any)
        .select()
        .single();

      if (error) throw error;

      const newEntry: ExportHistoryEntry = {
        ...(data as any),
        metadata: typeof (data as any).metadata === 'object' ? (data as any).metadata : {}
      };

      setExportHistory(prev => {
        const updated = [newEntry, ...prev];
        // Keep only last 10 entries
        return updated.slice(0, MAX_HISTORY_ENTRIES);
      });

      return newEntry.id;
    } catch (error) {
      console.error('Error adding export entry:', error);
      toast({
        title: "Error",
        description: "Failed to save export to history",
        variant: "destructive"
      });
    }
  }, [toast]);

  const updateExportEntry = useCallback(async (id: string, updates: {
    file_path?: string;
    file_size?: number;
    status?: 'completed' | 'failed' | 'cancelled';
    error_message?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('export_history')
        .update({
          file_path: updates.file_path,
          file_size: updates.file_size,
          status: updates.status,
          error_message: updates.error_message
        } as any)
        .eq('id' as any, id as any);

      if (error) throw error;

      setExportHistory(prev => 
        prev.map(entry => 
          entry.id === id ? { 
            ...entry, 
            file_path: updates.file_path || entry.file_path,
            file_size: updates.file_size || entry.file_size,
            status: updates.status || entry.status,
            error_message: updates.error_message || entry.error_message
          } : entry
        )
      );
    } catch (error) {
      console.error('Error updating export entry:', error);
    }
  }, []);

  const downloadExportFile = useCallback(async (entry: ExportHistoryEntry) => {
    if (!entry.file_path) {
      toast({
        title: "Error",
        description: "No file available for download",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('exports')
        .download(entry.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = entry.file_path.split('/').pop() || 'export.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Export file download has started"
      });
    } catch (error) {
      console.error('Error downloading export file:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download export file",
        variant: "destructive"
      });
    }
  }, [toast]);

  const rerunExport = useCallback(async (entry: ExportHistoryEntry) => {
    try {
      // Return the filters so the parent component can rerun the export
      return entry.filters;
    } catch (error) {
      console.error('Error preparing rerun:', error);
      toast({
        title: "Error",
        description: "Failed to prepare export rerun",
        variant: "destructive"
      });
    }
  }, [toast]);

  const deleteExportEntry = useCallback(async (id: string) => {
    try {
      const entry = exportHistory.find(e => e.id === id);
      
      // Delete file from storage if it exists
      if (entry?.file_path) {
        await supabase.storage
          .from('exports')
          .remove([entry.file_path]);
      }

      // Delete database entry
      const { error } = await supabase
        .from('export_history')
        .delete()
        .eq('id' as any, id as any);

      if (error) throw error;

      setExportHistory(prev => prev.filter(entry => entry.id !== id));

      toast({
        title: "Entry Deleted",
        description: "Export history entry has been deleted"
      });
    } catch (error) {
      console.error('Error deleting export entry:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete export entry",
        variant: "destructive"
      });
    }
  }, [exportHistory, toast]);

  // Load history on mount
  useEffect(() => {
    fetchExportHistory();
  }, [fetchExportHistory]);

  return {
    exportHistory,
    isLoading,
    fetchExportHistory,
    addExportEntry,
    updateExportEntry,
    downloadExportFile,
    rerunExport,
    deleteExportEntry
  };
};
