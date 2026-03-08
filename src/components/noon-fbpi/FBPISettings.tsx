import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Settings, Key, Copy, Webhook, Trash2, ShieldOff, Plus, Send, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { NoonStoreConfig, WebhookKey, FBPIOrder } from '@/hooks/useNoonFBPI';
import { format } from 'date-fns';

interface FBPISettingsProps {
  stores: NoonStoreConfig[];
  orders: FBPIOrder[];
  loading: boolean;
  webhookKeys: WebhookKey[];
  onTestConnection: (storeId: string) => Promise<boolean>;
  onUpdateCredentials: (storeId: string, credentials: any) => Promise<boolean>;
  onGenerateWebhookKey: (storeId?: string) => Promise<boolean>;
  onRevokeWebhookKey: (keyId: string) => Promise<boolean>;
  onDeleteWebhookKey: (keyId: string) => Promise<boolean>;
  onTestWebhook: (apiKey: string) => Promise<boolean>;
}

const WEBHOOK_URL = `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/noon-fbpi-webhook`;

export function FBPISettings({
  stores,
  loading,
  webhookKeys,
  onTestConnection,
  onUpdateCredentials,
  onGenerateWebhookKey,
  onRevokeWebhookKey,
  onDeleteWebhookKey,
}: FBPISettingsProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [apiKeyId, setApiKeyId] = useState('');
  const [apiProjectCode, setApiProjectCode] = useState('');
  const [apiPrivateKey, setApiPrivateKey] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const selectedStore = stores.find(s => s.id === selectedStoreId);

  const handleStoreSelect = (storeId: string) => {
    setSelectedStoreId(storeId);
    const store = stores.find(s => s.id === storeId);
    if (store) {
      setApiKeyId(store.api_key_id || '');
      setApiProjectCode(store.api_project_code || '');
      setWarehouseCode(store.warehouse_code || '');
      setApiPrivateKey('');
      setConnectionStatus('idle');
    }
  };

  const handleSave = async () => {
    if (!selectedStoreId) return;
    const creds: any = {
      api_key_id: apiKeyId,
      api_project_code: apiProjectCode,
      warehouse_code: warehouseCode,
    };
    if (apiPrivateKey) creds.api_private_key = apiPrivateKey;
    await onUpdateCredentials(selectedStoreId, creds);
  };

  const handleTest = async () => {
    if (!selectedStoreId) return;
    const success = await onTestConnection(selectedStoreId);
    setConnectionStatus(success ? 'success' : 'error');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  return (
    <div className="space-y-6">
      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Endpoint
          </CardTitle>
          <CardDescription>
            Share this webhook URL with Noon's integration team to receive FBPI orders automatically.
            Orders pushed to this endpoint will be matched against your in-stock inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Webhook URL</Label>
            <div className="flex gap-2 mt-1">
              <Input value={WEBHOOK_URL} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(WEBHOOK_URL, 'Webhook URL')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/50 p-3 text-sm space-y-2">
            <p className="font-medium">How to use:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Generate an API key below</li>
              <li>Share the webhook URL with Noon's integration team</li>
              <li>Include the API key as <code className="bg-muted px-1 rounded">?key=YOUR_KEY</code> or <code className="bg-muted px-1 rounded">x-api-key</code> header</li>
              <li>Orders will appear in the Orders tab with inventory matching</li>
            </ol>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>API Keys</Label>
              <Button
                size="sm"
                onClick={() => onGenerateWebhookKey(selectedStoreId || undefined)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Generate Key
              </Button>
            </div>

            {webhookKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No API keys yet. Generate one to get started.</p>
            ) : (
              <div className="space-y-2">
                {webhookKeys.map((wk) => (
                  <div
                    key={wk.id}
                    className="flex items-center gap-2 p-2 rounded-md border border-border bg-background"
                  >
                    <code className="text-xs font-mono flex-1 truncate">{wk.api_key}</code>
                    <Badge variant={wk.is_active ? 'default' : 'secondary'}>
                      {wk.is_active ? 'Active' : 'Revoked'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        copyToClipboard(
                          `${WEBHOOK_URL}?key=${wk.api_key}`,
                          'Full webhook URL with key'
                        )
                      }
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {wk.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => onRevokeWebhookKey(wk.id)}
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onDeleteWebhookKey(wk.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-muted/50 p-3">
            <p className="font-medium text-sm mb-2">Example Payload:</p>
            <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre">{`POST ${WEBHOOK_URL}?key=YOUR_KEY
Content-Type: application/json

{
  "fbpi_order_nr": "FBPI-12345",
  "mp_order_nr": "MP-67890",
  "mp_country_code": "AE",
  "warehouse_code": "WH01",
  "currency_code": "AED",
  "items": [
    { "partner_sku": "SKU-001", "quantity": 2 },
    { "partner_sku": "SKU-002", "quantity": 1 }
  ]
}`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            FBPI API Configuration
          </CardTitle>
          <CardDescription>
            Configure your Noon FBPI API credentials from the service account JSON file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Store</Label>
            <Select value={selectedStoreId} onValueChange={handleStoreSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Noon store..." />
              </SelectTrigger>
              <SelectContent>
                {stores.map(store => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name} ({store.country})
                    {store.api_key_id && ' ✓'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStoreId && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="api_key_id">Key ID</Label>
                  <Input
                    id="api_key_id"
                    value={apiKeyId}
                    onChange={(e) => setApiKeyId(e.target.value)}
                    placeholder="From service account JSON"
                  />
                </div>
                <div>
                  <Label htmlFor="api_project_code">Project Code</Label>
                  <Input
                    id="api_project_code"
                    value={apiProjectCode}
                    onChange={(e) => setApiProjectCode(e.target.value)}
                    placeholder="e.g. noon-project-code"
                  />
                </div>
                <div>
                  <Label htmlFor="warehouse_code">Warehouse Code</Label>
                  <Input
                    id="warehouse_code"
                    value={warehouseCode}
                    onChange={(e) => setWarehouseCode(e.target.value)}
                    placeholder="FBPI warehouse code"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Badge variant={selectedStore?.api_key_id ? 'default' : 'secondary'}>
                    <Key className="h-3 w-3 mr-1" />
                    {selectedStore?.api_key_id ? 'Credentials Set' : 'Not Configured'}
                  </Badge>
                </div>
              </div>

              <div>
                <Label htmlFor="api_private_key">
                  RSA Private Key (PEM)
                  {selectedStore?.api_key_id && (
                    <span className="text-xs text-muted-foreground ml-2">
                      Leave blank to keep existing key
                    </span>
                  )}
                </Label>
                <textarea
                  id="api_private_key"
                  value={apiPrivateKey}
                  onChange={(e) => setApiPrivateKey(e.target.value)}
                  placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                  rows={6}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Credentials
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={loading || !selectedStore?.api_key_id}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Test Connection
                </Button>
                {connectionStatus === 'success' && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                  </Badge>
                )}
                {connectionStatus === 'error' && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" /> Failed
                  </Badge>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
