import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutomationConfig {
  id?: string;
  user_id?: string;
  name: string;
  site_origin: string;
  fields: {
    usernameField?: string;
    passwordField?: string;
    loginButton?: string;
    importsMenu?: string;
    uploadMenu?: string;
    fileInput?: string;
    uploadButton?: string;
    successMessage?: string;
    errorMessage?: string;
    processingMessage?: string;
  };
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useAutomationConfig = () => {
  const [configs, setConfigs] = useState<AutomationConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('automation_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs((data || []) as AutomationConfig[]);
    } catch (error) {
      console.error('Error fetching automation configs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch automation configurations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (config: Omit<AutomationConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('automation_configs')
        .upsert({
          user_id: user.user.id,
          ...config
        })
        .select()
        .single();

      if (error) throw error;

      await fetchConfigs();
      toast({
        title: "Success",
        description: "Configuration saved successfully"
      });

      return data;
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateConfig = async (id: string, updates: Partial<AutomationConfig>) => {
    try {
      const { data, error } = await supabase
        .from('automation_configs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchConfigs();
      toast({
        title: "Success",
        description: "Configuration updated successfully"
      });

      return data;
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('automation_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchConfigs();
      toast({
        title: "Success",
        description: "Configuration deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting config:', error);
      toast({
        title: "Error",
        description: "Failed to delete configuration",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  return {
    configs,
    isLoading,
    fetchConfigs,
    saveConfig,
    updateConfig,
    deleteConfig,
  };
};