import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner';
import {
  Camera, Keyboard, CheckCircle2, AlertTriangle, XCircle,
  Package, ScanBarcode, Search
} from 'lucide-react';
import type { AuditSession, AuditScan, InventoryItem } from '@/hooks/useStockAudit';

interface AuditScannerProps {
  session: AuditSession;
  scans: AuditScan[];
  scanLoading: boolean;
  onScanBarcode: (barcode: string) => Promise<any>;
}

export function AuditScanner({ session, scans, scanLoading, onScanBarcode }: AuditScannerProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('manual');
  const [manualInput, setManualInput] = useState('');
  const [lastResult, setLastResult] = useState<{ scan: AuditScan; item: InventoryItem | null; matchStatus: string } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const handleScan = useCallback(async (barcode: string) => {
    const result = await onScanBarcode(barcode.trim());
    if (result) {
      setLastResult(result);
    }
    // Re-enable camera after scan
    setCameraActive(false);
    setTimeout(() => setCameraActive(true), 500);
  }, [onScanBarcode]);

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    handleScan(manualInput.trim());
    setManualInput('');
  };

  const matchedCount = scans.filter(s => s.match_status === 'matched').length;
  const unmatchedCount = scans.filter(s => s.match_status === 'unmatched').length;
  const duplicateCount = scans.filter(s => s.match_status === 'duplicate').length;
  const progress = session.total_system_items > 0
    ? Math.round((matchedCount / session.total_system_items) * 100)
    : 0;

  const isCompleted = session.status === 'completed';

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Audit Progress</span>
            <span className="text-sm text-muted-foreground">
              {matchedCount} / {session.total_system_items} items verified
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Matched: <strong className="text-foreground">{matchedCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-muted-foreground">Duplicates: <strong className="text-foreground">{duplicateCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-muted-foreground">Unmatched: <strong className="text-foreground">{unmatchedCount}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scanner Input */}
      {!isCompleted && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ScanBarcode className="h-5 w-5 text-primary" />
                Scan Item
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={mode === 'manual' ? 'default' : 'outline'}
                  onClick={() => { setMode('manual'); setCameraActive(false); }}
                >
                  <Keyboard className="h-4 w-4 mr-1" />
                  Manual
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'camera' ? 'default' : 'outline'}
                  onClick={() => { setMode('camera'); setCameraActive(true); }}
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Camera
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {mode === 'manual' ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Type or scan serial number / barcode..."
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                  disabled={scanLoading}
                  autoFocus
                />
                <Button onClick={handleManualSubmit} disabled={scanLoading || !manualInput.trim()}>
                  <Search className="h-4 w-4 mr-1" />
                  {scanLoading ? 'Scanning...' : 'Submit'}
                </Button>
              </div>
            ) : (
              <BarcodeScanner
                onScan={(barcode) => handleScan(barcode)}
                active={cameraActive}
                className="max-w-md mx-auto"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Last Scan Result */}
      {lastResult && (
        <Card className={
          lastResult.matchStatus === 'matched'
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : lastResult.matchStatus === 'duplicate'
              ? 'border-amber-500/50 bg-amber-500/5'
              : 'border-rose-500/50 bg-rose-500/5'
        }>
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              {lastResult.matchStatus === 'matched' && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
              {lastResult.matchStatus === 'duplicate' && <AlertTriangle className="h-6 w-6 text-amber-500" />}
              {lastResult.matchStatus === 'unmatched' && <XCircle className="h-6 w-6 text-rose-500" />}
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {lastResult.matchStatus === 'matched' && 'Item Verified ✓'}
                  {lastResult.matchStatus === 'duplicate' && 'Duplicate Scan!'}
                  {lastResult.matchStatus === 'unmatched' && 'Not Found in Inventory'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Barcode: {lastResult.scan.scanned_barcode}
                </div>
                {lastResult.item && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {lastResult.item.title} • {lastResult.item.asin} • SN: {lastResult.item.serial_number}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Scans */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Scans
            <Badge variant="outline" className="ml-auto">{scans.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scans.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No scans yet. Start scanning items!
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-1.5">
              {scans.slice(0, 50).map(scan => (
                <div
                  key={scan.id}
                  className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-muted/30"
                >
                  {scan.match_status === 'matched' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
                  {scan.match_status === 'duplicate' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                  {scan.match_status === 'unmatched' && <XCircle className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />}
                  <span className="font-mono flex-1 truncate">{scan.scanned_barcode}</span>
                  {scan.matched_asin && (
                    <span className="text-muted-foreground truncate max-w-[200px]">{scan.matched_asin}</span>
                  )}
                  <span className="text-muted-foreground flex-shrink-0">
                    {new Date(scan.scanned_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
