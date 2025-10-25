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

const MAX_HISTORY_ENTRIES = 50;

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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY_ENTRIES);

      if (error) {
        console.error('❌ Error fetching export history:', error);
        throw error;
      }

      console.log('✅ Fetched export history:', data?.length, 'entries');

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
        })
        .eq('id', id);

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
        description: "No file available for download from sunsky-exports bucket",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('sunsky-exports')
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
        description: "Failed to download export file from sunsky-exports bucket",
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
          .from('sunsky-exports')
          .remove([entry.file_path]);
      }

      // Delete database entry
      const { error } = await supabase
        .from('export_history')
        .delete()
        .eq('id', id);

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

  const fixStuckExport = useCallback(async (exportId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive"
        });
        return;
      }

      // Get current export entry
      const { data: stuckExport, error: fetchError } = await supabase
        .from('export_history')
        .select('*')
        .eq('id', exportId)
        .single();

      if (fetchError) throw fetchError;

      if (stuckExport && stuckExport.status === 'processing') {
        // Update to cancelled status
        const { error: updateError } = await supabase
          .from('export_history')
          .update({ 
            status: 'cancelled',
            metadata: {
              ...stuckExport.metadata,
              cancelled_at: new Date().toISOString(),
              manual_cleanup: true
            }
          } as any)
          .eq('id', exportId);

        if (updateError) throw updateError;

        // Update local state
        setExportHistory(prev => 
          prev.map(entry => 
            entry.id === exportId 
              ? { ...entry, status: 'cancelled' as const }
              : entry
          )
        );

        toast({
          title: "Success",
          description: "Export status has been corrected to 'cancelled'"
        });

        // Trigger refresh to ensure UI is synced
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refresh-export-history'));
        }, 500);
      }
    } catch (error) {
      console.error('Error fixing stuck export:', error);
      toast({
        title: "Error",
        description: "Failed to fix export status",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Load history on mount and subscribe to real-time updates
  useEffect(() => {
    fetchExportHistory();

    // Subscribe to real-time updates on export_history table
    const channel = supabase
      .channel('export-history-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'export_history'
        },
        (payload) => {
          console.log('📡 Realtime export_history update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newEntry = payload.new as any;
            setExportHistory(prev => {
              // Check if entry already exists
              if (prev.some(e => e.id === newEntry.id)) {
                return prev;
              }
              const updated = [newEntry, ...prev];
              return updated.slice(0, MAX_HISTORY_ENTRIES);
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedEntry = payload.new as any;
            setExportHistory(prev =>
              prev.map(entry =>
                entry.id === updatedEntry.id ? updatedEntry : entry
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedEntry = payload.old as any;
            setExportHistory(prev =>
              prev.filter(entry => entry.id !== deletedEntry.id)
            );
          }
        }
      )
      .subscribe();

    // Listen for manual refresh events
    const handleManualRefresh = () => {
      console.log('🔄 Manual export history refresh triggered');
      fetchExportHistory();
    };

    window.addEventListener('refresh-export-history', handleManualRefresh);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('refresh-export-history', handleManualRefresh);
    };
  }, [fetchExportHistory]);

  return {
    exportHistory,
    isLoading,
    fetchExportHistory,
    addExportEntry,
    updateExportEntry,
    downloadExportFile,
    rerunExport,
    deleteExportEntry,
    fixStuckExport
  };
};
