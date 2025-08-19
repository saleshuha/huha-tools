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
import { Plus, Key, Upload, Download, Trash2, Send, CheckCircle, XCircle, Clock, Inbox, TestTube, RefreshCw, Shield, Copy, FileText, Settings } from 'lucide-react';
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
    receiveFiles,
    sendTestFile,
    diagnoseIntegration,
  } = useVendorIntegration();

  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);
  const [showSSHInstructions, setShowSSHInstructions] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [formData, setFormData] = useState({
    vendor_name: 'Amazon Vendor Central',
    transport_method: 'SFTP',
    sftp_host: '',
    sftp_port: 22,
    sftp_username: '',
    sftp_remote_path: 'upload',
    sftp_receive_host: '',
    sftp_receive_port: 22,
    sftp_receive_username: '',
    sftp_receive_remote_path: 'download',
    ssh_fingerprint_sending: '',
    ssh_fingerprint_receiving: '',
    as2_endpoint_url: '',
    as2_partner_id: '',
    as2_sender_id: '',
    as2_receiver_id: '',
    as2_certificate_path: '',
    as2_private_key_path: '',
    as2_encryption_algorithm: 'AES128',
    as2_signature_algorithm: 'SHA256',
    as2_compression: false,
    as2_mdn_required: true,
    as2_async_mdn: false,
    as2_retry_count: 3,
    country: selectedCountry,
    primary_key_type: 'SKU',
    feed_schedule: 'daily',
    is_active: false,
  });

  const [sshKeyGenerated, setSshKeyGenerated] = useState(false);
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
        setShowSetupDialog(false);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_name: 'Amazon Vendor Central',
      transport_method: 'SFTP',
      sftp_host: '',
      sftp_port: 22,
      sftp_username: '',
      sftp_remote_path: 'upload',
      sftp_receive_host: '',
      sftp_receive_port: 22,
      sftp_receive_username: '',
      sftp_receive_remote_path: 'download',
      ssh_fingerprint_sending: '',
      ssh_fingerprint_receiving: '',
      as2_endpoint_url: '',
      as2_partner_id: '',
      as2_sender_id: '',
      as2_receiver_id: '',
      as2_certificate_path: '',
      as2_private_key_path: '',
      as2_encryption_algorithm: 'AES128',
      as2_signature_algorithm: 'SHA256',
      as2_compression: false,
      as2_mdn_required: true,
      as2_async_mdn: false,
      as2_retry_count: 3,
      country: selectedCountry,
      primary_key_type: 'SKU',
      feed_schedule: 'daily',
      is_active: false,
    });
    setSshKeyGenerated(false);
    setSshKeyUploaded(false);
    setSetupStep(1);
  };

  const handleEdit = (integration: any) => {
    setFormData({
      vendor_name: integration.vendor_name,
      transport_method: integration.transport_method,
      sftp_host: integration.sftp_host || '',
      sftp_port: integration.sftp_port || 22,
      sftp_username: integration.sftp_username || '',
      sftp_remote_path: integration.sftp_remote_path || 'upload',
      sftp_receive_host: integration.sftp_receive_host || '',
      sftp_receive_port: integration.sftp_receive_port || 22,
      sftp_receive_username: integration.sftp_receive_username || '',
      sftp_receive_remote_path: integration.sftp_receive_remote_path || 'download',
      ssh_fingerprint_sending: integration.ssh_fingerprint_sending || '',
      ssh_fingerprint_receiving: integration.ssh_fingerprint_receiving || '',
      as2_endpoint_url: integration.as2_endpoint_url || '',
      as2_partner_id: integration.as2_partner_id || '',
      as2_sender_id: integration.as2_sender_id || '',
      as2_receiver_id: integration.as2_receiver_id || '',
      as2_certificate_path: integration.as2_certificate_path || '',
      as2_private_key_path: integration.as2_private_key_path || '',
      as2_encryption_algorithm: integration.as2_encryption_algorithm || 'AES128',
      as2_signature_algorithm: integration.as2_signature_algorithm || 'SHA256',
      as2_compression: integration.as2_compression || false,
      as2_mdn_required: integration.as2_mdn_required !== false,
      as2_async_mdn: integration.as2_async_mdn || false,
      as2_retry_count: integration.as2_retry_count || 3,
      country: integration.country,
      primary_key_type: integration.primary_key_type,
      feed_schedule: integration.feed_schedule,
      is_active: integration.is_active,
    });
    setSshKeyGenerated(!!integration.sftp_host || !!integration.as2_endpoint_url);
    setSshKeyUploaded(!!integration.sftp_host || !!integration.as2_endpoint_url);
    setSetupStep(4);
    setEditingIntegration(integration.id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleGenerateFeed = async (integrationId: string) => {
    await generateInventoryFeed(integrationId);
  };

  const handleSendTestFile = async (integrationId: string) => {
    const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<transmission sendingPartyID="VENDOR" receivingPartyID="AMAZONDS" transmissionControlNumber="000000001" transmissionCreationDate="${new Date().toISOString()}" transmissionStructureVersion="2.2" messageCount="1" isTest="1">
  <message sendingPartyID="VENDOR" receivingPartyID="AMAZONDS" messageControlNumber="000000001" messageCreationDate="${new Date().toISOString()}" messageStructureVersion="2.2" messageType="OFR" isTest="1">
    <OrderFulfillmentResponse>
      <vendorParty type="BUYER_ASSIGNED"><partyID>VENDOR</partyID></vendorParty>
      <warehouseLocationID>WAREHOUSE</warehouseLocationID>
      <purchaseOrderNumber>TEST-PO-001</purchaseOrderNumber>
      <vendorOrderNumber>TEST-VO-001</vendorOrderNumber>
      <orderAcceptedDate><dateTime>${new Date().toISOString()}</dateTime></orderAcceptedDate>
      <orderResult><responseCondition>SUCCESS</responseCondition><resultCode>00</resultCode><resultDescription>Test order response</resultDescription></orderResult>
      <orderLineItemDetail>
        <lineItemSequenceNumber>1</lineItemSequenceNumber>
        <itemID type="AMAZON_ASIN">B00TEST123</itemID>
        <quantityAccepted><quantity unitOfMeasure="EA">1</quantity></quantityAccepted>
        <quantityAvailable><quantity unitOfMeasure="EA">100</quantity></quantityAvailable>
        <orderLineItemResult><responseCondition>SUCCESS</responseCondition><resultCode>00</resultCode><resultDescription>Test item accepted</resultDescription></orderLineItemResult>
      </orderLineItemDetail>
    </OrderFulfillmentResponse>
  </message>
</transmission>`;
    
    await sendTestFile(integrationId, testXML, 'test_order_response.xml');
  };

  const handleDiagnose = async () => {
    const diagnosis = await diagnoseIntegration();
    if (diagnosis) {
      alert(JSON.stringify(diagnosis, null, 2));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'acknowledged':
      case 'received':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'acknowledged':
      case 'received':
        return 'bg-success/10 text-success border-success/20';
      case 'failed':
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-warning/10 text-warning border-warning/20';
    }
  };

  const renderSetupStep = () => {
    switch (setupStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Key className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Choose Integration Method</h3>
              <p className="text-muted-foreground mb-6">
                Select how you want to connect with Amazon. You can use SFTP (SSH File Transfer) or AS2 (Applicability Statement 2) protocol.
              </p>
            </div>
            
            <div className="space-y-4">
              <Label htmlFor="transport_method">Transport Method</Label>
              <Select
                value={formData.transport_method}
                onValueChange={(value) => setFormData({ ...formData, transport_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SFTP">SFTP (SSH File Transfer Protocol)</SelectItem>
                  <SelectItem value="AS2">AS2 (Applicability Statement 2)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.transport_method === 'SFTP' ? (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">SFTP Setup Requirements:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>SSH key pair (we'll generate this for you)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Access to Amazon Vendor Central portal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>SFTP connection details from Amazon</span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">AS2 Setup Requirements:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Digital certificates for AS2 encryption/signing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Amazon AS2 endpoint details</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Firewall configuration for Amazon IP ranges</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200/50">
                  <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Required Firewall IP Ranges:</h5>
                  <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                    <li>• 54.217.255.192/29</li>
                    <li>• 54.217.255.200/30</li>
                    <li>• 54.217.255.204/31</li>
                    <li>• 54.195.239.0/28</li>
                    <li>• 34.253.190.128/26</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (formData.transport_method === 'SFTP') {
                  setShowSSHInstructions(true);
                  setSshKeyGenerated(true);
                  setSetupStep(2);
                } else {
                  setSetupStep(2);
                }
              }}>
                {formData.transport_method === 'SFTP' ? (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Generate SSH Keys
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Configure AS2
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 2:
        if (formData.transport_method === 'SFTP') {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Store Your Private Key Securely</h3>
                <p className="text-muted-foreground mb-6">
                  First, we need to store your private key securely in our encrypted system.
                </p>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200/50">
                <h4 className="font-medium mb-3 text-red-700 dark:text-red-300">🔒 Security Notice:</h4>
                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                  <li>• Copy your PRIVATE key content (not the .pub file)</li>
                  <li>• This key will be encrypted and stored securely</li>
                  <li>• Never share your private key with anyone else</li>
                  <li>• You can update this anytime in project settings</li>
                </ul>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Copy your private key:</h4>
                <div className="bg-black p-3 rounded text-green-400 font-mono text-sm">
                  cat ~/.ssh/amazon_vendor_key
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => copyToClipboard('cat ~/.ssh/amazon_vendor_key')}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Command
                </Button>
              </div>

              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50">
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  We've set up a secure storage for your SSH private key. Click the button above to update it with your key content.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  The secret "AMAZON_SFTP_PRIVATE_KEY" is ready to be configured.
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setSetupStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setSetupStep(3)}>
                  Private Key Stored - Next Step
                </Button>
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Configure AS2 Certificates</h3>
                <p className="text-muted-foreground mb-6">
                  AS2 uses digital certificates for secure message exchange. We'll help you set up the required certificates.
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200/50">
                <h4 className="font-medium mb-3 text-blue-700 dark:text-blue-300">📋 AS2 Setup Steps:</h4>
                <ol className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
                  <li><strong>1.</strong> Generate your AS2 certificate and private key</li>
                  <li><strong>2.</strong> Upload your public certificate to Amazon Vendor Central</li>
                  <li><strong>3.</strong> Configure firewall to allow Amazon's IP ranges</li>
                  <li><strong>4.</strong> Amazon will provide AS2 connection details</li>
                  <li><strong>5.</strong> Configure endpoint URL and partner identifiers</li>
                </ol>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200/50">
                <h4 className="font-medium mb-2 text-yellow-700 dark:text-yellow-300">🔐 Certificate Requirements:</h4>
                <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                  <li>• X.509 certificates in PEM format</li>
                  <li>• RSA or ECDSA keys (2048-bit minimum)</li>
                  <li>• Valid for at least 1 year</li>
                  <li>• Subject Name should match your organization</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setSetupStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setSetupStep(3)}>
                  Certificates Ready - Next Step
                </Button>
              </div>
            </div>
          );
        }

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Upload className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Upload Public Key to Amazon</h3>
              <p className="text-muted-foreground mb-6">
                Upload your public key to Amazon Vendor Central. They'll provide connection details after activation.
              </p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200/50">
              <h4 className="font-medium mb-3 text-blue-700 dark:text-blue-300">📤 Upload Steps:</h4>
              <ol className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
                <li><strong>1.</strong> Log in to Amazon Vendor Central</li>
                <li><strong>2.</strong> Navigate to "Settings" → "EDI Settings"</li>
                <li><strong>3.</strong> Find "SFTP Key Management" section</li>
                <li><strong>4.</strong> Upload your PUBLIC key (.pub file)</li>
                <li><strong>5.</strong> Wait for Amazon to activate (24-48 hours)</li>
                <li><strong>6.</strong> Amazon will send you SFTP connection details</li>
              </ol>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Copy your PUBLIC key to upload:</h4>
              <div className="bg-black p-3 rounded text-green-400 font-mono text-sm">
                cat ~/.ssh/amazon_vendor_key.pub
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2"
                onClick={() => copyToClipboard('cat ~/.ssh/amazon_vendor_key.pub')}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Command
              </Button>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200/50">
              <h4 className="font-medium mb-2 text-yellow-700 dark:text-yellow-300">⏳ What happens next:</h4>
              <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                <li>• Amazon reviews and activates your SSH key</li>
                <li>• You'll receive an email with SFTP details</li>
                <li>• Details include: hostnames, usernames, directories</li>
                <li>• Process typically takes 24-48 hours</li>
              </ul>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <Switch
                id="ssh_key_uploaded"
                checked={sshKeyUploaded}
                onCheckedChange={setSshKeyUploaded}
              />
              <Label htmlFor="ssh_key_uploaded" className="text-sm">
                I have uploaded my public key to Amazon and received connection details
              </Label>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setSetupStep(2)}>
                Back
              </Button>
              <Button 
                onClick={() => setSetupStep(4)} 
                disabled={!sshKeyUploaded}
              >
                I Have Amazon's Connection Details
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <Settings className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Configure Amazon Connection</h3>
              <p className="text-muted-foreground">
                {formData.transport_method === 'SFTP' 
                  ? 'Enter the SFTP connection details that Amazon provided after activating your SSH key'
                  : 'Enter the AS2 endpoint details and certificate information provided by Amazon'
                }
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200/50">
              <h4 className="font-medium mb-3 text-green-700 dark:text-green-300">✅ Ready to Configure:</h4>
              <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                {formData.transport_method === 'SFTP' ? (
                  <>
                    <li>• SSH private key stored securely</li>
                    <li>• Public key uploaded to Amazon</li>
                    <li>• Amazon has provided connection details</li>
                    <li>• Ready to configure integration</li>
                  </>
                ) : (
                  <>
                    <li>• AS2 certificates configured</li>
                    <li>• Certificate uploaded to Amazon</li>
                    <li>• Amazon has provided AS2 endpoint details</li>
                    <li>• Firewall configured for Amazon IP ranges</li>
                  </>
                )}
              </ul>
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
                    <SelectItem value="SFTP">SFTP (SSH File Transfer Protocol)</SelectItem>
                    <SelectItem value="AS2">AS2 (Applicability Statement 2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    <SelectItem value="UPC">UPC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Configuration based on transport method */}
            {formData.transport_method === 'SFTP' ? (
              <>
                {/* SFTP Sending Configuration */}
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    SFTP Sending to Amazon (Inventory Feeds)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sftp_host">SFTP Host</Label>
                      <Input
                        id="sftp_host"
                        value={formData.sftp_host}
                        onChange={(e) => setFormData({ ...formData, sftp_host: e.target.value })}
                        placeholder="eu-sftp.amazonsedi.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sftp_username">Username</Label>
                      <Input
                        id="sftp_username"
                        value={formData.sftp_username}
                        onChange={(e) => setFormData({ ...formData, sftp_username: e.target.value })}
                        placeholder="Amazon provided username"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sftp_remote_path">Upload Directory</Label>
                      <Input
                        id="sftp_remote_path"
                        value={formData.sftp_remote_path}
                        onChange={(e) => setFormData({ ...formData, sftp_remote_path: e.target.value })}
                        placeholder="upload"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ssh_fingerprint_sending">SSH Fingerprint</Label>
                      <Input
                        id="ssh_fingerprint_sending"
                        value={formData.ssh_fingerprint_sending}
                        onChange={(e) => setFormData({ ...formData, ssh_fingerprint_sending: e.target.value })}
                        placeholder="MD5 fingerprint from Amazon"
                      />
                    </div>
                  </div>
                </div>

                {/* SFTP Receiving Configuration */}
                <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200/50">
                  <h4 className="font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    SFTP Receiving from Amazon (Orders, Acknowledgments)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sftp_receive_host">SFTP Host</Label>
                      <Input
                        id="sftp_receive_host"
                        value={formData.sftp_receive_host}
                        onChange={(e) => setFormData({ ...formData, sftp_receive_host: e.target.value })}
                        placeholder="eu-sftp.amazonsedi.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sftp_receive_username">Username</Label>
                      <Input
                        id="sftp_receive_username"
                        value={formData.sftp_receive_username}
                        onChange={(e) => setFormData({ ...formData, sftp_receive_username: e.target.value })}
                        placeholder="Amazon provided username"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sftp_receive_remote_path">Download Directory</Label>
                      <Input
                        id="sftp_receive_remote_path"
                        value={formData.sftp_receive_remote_path}
                        onChange={(e) => setFormData({ ...formData, sftp_receive_remote_path: e.target.value })}
                        placeholder="download"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ssh_fingerprint_receiving">SSH Fingerprint</Label>
                      <Input
                        id="ssh_fingerprint_receiving"
                        value={formData.ssh_fingerprint_receiving}
                        onChange={(e) => setFormData({ ...formData, ssh_fingerprint_receiving: e.target.value })}
                        placeholder="MD5 fingerprint from Amazon"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* AS2 Configuration */}
                <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200/50">
                  <h4 className="font-medium text-orange-700 dark:text-orange-300 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    AS2 Connection Settings
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="as2_endpoint_url">AS2 Endpoint URL</Label>
                      <Input
                        id="as2_endpoint_url"
                        value={formData.as2_endpoint_url}
                        onChange={(e) => setFormData({ ...formData, as2_endpoint_url: e.target.value })}
                        placeholder="https://as2.amazonaws.com/endpoint"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="as2_partner_id">Partner ID</Label>
                      <Input
                        id="as2_partner_id"
                        value={formData.as2_partner_id}
                        onChange={(e) => setFormData({ ...formData, as2_partner_id: e.target.value })}
                        placeholder="Amazon Partner ID"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="as2_sender_id">Your AS2 ID (Sender)</Label>
                      <Input
                        id="as2_sender_id"
                        value={formData.as2_sender_id}
                        onChange={(e) => setFormData({ ...formData, as2_sender_id: e.target.value })}
                        placeholder="Your AS2 identifier"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="as2_receiver_id">Amazon AS2 ID (Receiver)</Label>
                      <Input
                        id="as2_receiver_id"
                        value={formData.as2_receiver_id}
                        onChange={(e) => setFormData({ ...formData, as2_receiver_id: e.target.value })}
                        placeholder="Amazon AS2 identifier"
                      />
                    </div>
                  </div>
                </div>

                {/* AS2 Security Settings */}
                <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200/50">
                  <h4 className="font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    AS2 Security & Certificates
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="as2_certificate_path">Certificate Path</Label>
                      <Input
                        id="as2_certificate_path"
                        value={formData.as2_certificate_path}
                        onChange={(e) => setFormData({ ...formData, as2_certificate_path: e.target.value })}
                        placeholder="/path/to/certificate.pem"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="as2_private_key_path">Private Key Path</Label>
                      <Input
                        id="as2_private_key_path"
                        value={formData.as2_private_key_path}
                        onChange={(e) => setFormData({ ...formData, as2_private_key_path: e.target.value })}
                        placeholder="/path/to/private_key.pem"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="as2_encryption_algorithm">Encryption Algorithm</Label>
                      <Select
                        value={formData.as2_encryption_algorithm}
                        onValueChange={(value) => setFormData({ ...formData, as2_encryption_algorithm: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AES128">AES 128</SelectItem>
                          <SelectItem value="AES192">AES 192</SelectItem>
                          <SelectItem value="AES256">AES 256</SelectItem>
                          <SelectItem value="3DES">3DES</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="as2_signature_algorithm">Signature Algorithm</Label>
                      <Select
                        value={formData.as2_signature_algorithm}
                        onValueChange={(value) => setFormData({ ...formData, as2_signature_algorithm: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SHA1">SHA-1</SelectItem>
                          <SelectItem value="SHA256">SHA-256</SelectItem>
                          <SelectItem value="SHA384">SHA-384</SelectItem>
                          <SelectItem value="SHA512">SHA-512</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="as2_compression"
                        checked={formData.as2_compression}
                        onCheckedChange={(checked) => setFormData({ ...formData, as2_compression: checked })}
                      />
                      <Label htmlFor="as2_compression" className="text-sm">Enable Compression</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="as2_mdn_required"
                        checked={formData.as2_mdn_required}
                        onCheckedChange={(checked) => setFormData({ ...formData, as2_mdn_required: checked })}
                      />
                      <Label htmlFor="as2_mdn_required" className="text-sm">Require MDN</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="as2_async_mdn"
                        checked={formData.as2_async_mdn}
                        onCheckedChange={(checked) => setFormData({ ...formData, as2_async_mdn: checked })}
                      />
                      <Label htmlFor="as2_async_mdn" className="text-sm">Async MDN</Label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Schedule Configuration */}
            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="manual">Manual Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-7">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Activate Integration</Label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setSetupStep(3)}>
                Back
              </Button>
              <Button type="submit" disabled={loading}>
                {editingIntegration ? 'Update Integration' : 'Create Integration'}
              </Button>
            </div>
          </form>
        );

      default:
        return null;
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
            Manage secure file transfers with Amazon Vendor Central using SFTP or AS2 for {selectedCountry}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleDiagnose}>
            🔍 Diagnose Integration
          </Button>
        </div>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="feed-history">Feed History</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Amazon Integrations</h3>
              <p className="text-sm text-muted-foreground">
                Secure connections using SFTP or AS2 protocols
              </p>
            </div>
            <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Setup New Integration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingIntegration ? 'Edit Integration' : 'Amazon Vendor Central Setup'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingIntegration 
                      ? 'Update your integration settings'
                      : 'Set up secure file transfer with Amazon using SFTP or AS2'
                    }
                  </DialogDescription>
                </DialogHeader>
                {renderSetupStep()}
              </DialogContent>
            </Dialog>
          </div>

          {/* Integration Cards */}
          <div className="space-y-4">
            {integrations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Key className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Integrations Configured</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Set up your first Amazon Vendor Central integration with SFTP or AS2.
                  </p>
                  <Button onClick={() => setShowSetupDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Setup Integration
                  </Button>
                </CardContent>
              </Card>
            ) : (
              integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-primary" />
                          {integration.vendor_name}
                        </CardTitle>
                        <CardDescription>
                          {integration.country} • {integration.transport_method} • {integration.primary_key_type}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={integration.is_active ? "default" : "secondary"}
                        >
                          {integration.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Connection Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">{integration.transport_method} Endpoint:</span>
                          <p className="text-muted-foreground">
                            {integration.transport_method === 'SFTP' 
                              ? (integration.sftp_host || 'Not configured')
                              : ((integration as any).as2_endpoint_url || 'Not configured')
                            }
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Protocol:</span>
                          <p className="text-muted-foreground">{integration.transport_method}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleGenerateFeed(integration.id)}
                          disabled={loading || !integration.is_active}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send Feed
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => receiveFiles(integration.id)}
                          disabled={loading || !integration.is_active}
                        >
                          <Inbox className="w-4 h-4 mr-2" />
                          Receive Files
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSendTestFile(integration.id)}
                          disabled={loading || !integration.is_active}
                        >
                          <TestTube className="w-4 h-4 mr-2" />
                          Send Test
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(integration)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Integration</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the integration and all associated logs.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteIntegration(integration.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="feed-history" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Feed Activity Log</h3>
              <p className="text-sm text-muted-foreground">
                Track all file transfers and operations
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => loadFeedLogs()}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="space-y-4">
            {feedLogs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Feed History</h3>
                  <p className="text-muted-foreground text-center">
                    Feed activity will appear here once you start sending or receiving files.
                  </p>
                </CardContent>
              </Card>
            ) : (
              feedLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(log.status)}
                        <div>
                          <p className="font-medium">{log.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {log.feed_type} • {log.total_items || 0} items
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    </div>
                    {log.error_message && (
                      <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-sm text-destructive">{log.error_message}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* SSH Instructions Dialog */}
      <Dialog open={showSSHInstructions} onOpenChange={setShowSSHInstructions}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>SSH Key Generation Instructions</DialogTitle>
            <DialogDescription>
              Follow these steps to generate SSH keys for Amazon Vendor Central
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Step 1: Generate SSH Key Pair</h4>
              <div className="bg-black p-3 rounded text-green-400 font-mono text-sm">
                ssh-keygen -t rsa -b 4096 -f ~/.ssh/amazon_vendor_key -C "your-email@domain.com"
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2"
                onClick={() => copyToClipboard('ssh-keygen -t rsa -b 4096 -f ~/.ssh/amazon_vendor_key -C "your-email@domain.com"')}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Command
              </Button>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Step 2: View Your Public Key</h4>
              <div className="bg-black p-3 rounded text-green-400 font-mono text-sm">
                cat ~/.ssh/amazon_vendor_key.pub
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2"
                onClick={() => copyToClipboard('cat ~/.ssh/amazon_vendor_key.pub')}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Command
              </Button>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Step 3: Secure Your Private Key</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Store the private key content as a secret in our system:
              </p>
              <div className="bg-black p-3 rounded text-green-400 font-mono text-sm">
                cat ~/.ssh/amazon_vendor_key
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2"
                onClick={() => copyToClipboard('cat ~/.ssh/amazon_vendor_key')}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Command
              </Button>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200/50">
              <h4 className="font-medium mb-2 text-yellow-700 dark:text-yellow-300">⚠️ Important Security Notes:</h4>
              <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                <li>• Never share your private key with anyone</li>
                <li>• Only upload the public key (.pub) to Amazon</li>
                <li>• Store the private key securely in our encrypted secrets</li>
                <li>• Use a strong passphrase if prompted</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setShowSSHInstructions(false)}>
                Got it!
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}