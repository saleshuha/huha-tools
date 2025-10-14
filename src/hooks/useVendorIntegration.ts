import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';

interface VendorIntegration {
  id: string;
  user_id: string;
  vendor_name: string;
  transport_method: string;
  sftp_host?: string;
  sftp_port?: number;
  sftp_username?: string;
  sftp_remote_path?: string;
  sftp_receive_host?: string;
  sftp_receive_port?: number;
  sftp_receive_username?: string;
  sftp_receive_remote_path?: string;
  ssh_fingerprint_sending?: string;
  ssh_fingerprint_receiving?: string;
  country: string;
  primary_key_type: string;
  feed_schedule: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VendorFeedLog {
  id: string;
  user_id: string;
  integration_id: string;
  feed_type: string;
  file_name: string;
  file_path?: string;
  status: string;
  total_items?: number;
  error_message?: string;
  sent_at?: string;
  acknowledged_at?: string;
  created_at: string;
}

interface CreateIntegration {
  vendor_name?: string;
  transport_method?: string;
  sftp_host?: string;
  sftp_port?: number;
  sftp_username?: string;
  sftp_remote_path?: string;
  sftp_receive_host?: string;
  sftp_receive_port?: number;
  sftp_receive_username?: string;
  sftp_receive_remote_path?: string;
  ssh_fingerprint_sending?: string;
  ssh_fingerprint_receiving?: string;
  country: string;
  primary_key_type: string;
  feed_schedule?: string;
  is_active?: boolean;
}

export function useVendorIntegration() {
  const [integrations, setIntegrations] = useState<VendorIntegration[]>([]);
  const [feedLogs, setFeedLogs] = useState<VendorFeedLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useUserProfile();

  const loadIntegrations = useCallback(async (country?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('vendor_integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (country) {
        query = query.eq('country', country);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading vendor integrations:', error);
        toast({
          title: "Error",
          description: "Failed to load vendor integrations",
          variant: "destructive",
        });
        return;
      }

      setIntegrations((data || []) as any);
    } catch (error) {
      console.error('Error in loadIntegrations:', error);
      toast({
        title: "Error",
        description: "Failed to load vendor integrations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadFeedLogs = useCallback(async (integrationId?: string, limit = 50) => {
    try {
      let query = supabase
        .from('vendor_feed_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (integrationId) {
        query = query.eq('integration_id', integrationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading feed logs:', error);
        toast({
          title: "Error",
          description: "Failed to load feed logs",
          variant: "destructive",
        });
        return;
      }

      setFeedLogs((data || []) as any);
    } catch (error) {
      console.error('Error in loadFeedLogs:', error);
    }
  }, [toast]);

  const createIntegration = useCallback(async (integration: CreateIntegration) => {
    try {
      // Get the current user directly from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Error",
          description: "You must be logged in to create an integration",
          variant: "destructive",
        });
        return null;
      }

      const { data, error } = await supabase
        .from('vendor_integrations')
        .insert({
          user_id: user.id,
          vendor_name: integration.vendor_name || 'Amazon Vendor Central',
          transport_method: integration.transport_method || 'SFTP',
          sftp_host: integration.sftp_host,
          sftp_port: integration.sftp_port || 22,
          sftp_username: integration.sftp_username,
          sftp_remote_path: integration.sftp_remote_path || 'upload',
          sftp_receive_host: integration.sftp_receive_host,
          sftp_receive_port: integration.sftp_receive_port || 22,
          sftp_receive_username: integration.sftp_receive_username,
          sftp_receive_remote_path: integration.sftp_receive_remote_path || 'download',
          ssh_fingerprint_sending: integration.ssh_fingerprint_sending,
          ssh_fingerprint_receiving: integration.ssh_fingerprint_receiving,
          country: integration.country,
          primary_key_type: integration.primary_key_type,
          feed_schedule: integration.feed_schedule || 'daily',
          is_active: integration.is_active || false,
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Error creating integration:', error);
        toast({
          title: "Error",
          description: "Failed to create vendor integration",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Vendor integration created successfully",
      });

      await loadIntegrations();
      return data;
    } catch (error) {
      console.error('Error in createIntegration:', error);
      toast({
        title: "Error",
        description: "Failed to create vendor integration",
        variant: "destructive",
      });
      return null;
    }
  }, [toast, loadIntegrations]);

  const updateIntegration = useCallback(async (id: string, updates: Partial<CreateIntegration>) => {
    try {
      const { error } = await supabase
        .from('vendor_integrations')
        .update(updates as any)
        .eq('id', id);

      if (error) {
        console.error('Error updating integration:', error);
        toast({
          title: "Error",
          description: "Failed to update vendor integration",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Vendor integration updated successfully",
      });

      await loadIntegrations();
      return true;
    } catch (error) {
      console.error('Error in updateIntegration:', error);
      toast({
        title: "Error",
        description: "Failed to update vendor integration",
        variant: "destructive",
      });
      return false;
    }
  }, [toast, loadIntegrations]);

  const deleteIntegration = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('vendor_integrations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting integration:', error);
        toast({
          title: "Error",
          description: "Failed to delete vendor integration",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Vendor integration deleted successfully",
      });

      await loadIntegrations();
      return true;
    } catch (error) {
      console.error('Error in deleteIntegration:', error);
      toast({
        title: "Error",
        description: "Failed to delete vendor integration",
        variant: "destructive",
      });
      return false;
    }
  }, [toast, loadIntegrations]);

  const generateInventoryFeed = useCallback(async (integrationId: string, forceCountry?: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('vendor-inventory-feed', {
        body: {
          integration_id: integrationId,
          user_id: profile?.id,
          force_country: forceCountry
        }
      });

      if (error) {
        console.error('Error generating feed:', error);
        toast({
          title: "Error",
          description: "Failed to generate inventory feed",
          variant: "destructive",
        });
        return null;
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error generating feed');
      }

      toast({
        title: "Success",
        description: `Inventory feed generated with ${data.total_items} items`,
      });

      // Reload feed logs to show the new entry
      await loadFeedLogs(integrationId);
      
      return data;
    } catch (error) {
      console.error('Error in generateInventoryFeed:', error);
      toast({
        title: "Error",
        description: "Failed to generate inventory feed",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, profile?.id, loadFeedLogs]);

  const receiveFiles = useCallback(async (integrationId: string, forceCheck?: boolean) => {
    console.log('receiveFiles called with:', { integrationId, forceCheck, profileId: profile?.id });
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('amazon-sftp-receiver', {
        body: { 
          integration_id: integrationId, 
          user_id: profile?.id,
          force_check: forceCheck 
        }
      });

      if (error) {
        console.error('Error receiving files:', error);
        toast({
          title: "Error",
          description: "Failed to receive files from Amazon",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Success",
        description: "File receiving process started",
      });

      console.log('Files received successfully:', data);
      
      // Reload feed logs to show newly received files
      await loadFeedLogs(integrationId);
      
      return data;
    } catch (error) {
      console.error('Error in receiveFiles:', error);
      toast({
        title: "Error",
        description: "Failed to receive files from Amazon",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, profile?.id, loadFeedLogs]);

  const sendTestFile = useCallback(async (integrationId: string, xmlContent: string, fileName?: string) => {
    console.log('Sending test file for integration:', integrationId);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('amazon-test-sender', {
        body: { 
          integration_id: integrationId, 
          user_id: profile?.id,
          xml_content: xmlContent,
          file_name: fileName
        }
      });

      if (error) {
        console.error('Error sending test file:', error);
        toast({
          title: "Error",
          description: "Failed to send test file to Amazon",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Test file prepared and ready to send to Amazon",
      });

      console.log('Test file sent successfully:', data);
      
      // Reload feed logs to show the test file
      await loadFeedLogs(integrationId);
      
      return data;
    } catch (error) {
      console.error('Error in sendTestFile:', error);
      toast({
        title: "Error",
        description: "Failed to send test file to Amazon",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, profile?.id, loadFeedLogs]);

  const diagnoseIntegration = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('integration-diagnostics', {
        body: { user_id: profile?.id }
      });

      if (error) {
        console.error('Error in diagnostics:', error);
        return null;
      }

      console.log('Integration Diagnosis:', data);
      return data;
    } catch (error) {
      console.error('Error in diagnoseIntegration:', error);
      return null;
    }
  }, [profile?.id]);

  return {
    integrations,
    feedLogs,
    loading,
    loadIntegrations,
    loadFeedLogs,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    generateInventoryFeed,
    receiveFiles,
    sendTestFile,
    diagnoseIntegration,
  };
}