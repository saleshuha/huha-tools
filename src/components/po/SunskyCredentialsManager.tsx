
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Key, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SunskyCredentialsManagerProps {
  onCredentialsChanged?: () => void;
}

export const SunskyCredentialsManager: React.FC<SunskyCredentialsManagerProps> = ({
  onCredentialsChanged
}) => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [lastTested, setLastTested] = useState<Date | null>(null);

  useEffect(() => {
    checkCredentialsStatus();
  }, []);

  const checkCredentialsStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { action: 'getCredentialsStatus' }
      });

      if (error) throw error;

      if (data.result === 'success') {
        setHasCredentials(data.hasCredentials);
        if (data.hasCredentials) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      }
    } catch (error) {
      console.error('Error checking credentials status:', error);
      setConnectionStatus('disconnected');
    }
  };

  const saveCredentials = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both API key and secret",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action: 'saveCredentials',
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim()
        }
      });

      if (error) throw error;

      if (data.result === 'success') {
        toast({
          title: "Success",
          description: "Sunsky API credentials saved successfully",
        });
        setHasCredentials(true);
        setConnectionStatus('connected');
        onCredentialsChanged?.();
      } else {
        throw new Error(data.message || 'Failed to save credentials');
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save credentials",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { action: 'testCredentials' }
      });

      if (error) throw error;

      if (data.result === 'success') {
        toast({
          title: "Connection Successful",
          description: "Your Sunsky API credentials are working correctly",
        });
        setConnectionStatus('connected');
        setLastTested(new Date());
      } else {
        toast({
          title: "Connection Failed",
          description: data.message || "Invalid API credentials",
          variant: "destructive",
        });
        setConnectionStatus('disconnected');
        setLastTested(new Date());
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
      setConnectionStatus('disconnected');
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Not Connected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="mr-1 h-3 w-3" />
            Unknown
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Sunsky API Connection
            </CardTitle>
            <CardDescription>
              Configure your Sunsky API credentials to import products
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge()}
            {lastTested && (
              <span className="text-xs text-muted-foreground">
                Last tested: {lastTested.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your API credentials are stored securely and are only accessible by you. 
            Get your API keys from the Sunsky-Online developer portal.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                placeholder="Enter your Sunsky API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret</Label>
            <div className="relative">
              <Input
                id="apiSecret"
                type={showApiSecret ? "text" : "password"}
                placeholder="Enter your Sunsky API secret"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiSecret(!showApiSecret)}
              >
                {showApiSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={saveCredentials}
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Saving...
              </>
            ) : (
              'Save Credentials'
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={testConnection}
            disabled={testing || !hasCredentials}
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
