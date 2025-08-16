import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileTemplate } from '@/types/template';
import { useToast } from '@/hooks/use-toast';

export const useTemplates = () => {
  const [templates, setTemplates] = useState<FileTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = async (storeFilter?: string) => {
    try {
      let query = supabase
        .from('noon_file_headers')
        .select('*')
        .order('created_at', { ascending: false });

      if (storeFilter) {
        query = query.eq('store_name', storeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedTemplates: FileTemplate[] = data?.map(item => ({
        id: item.id,
        name: item.file_type,
        headers: item.headers,
        description: `Template with ${item.headers.length} columns`,
        created_at: item.created_at,
        file_type: item.file_type,
        store_name: item.store_name
      })) || [];

      setTemplates(formattedTemplates);
    } catch (error) {
      toast({
        title: "Failed to load templates",
        description: "Could not fetch saved templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('noon_file_headers')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Template deleted",
        description: "Template has been deleted successfully",
      });

      await fetchTemplates();
    } catch (error) {
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