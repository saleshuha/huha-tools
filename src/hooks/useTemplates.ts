import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileTemplate } from '@/types/template';
import { useToast } from '@/hooks/use-toast';

export const useTemplates = () => {
  const [templates, setTemplates] = useState<FileTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async (storeFilter?: string) => {
    console.log('fetchTemplates: Starting fetch with store filter:', storeFilter);
    try {
      let query = supabase
        .from('noon_file_headers')
        .select('*')
        .order('created_at', { ascending: false });

      if (storeFilter) {
        query = query.eq('store_name', storeFilter);
        console.log('fetchTemplates: Added store filter to query:', storeFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('fetchTemplates: Database error:', error);
        throw error;
      }

      console.log('fetchTemplates: Raw data from database:', data);

      const formattedTemplates: FileTemplate[] = data?.map((item: any) => ({
        id: item.id,
        name: item.file_type,
        headers: item.headers,
        description: `Template with ${item.headers.length} columns`,
        created_at: item.created_at,
        file_type: item.file_type,
        store_name: item.store_name
      })) || [];

      console.log('fetchTemplates: Formatted templates:', formattedTemplates);
      setTemplates(formattedTemplates);
    } catch (error) {
      console.error('fetchTemplates: Error occurred:', error);
      toast({
        title: "Failed to load templates",
        description: "Could not fetch saved templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const saveTemplate = async (name: string, headers: string[], fileType: string = 'custom', storeName?: string) => {
    try {
      const { error } = await supabase
        .from('noon_file_headers')
        .insert({
          file_type: name,
          headers: headers,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          store_name: storeName
        });

      if (error) throw error;

      toast({
        title: "Template saved",
        description: `Template "${name}" has been saved successfully`,
      });

      await fetchTemplates();
    } catch (error) {
      toast({
        title: "Failed to save template",
        description: "Could not save the template",
        variant: "destructive"
      });
    }
  };

  const deleteTemplate = async (templateId: string, currentStoreFilter?: string) => {
    try {
      console.log('deleteTemplate: Starting deletion for template ID:', templateId);
      console.log('deleteTemplate: Current store filter:', currentStoreFilter);
      
      const { error } = await supabase
        .from('noon_file_headers')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('deleteTemplate: Database error:', error);
        throw error;
      }

      console.log('deleteTemplate: Successfully deleted from database');

      toast({
        title: "Template deleted",
        description: "Template has been deleted successfully",
      });

      console.log('deleteTemplate: Refreshing templates with filter:', currentStoreFilter);
      await fetchTemplates(currentStoreFilter);
      console.log('deleteTemplate: Templates refreshed');
    } catch (error) {
      console.error('deleteTemplate: Error occurred:', error);
      toast({
        title: "Failed to delete template",
        description: "Could not delete the template",
        variant: "destructive"
      });
    }
  };

  const getUniqueStores = () => {
    const stores = templates
      .map(template => template.store_name)
      .filter(Boolean) as string[];
    return [...new Set(stores)];
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    saveTemplate,
    deleteTemplate,
    getUniqueStores,
    refreshTemplates: fetchTemplates
  };
};