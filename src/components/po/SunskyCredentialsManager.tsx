
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Key, CheckCircle2, AlertCircle, Eye, EyeOff, Plus, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyEntry {
  id: string;
  name: string;
  maskedKey: string;
  isActive: boolean;
  status: 'unknown' | 'connected' | 'disconnected';
  lastTested?: Date;
}

interface SunskyCredentialsManagerProps {
  onCredentialsChanged?: () => void;
}

export const SunskyCredentialsManager: React.FC<SunskyCredentialsManagerProps> = ({
  onCredentialsChanged
}) => {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([]);
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiSecret, setNewApiSecret] = useState('');
  const [newApiName, setNewApiName] = useState('');
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [showNewApiSecret, setShowNewApiSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { action: 'listApiKeys' }
      });

      if (error) throw error;

      if (data.result === 'success') {
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addApiKey = async () => {
    if (!newApiKey.trim() || !newApiSecret.trim() || !newApiName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter API key, secret, and name",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action: 'addApiKey',
          apiKey: newApiKey.trim(),
          apiSecret: newApiSecret.trim(),
          name: newApiName.trim()
        }
      });

      if (error) throw error;

      if (data.result === 'success') {
        toast({
          title: "Success",
          description: "API key added successfully",
        });
        setNewApiKey('');
        setNewApiSecret('');
        setNewApiName('');
        setShowAddForm(false);
        loadApiKeys();
        onCredentialsChanged?.();
      } else {
        throw new Error(data.message || 'Failed to add API key');
      }
    } catch (error) {
      console.error('Error adding API key:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add API key",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testApiKey = async (apiKeyId: string) => {
    setTesting(apiKeyId);
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action: 'testCredentials',
          apiId: apiKeyId
        }
      });

      if (error) throw error;

      if (data.result === 'success') {
        toast({
          title: "Connection Successful",
          description: "API credentials are working correctly",
        });
        // Update the status in local state
        setApiKeys(prev => prev.map(key => 
          key.id === apiKeyId 
            ? { ...key, status: 'connected', lastTested: new Date() }
            : key
        ));
      } else {
        toast({
          title: "Connection Failed",
          description: data.message || "Invalid API credentials",
          variant: "destructive",
        });
        setApiKeys(prev => prev.map(key => 
          key.id === apiKeyId 
            ? { ...key, status: 'disconnected', lastTested: new Date() }
            : key
        ));
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
      setApiKeys(prev => prev.map(key => 
        key.id === apiKeyId 
          ? { ...key, status: 'disconnected', lastTested: new Date() }
          : key
      ));
    } finally {
      setTesting(null);
    }
  };

  const setActiveApiKey = async (apiKeyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action: 'setActiveApiKey',
          apiId: apiKeyId
        }
      });

      if (error) throw error;

      if (data.result === 'success') {
        toast({
          title: "Success",
          description: "Active API key updated",
        });
        setApiKeys(prev => prev.map(key => ({
          ...key,
          isActive: key.id === apiKeyId
        })));
        onCredentialsChanged?.();
      } else {
        throw new Error(data.message || 'Failed to set active API key');
      }
    } catch (error) {
      console.error('Error setting active API key:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to set active API key",
        variant: "destructive",
      });
    }
  };

  const deleteApiKey = async (apiKeyId: string) => {
    console.log('Delete API key called for ID:', apiKeyId);
    console.log('Current API keys:', apiKeys);
    
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action: 'deleteApiKey',
          apiId: apiKeyId
        }
      });

      console.log('Delete API response:', { data, error });

      if (error) throw error;

      if (data.result === 'success') {
        toast({
          title: "Success",
          description: "API key deleted successfully",
        });
        loadApiKeys();
        onCredentialsChanged?.();
      } else {
        throw new Error(data.message || 'Failed to delete API key');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: 'unknown' | 'connected' | 'disconnected') => {
    switch (status) {
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current" />
            <span className="ml-2">Loading API keys...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Sunsky API Keys
            </CardTitle>
            <CardDescription>
              Manage multiple Sunsky API credentials
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add API Key
          </Button>
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

        {/* Existing API Keys */}
        <div className="space-y-3">
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API keys configured. Add your first API key to get started.
            </div>
          ) : (
            apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{apiKey.name}</div>
                    {apiKey.isActive && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        <Star className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(apiKey.status)}
                    {apiKey.lastTested && (
                      <span className="text-xs text-muted-foreground">
                        Tested: {apiKey.lastTested.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground font-mono">
                  {apiKey.maskedKey}
                </div>
                
                <div className="flex gap-2">
                  {!apiKey.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveApiKey(apiKey.id)}
                    >
                      Set as Active
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testApiKey(apiKey.id)}
                    disabled={testing === apiKey.id}
                  >
                    {testing === apiKey.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1" />
                        Testing...
                      </>
                    ) : (
                      'Test'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      console.log('Delete button clicked for API key:', apiKey.id);
                      deleteApiKey(apiKey.id);
                    }}
                    disabled={apiKeys.length <= 1}
                    title={apiKeys.length <= 1 ? "Cannot delete the last API key" : "Delete this API key"}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {apiKeys.length <= 1 ? 'Delete' : 'Delete'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add New API Key Form */}
        {showAddForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Add New API Key</h4>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="newApiName">API Key Name</Label>
                <Input
                  id="newApiName"
                  placeholder="e.g., Main Account, Backup Key"
                  value={newApiName}
                  onChange={(e) => setNewApiName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newApiKey">API Key</Label>
                  <div className="relative">
                    <Input
                      id="newApiKey"
                      type={showNewApiKey ? "text" : "password"}
                      placeholder="Enter your Sunsky API key"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewApiKey(!showNewApiKey)}
                    >
                      {showNewApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newApiSecret">API Secret</Label>
                  <div className="relative">
                    <Input
                      id="newApiSecret"
                      type={showNewApiSecret ? "text" : "password"}
                      placeholder="Enter your Sunsky API secret"
                      value={newApiSecret}
                      onChange={(e) => setNewApiSecret(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewApiSecret(!showNewApiSecret)}
                    >
                      {showNewApiSecret ? (
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
                  onClick={addApiKey}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      Adding...
                    </>
                  ) : (
                    'Add API Key'
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewApiKey('');
                    setNewApiSecret('');
                    setNewApiName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
