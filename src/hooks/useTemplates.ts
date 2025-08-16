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

  const saveTemplate = async (name: string, headers: string[], fileType: string = 'custom', storeName?: string, defaultValues?: Record<string, string>) => {
    try {
      console.log('saveTemplate: Starting save for template:', { name, headers, fileType, storeName, defaultValues });
      
      const user = await supabase.auth.getUser();
      console.log('saveTemplate: User check result:', user);
      
      if (!user.data.user?.id) {
        console.error('saveTemplate: User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('saveTemplate: User authenticated, ID:', user.data.user.id);

      const templateData = {
        file_type: name,
        headers: headers,
        user_id: user.data.user.id,
        store_name: storeName || null
      };

      console.log('saveTemplate: Inserting template data:', templateData);
      console.log('saveTemplate: Table structure check - inserting into noon_file_headers');

      const { data, error } = await supabase
        .from('noon_file_headers')
        .insert(templateData)
        .select();

      console.log('saveTemplate: Insert result - data:', data, 'error:', error);

      if (error) {
        console.error('saveTemplate: Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('saveTemplate: Successfully saved to database, data returned:', data);

      toast({
        title: "Template saved",
        description: `Template "${name}" has been saved successfully`,
      });

      console.log('saveTemplate: About to refresh templates');
      await fetchTemplates();
      console.log('saveTemplate: Templates refreshed successfully');
    } catch (error) {
      console.error('saveTemplate: Error occurred:', error);
      toast({
        title: "Failed to save template",
        description: error instanceof Error ? error.message : "Could not save the template",
        variant: "destructive"
      });
      throw error; // Re-throw so calling code knows it failed
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

  const getUniqueStores = useCallback(async () => {
    try {
      // Get stores from both template_stores table and templates
      const [storesResult, templatesResult] = await Promise.all([
        supabase.from('template_stores').select('store_name'),
        supabase.from('noon_file_headers').select('store_name').not('store_name', 'is', null)
      ]);

      const storeNames = new Set<string>();
      
      // Add stores from template_stores table
      storesResult.data?.forEach(store => {
        if (store.store_name) storeNames.add(store.store_name);
      });
      
      // Add stores from templates
      templatesResult.data?.forEach(template => {
        if (template.store_name) storeNames.add(template.store_name);
      });

      return Array.from(storeNames).sort();
    } catch (error) {
      console.error('Error fetching stores:', error);
      return [];
    }
  }, []);

  const addStore = async (storeName: string) => {
    try {
      const { error } = await supabase
        .from('template_stores')
        .insert({
          store_name: storeName,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error && error.code !== '23505') { // Ignore unique constraint violations
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error adding store:', error);
      return false;
    }
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
    addStore,
    refreshTemplates: fetchTemplates
  };
};