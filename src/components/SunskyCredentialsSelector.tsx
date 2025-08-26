import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SunskyCredential {
  id: string;
  name: string;
  api_key: string;
  is_active: boolean;
}

interface SunskyCredentialsSelectorProps {
  onCredentialSelect?: (credentialId: string | null) => void;
  selectedCredentialId?: string | null;
}

export const SunskyCredentialsSelector: React.FC<SunskyCredentialsSelectorProps> = ({
  onCredentialSelect,
  selectedCredentialId
}) => {
  const [credentials, setCredentials] = useState<SunskyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sunsky_credentials')
        .select('id, name, api_key, is_active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setCredentials(data || []);
      
      // Auto-select first active credential if none selected
      if (!selectedCredentialId && data && data.length > 0) {
        const activeCredential = data.find(cred => cred.is_active);
        const defaultCredential = activeCredential || data[0];
        onCredentialSelect?.(defaultCredential.id);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      toast({
        title: "Failed to Load Credentials",
        description: "Could not load Sunsky API credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialChange = (credentialId: string) => {
    onCredentialSelect?.(credentialId);
  };

  const navigateToCredentials = () => {
    window.open('/po-tracker', '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 animate-pulse" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <Button 
        onClick={navigateToCredentials}
        variant="outline"
        size="sm"
      >
        <Key className="h-4 w-4 mr-2" />
        Add API Credentials
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedCredentialId || ''} onValueChange={handleCredentialChange}>
        <SelectTrigger className="w-48">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <SelectValue placeholder="Select API Key" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {credentials.map((credential) => (
            <SelectItem key={credential.id} value={credential.id}>
              <div className="flex items-center gap-2">
                <span className={credential.is_active ? 'text-green-600' : 'text-muted-foreground'}>
                  ●
                </span>
                <span>
                  {credential.name || `${credential.api_key.substring(0, 8)}...`}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button 
        onClick={navigateToCredentials}
        variant="ghost"
        size="sm"
      >
        Manage
      </Button>
    </div>
  );
};