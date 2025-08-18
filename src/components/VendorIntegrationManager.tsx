import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVendorIntegration } from '@/hooks/useVendorIntegration';
import { useCountry } from '@/contexts/CountryContext';
import { Plus, Settings, Download, Trash2, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export function VendorIntegrationManager() {
  const { selectedCountry } = useCountry();
  const {
    integrations,
    feedLogs,
    loading,
    loadIntegrations,
    loadFeedLogs,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    generateInventoryFeed,
  } = useVendorIntegration();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);
  const [showSSHInstructions, setShowSSHInstructions] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: 'Amazon Vendor Central',
    transport_method: 'SFTP',
    sftp_host: 'eu-sftp.amazonsedi.com',
    sftp_port: 22,
    sftp_username: '18DL8XNNYWXN1', // Default to sending username
    sftp_remote_path: 'upload',
    country: 'KSA', // Updated to KSA
    primary_key_type: 'SKU',
    feed_schedule: 'daily',
    is_active: false,
  });

  const [sshKeyUploaded, setSshKeyUploaded] = useState(false);

  useEffect(() => {
    loadIntegrations(selectedCountry);
    loadFeedLogs();
  }, [selectedCountry, loadIntegrations, loadFeedLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingIntegration) {
      const success = await updateIntegration(editingIntegration, formData);
      if (success) {
        setEditingIntegration(null);
        resetForm();
      }
    } else {
      const result = await createIntegration(formData);
      if (result) {
        setShowCreateDialog(false);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_name: 'Amazon Vendor Central',
      transport_method: 'SFTP',
      sftp_host: 'eu-sftp.amazonsedi.com',
      sftp_port: 22,
      sftp_username: '18DL8XNNYWXN1',
      sftp_remote_path: 'upload',
      country: 'KSA', // Reset to KSA
      primary_key_type: 'SKU',
      feed_schedule: 'daily',
      is_active: false,
    });
    setSshKeyUploaded(false);
  };

  const handleEdit = (integration: any) => {
    setFormData({
      vendor_name: integration.vendor_name,
      transport_method: integration.transport_method,
      sftp_host: integration.sftp_host || '',
      sftp_port: integration.sftp_port || 22,
      sftp_username: integration.sftp_username || '',
      sftp_remote_path: integration.sftp_remote_path || '/incoming/inventory',
      country: integration.country,
      primary_key_type: integration.primary_key_type,
      feed_schedule: integration.feed_schedule,
      is_active: integration.is_active,
    });
    setSshKeyUploaded(!!integration.sftp_host); // Assume key uploaded if host exists
    setEditingIntegration(integration.id);
  };

  const generateSSHKeyPair = () => {
    setShowSSHInstructions(true);
  };

  const handleGenerateFeed = async (integrationId: string) => {
    await generateInventoryFeed(integrationId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'acknowledged':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'acknowledged':
        return 'bg-success/10 text-success border-success/20';
      case 'failed':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-warning/10 text-warning border-warning/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Amazon Vendor Central Integration
          </h2>
          <p className="text-muted-foreground">
            Configure and manage inventory feed integration with Amazon Vendor Central
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Vendor Integration</DialogTitle>
              <DialogDescription>
                Configure a new Amazon Vendor Central integration for {selectedCountry}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SSH Key Setup Section */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50">
                <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">
                  📋 SSH Key Setup Process
                </h3>
                <div className="space-y-3 text-sm text-blue-600 dark:text-blue-400">
                  <div className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span>Generate SSH key pair (we'll help you with this)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span>Upload public key to Amazon Vendor Central portal</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>Amazon provides SFTP host and username</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">4.</span>
                    <span>Configure connection details below</span>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={generateSSHKeyPair}
                  className="mt-3"
                >
                  📋 Generate SSH Key Instructions
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor_name">Vendor Name</Label>
                  <Input
                    id="vendor_name"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transport_method">Transport Method</Label>
                  <Select
                    value={formData.transport_method}
                    onValueChange={(value) => setFormData({ ...formData, transport_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SFTP">SFTP (SSH Keys)</SelectItem>
                      <SelectItem value="AS2">AS2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Connection Status Indicators */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                  <Switch
                    id="ssh_key_uploaded"
                    checked={sshKeyUploaded}
                    onCheckedChange={setSshKeyUploaded}
                  />
                  <Label htmlFor="ssh_key_uploaded" className="text-sm">SSH Key Uploaded to Amazon</Label>
                </div>
              </div>

              {/* SFTP Connection Details - Only show if keys are uploaded */}
              {sshKeyUploaded && (
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200/50">
                  <h4 className="font-semibold text-green-700 dark:text-green-300">
                    🔗 Amazon-Provided Connection Details
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sftp_host">SFTP Host (from Amazon)</Label>
                      <Input
                        id="sftp_host"
                        value={formData.sftp_host}
                        onChange={(e) => setFormData({ ...formData, sftp_host: e.target.value })}
                        placeholder="Amazon will provide this"
                        disabled={!sshKeyUploaded}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sftp_port">SFTP Port</Label>
                      <Input
                        id="sftp_port"
                        type="number"
                        value={formData.sftp_port}
                        onChange={(e) => setFormData({ ...formData, sftp_port: parseInt(e.target.value) || 22 })}
                        disabled={!sshKeyUploaded}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sftp_username">SFTP Username (from Amazon)</Label>
                      <Input
                        id="sftp_username"
                        value={formData.sftp_username}
                        onChange={(e) => setFormData({ ...formData, sftp_username: e.target.value })}
                        placeholder="Amazon will provide this"
                        disabled={!sshKeyUploaded}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sftp_remote_path">Remote Path</Label>
                      <Input
                        id="sftp_remote_path"
                        value={formData.sftp_remote_path}
                        onChange={(e) => setFormData({ ...formData, sftp_remote_path: e.target.value })}
                        disabled={!sshKeyUploaded}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_key_type">Primary Key Type</Label>
                  <Select
                    value={formData.primary_key_type}
                    onValueChange={(value) => setFormData({ ...formData, primary_key_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SKU">SKU</SelectItem>
                      <SelectItem value="ASIN">ASIN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feed_schedule">Feed Schedule</Label>
                  <Select
                    value={formData.feed_schedule}
                    onValueChange={(value) => setFormData({ ...formData, feed_schedule: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="manual">Manual Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  disabled={!sshKeyUploaded}
                />
                <Label htmlFor="is_active">
                  Active Integration {!sshKeyUploaded && "(Upload SSH key first)"}
                </Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !sshKeyUploaded}>
                  {!sshKeyUploaded ? "Upload SSH Key First" : "Create Integration"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="feed-logs">Feed History</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          {/* Webhook URLs Section */}
          {integrations.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Amazon Feed Receiver URLs</CardTitle>
                <CardDescription>
                  Configure these URLs in your Amazon Vendor Central portal to receive feeds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {integrations.map((integration) => (
                    <div key={integration.id} className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-2">{integration.vendor_name} - {integration.country}</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Order Acknowledgment URL:</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Input
                              value={`https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/amazon-feed-receiver?integration_id=${integration.id}&feed_type=acknowledgment`}
                              readOnly
                              className="text-xs font-mono"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigator.clipboard.writeText(`https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/amazon-feed-receiver?integration_id=${integration.id}&feed_type=acknowledgment`)}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Purchase Order URL:</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Input
                              value={`https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/amazon-feed-receiver?integration_id=${integration.id}&feed_type=order`}
                              readOnly
                              className="text-xs font-mono"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigator.clipboard.writeText(`https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/amazon-feed-receiver?integration_id=${integration.id}&feed_type=order`)}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <Settings className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No Integrations Configured</h3>
                    <p className="text-muted-foreground">
                      Set up your first Amazon Vendor Central integration to start syncing inventory
                    </p>
                  </div>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Integration
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <Card key={integration.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{integration.vendor_name}</CardTitle>
                        <CardDescription>
                          {integration.transport_method} • {integration.primary_key_type} Based • {integration.country}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={integration.is_active ? "default" : "secondary"}>
                          {integration.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(integration)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateFeed(integration.id)}
                          disabled={loading}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Generate Feed
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Integration</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this integration? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteIntegration(integration.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Host:</span>
                        <p className="font-mono">{integration.sftp_host || 'Not configured'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Username:</span>
                        <p className="font-mono">{integration.sftp_username || 'Not configured'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Schedule:</span>
                        <p className="capitalize">{integration.feed_schedule}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Updated:</span>
                        <p>{format(new Date(integration.updated_at), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feed-logs" className="space-y-4">
          {feedLogs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <Download className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No Feed History</h3>
                    <p className="text-muted-foreground">
                      Generate your first inventory feed to see the history here
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {feedLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(log.status)}
                        <div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(log.status)}
                            <span className="font-medium">{log.file_name}</span>
                            <Badge variant="outline" className={getStatusColor(log.status)}>
                              {log.status}
                            </Badge>
                            <Badge variant="secondary">
                              {log.feed_type.includes('received_') ? 'Received' : 'Sent'}
                            </Badge>
                            {log.feed_type.includes('received_') && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {log.feed_type.replace('received_', '').toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {log.total_items !== null && (
                              <span>{log.total_items} items • </span>
                            )}
                            Created: {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                            {log.acknowledged_at && (
                              <span> • Processed: {format(new Date(log.acknowledged_at), 'MMM dd, yyyy HH:mm')}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(log.status)}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </Badge>
                        {log.error_message && (
                          <Badge variant="destructive">Error</Badge>
                        )}
                      </div>
                    </div>
                    {log.error_message && (
                      <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded text-sm">
                        {log.error_message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Integration Dialog */}
      <Dialog open={!!editingIntegration} onOpenChange={() => setEditingIntegration(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Integration</DialogTitle>
            <DialogDescription>
              Update your Amazon Vendor Central integration settings
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Same form fields as create dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_vendor_name">Vendor Name</Label>
                <Input
                  id="edit_vendor_name"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_transport_method">Transport Method</Label>
                <Select
                  value={formData.transport_method}
                  onValueChange={(value) => setFormData({ ...formData, transport_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SFTP">SFTP</SelectItem>
                    <SelectItem value="AS2">AS2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_sftp_host">SFTP Host</Label>
                <Input
                  id="edit_sftp_host"
                  value={formData.sftp_host}
                  onChange={(e) => setFormData({ ...formData, sftp_host: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_sftp_port">SFTP Port</Label>
                <Input
                  id="edit_sftp_port"
                  type="number"
                  value={formData.sftp_port}
                  onChange={(e) => setFormData({ ...formData, sftp_port: parseInt(e.target.value) || 22 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_sftp_username">SFTP Username</Label>
                <Input
                  id="edit_sftp_username"
                  value={formData.sftp_username}
                  onChange={(e) => setFormData({ ...formData, sftp_username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_sftp_remote_path">Remote Path</Label>
                <Input
                  id="edit_sftp_remote_path"
                  value={formData.sftp_remote_path}
                  onChange={(e) => setFormData({ ...formData, sftp_remote_path: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_primary_key_type">Primary Key Type</Label>
                <Select
                  value={formData.primary_key_type}
                  onValueChange={(value) => setFormData({ ...formData, primary_key_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SKU">SKU</SelectItem>
                    <SelectItem value="ASIN">ASIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_feed_schedule">Feed Schedule</Label>
                <Select
                  value={formData.feed_schedule}
                  onValueChange={(value) => setFormData({ ...formData, feed_schedule: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="manual">Manual Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit_is_active">Active Integration</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditingIntegration(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Update Integration
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SSH Instructions Dialog */}
      <Dialog open={showSSHInstructions} onOpenChange={setShowSSHInstructions}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🔑 SSH Key Generation Instructions
            </DialogTitle>
            <DialogDescription>
              Follow these steps to generate and configure SSH keys for Amazon Vendor Central
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Step 1: Generate Keys */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50">
              <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                Generate SSH Key Pair
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Open your terminal or command prompt and run:
                </p>
                <div className="bg-black/80 text-green-400 p-3 rounded font-mono text-sm overflow-x-auto">
                  ssh-keygen -t rsa -b 2048 -f amazon_vendor_key
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  This creates two files:
                </p>
                <ul className="text-sm text-blue-600 dark:text-blue-400 ml-4 space-y-1">
                  <li>• <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">amazon_vendor_key</code> (private key - keep secure)</li>
                  <li>• <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">amazon_vendor_key.pub</code> (public key - upload to Amazon)</li>
                </ul>
              </div>
            </div>

            {/* Step 2: Upload Receiving Public Key to Amazon */}
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200/50">
              <h3 className="font-semibold text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                Upload Receiving Public Key to Amazon
              </h3>
              <div className="space-y-3 text-sm text-orange-600 dark:text-orange-400">
                <ol className="ml-4 space-y-2">
                  <li>1. Login to Amazon Vendor Central</li>
                  <li>2. Navigate to <strong>Reports → Inventory Reports → Upload Public Key</strong></li>
                  <li>3. Browse and select your <code className="bg-orange-100 dark:bg-orange-800 px-2 py-1 rounded">amazon_vendor_key.pub</code> file</li>
                  <li>4. Choose key type: <strong>"Receiving Public Key"</strong></li>
                  <li>5. Submit the key and wait for confirmation</li>
                </ol>
              </div>
            </div>

            {/* Step 3: Upload Sending Public Key to Amazon */}
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200/50">
              <h3 className="font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
                <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                Upload Sending Public Key to Amazon
              </h3>
              <div className="space-y-3 text-sm text-purple-600 dark:text-purple-400">
                <p><strong>Amazon also requires a Sending Public Key:</strong></p>
                <ol className="ml-4 space-y-2">
                  <li>1. In the same Amazon Vendor Central section</li>
                  <li>2. Browse and select your <code className="bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded">amazon_vendor_key.pub</code> file again</li>
                  <li>3. This time choose key type: <strong>"Sending Public Key"</strong></li>
                  <li>4. Submit the key</li>
                </ol>
                <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded border-l-4 border-purple-600">
                  <p className="font-medium">💡 Note:</p>
                  <p>You use the same public key file for both receiving and sending - just select the appropriate key type for each upload.</p>
                </div>
              </div>
            </div>

            {/* Step 4: Amazon Provides SFTP Details */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200/50">
              <h3 className="font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                ✅ Amazon Provides SFTP Connection Details
              </h3>
              <div className="space-y-4 text-sm text-green-600 dark:text-green-400">
                <p><strong>After uploading both keys, Amazon provides these connection details:</strong></p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-100 dark:bg-green-800 p-3 rounded border-l-4 border-green-600">
                    <h4 className="font-semibold mb-2">📥 Receiving from Amazon</h4>
                    <div className="space-y-1 font-mono text-xs">
                      <div>Host: <span className="text-green-800 dark:text-green-200">eu-sftp.amazonsedi.com:22</span></div>
                      <div>Username: <span className="text-green-800 dark:text-green-200">39ZYAQGPS10UV</span></div>
                      <div>Directory: <span className="text-green-800 dark:text-green-200">download</span></div>
                      <div>Key MD5: <span className="text-green-800 dark:text-green-200">3d9738f4f7e472c532147bd85145f69c</span></div>
                    </div>
                  </div>
                  
                  <div className="bg-green-100 dark:bg-green-800 p-3 rounded border-l-4 border-green-600">
                    <h4 className="font-semibold mb-2">📤 Sending to Amazon</h4>
                    <div className="space-y-1 font-mono text-xs">
                      <div>Host: <span className="text-green-800 dark:text-green-200">eu-sftp.amazonsedi.com:22</span></div>
                      <div>Username: <span className="text-green-800 dark:text-green-200">18DL8XNNYWXN1</span></div>
                      <div>Directory: <span className="text-green-800 dark:text-green-200">upload</span></div>
                      <div>Key MD5: <span className="text-green-800 dark:text-green-200">3d9738f4f7e472c532147bd85145f69c</span></div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-green-100 dark:bg-green-800 rounded border-l-4 border-green-600">
                  <p className="font-medium">🎉 Ready to Configure!</p>
                  <p>Use these Amazon-provided details in the form below to complete your integration setup.</p>
                </div>
              </div>
            </div>


            {/* Step 5: Test Connection */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200/50">
              <h3 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</span>
                Test Connection (Optional)
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-indigo-600 dark:text-indigo-400">
                  Test your connection using:
                </p>
                <div className="bg-black/80 text-green-400 p-3 rounded font-mono text-sm overflow-x-auto">
                  sftp -i amazon_vendor_key username@hostname
                </div>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">
                  Replace <code>username</code> and <code>hostname</code> with the details Amazon provided.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setShowSSHInstructions(false)}>
              Got it, thanks!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}