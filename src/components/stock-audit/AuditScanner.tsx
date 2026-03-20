import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner';
import {
  Camera, Keyboard, CheckCircle2, AlertTriangle, XCircle,
  Package, ScanBarcode, Search, Plus, Minus, Hash, Repeat
} from 'lucide-react';
import type { AuditSession, AuditScan, AsinGroup } from '@/hooks/useStockAudit';

interface AuditScannerProps {
  session: AuditSession;
  scans: AuditScan[];
  asinGroups: AsinGroup[];
  scanLoading: boolean;
  onScanBarcode: (barcode: string, quantity?: number) => Promise<any>;
  onAdjustQty: (asin: string, newQty: number) => Promise<void>;
}

export function AuditScanner({
  session, scans, asinGroups, scanLoading, onScanBarcode, onAdjustQty,
}: AuditScannerProps) {
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('manual');
  const [qtyMode, setQtyMode] = useState<'multi-scan' | 'manual-qty'>('multi-scan');
  const [manualInput, setManualInput] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const [pendingAsin, setPendingAsin] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input after each scan
  useEffect(() => {
    if (inputMode === 'manual' && inputRef.current && !scanLoading) {
      inputRef.current.focus();
    }
  }, [scanLoading, inputMode, lastResult]);

  const handleScan = useCallback(async (barcode: string, qty: number = 1) => {
    const result = await onScanBarcode(barcode.trim(), qty);
    if (result) {
      setLastResult(result);
      setPendingAsin(null);
    }
    setCameraActive(false);
    setTimeout(() => setCameraActive(true), 500);
  }, [onScanBarcode]);

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    if (qtyMode === 'manual-qty') {
      // In manual-qty mode, first scan identifies the ASIN, then user enters qty
      if (!pendingAsin) {
        // Check if this ASIN exists before committing
        setPendingAsin(manualInput.trim());
        setManualInput('');
        setManualQty('1');
        return;
      }
    }
    handleScan(manualInput.trim(), qtyMode === 'multi-scan' ? 1 : parseInt(manualQty) || 1);
    setManualInput('');
    setManualQty('1');
  };

  const handleQtySubmit = () => {
    if (!pendingAsin) return;
    const qty = parseInt(manualQty) || 1;
    handleScan(pendingAsin, qty);
    setManualQty('1');
  };

  const cancelPending = () => {
    setPendingAsin(null);
    setManualQty('1');
  };

  // Stats
  const verifiedAsins = asinGroups.filter(g => g.scannedQty > 0);
  const fullyVerified = asinGroups.filter(g => g.scannedQty >= g.systemQty && g.systemQty > 0);
  const partiallyScanned = asinGroups.filter(g => g.scannedQty > 0 && g.scannedQty < g.systemQty);
  const totalAsins = asinGroups.filter(g => g.systemQty > 0).length;
  const progress = totalAsins > 0 ? Math.round((fullyVerified.length / totalAsins) * 100) : 0;
  const unmatchedCount = scans.filter(s => s.match_status === 'unmatched').length;
  const isCompleted = session.status === 'completed';

  // Recent scans grouped by ASIN
  const recentAsinScans = asinGroups
    .filter(g => g.scannedQty > 0)
    .sort((a, b) => {
      const aLatest = scans.find(s => s.matched_asin === a.asin)?.scanned_at || '';
      const bLatest = scans.find(s => s.matched_asin === b.asin)?.scanned_at || '';
      return bLatest.localeCompare(aLatest);
    })
    .slice(0, 20);

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Audit Progress</span>
            <span className="text-sm text-muted-foreground">
              {fullyVerified.length} / {totalAsins} ASINs fully verified
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Full: <strong className="text-foreground">{fullyVerified.length}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-muted-foreground">Partial: <strong className="text-foreground">{partiallyScanned.length}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
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
                  variant={inputMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => { setInputMode('manual'); setCameraActive(false); }}
                >
                  <Keyboard className="h-4 w-4 mr-1" />
                  Manual
                </Button>
                <Button
                  size="sm"
                  variant={inputMode === 'camera' ? 'default' : 'outline'}
                  onClick={() => { setInputMode('camera'); setCameraActive(true); }}
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Camera
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Quantity Mode Toggle */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <Label className="text-xs font-medium cursor-pointer">
                  {qtyMode === 'multi-scan' ? 'Multi-scan: each scan = +1' : 'Manual qty: enter count after scan'}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Repeat</span>
                <Switch
                  checked={qtyMode === 'manual-qty'}
                  onCheckedChange={(checked) => {
                    setQtyMode(checked ? 'manual-qty' : 'multi-scan');
                    setPendingAsin(null);
                  }}
                />
                <span className="text-xs text-muted-foreground">Input</span>
              </div>
            </div>

            {/* Pending ASIN qty input (manual-qty mode) */}
            {pendingAsin && qtyMode === 'manual-qty' && (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Enter quantity for:</span>
                    <span className="ml-2 font-mono text-sm text-primary">{pendingAsin}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={cancelPending}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => setManualQty(String(Math.max(1, (parseInt(manualQty) || 1) - 1)))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={manualQty}
                    onChange={e => setManualQty(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleQtySubmit()}
                    className="w-24 text-center font-bold text-lg"
                    autoFocus
                  />
                  <Button
                    size="sm" variant="outline"
                    onClick={() => setManualQty(String((parseInt(manualQty) || 1) + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleQtySubmit} disabled={scanLoading}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Confirm
                  </Button>
                </div>
              </div>
            )}

            {/* Main input */}
            {inputMode === 'manual' ? (
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Scan or type ASIN barcode..."
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                  disabled={scanLoading || (qtyMode === 'manual-qty' && !!pendingAsin)}
                  autoFocus
                />
                <Button
                  onClick={handleManualSubmit}
                  disabled={scanLoading || !manualInput.trim() || (qtyMode === 'manual-qty' && !!pendingAsin)}
                >
                  <Search className="h-4 w-4 mr-1" />
                  {scanLoading ? 'Scanning...' : qtyMode === 'manual-qty' ? 'Look Up' : 'Scan'}
                </Button>
              </div>
            ) : (
              <BarcodeScanner
                onScan={(barcode) => {
                  if (qtyMode === 'manual-qty') {
                    setPendingAsin(barcode);
                    setCameraActive(false);
                  } else {
                    handleScan(barcode);
                  }
                }}
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
            ? lastResult.isOverScan
              ? 'border-amber-500/50 bg-amber-500/5'
              : 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-rose-500/50 bg-rose-500/5'
        }>
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              {lastResult.matchStatus === 'matched' && !lastResult.isOverScan && (
                <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
              )}
              {lastResult.matchStatus === 'matched' && lastResult.isOverScan && (
                <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
              )}
              {lastResult.matchStatus === 'unmatched' && (
                <XCircle className="h-6 w-6 text-rose-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {lastResult.matchStatus === 'matched' && !lastResult.isOverScan && 'Item Scanned ✓'}
                  {lastResult.matchStatus === 'matched' && lastResult.isOverScan && '⚠️ Over-scanned!'}
                  {lastResult.matchStatus === 'unmatched' && 'Not Found in Inventory'}
                </div>
                {lastResult.asin && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {lastResult.title || lastResult.asin}
                  </div>
                )}
                {lastResult.matchStatus === 'matched' && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant={lastResult.scannedQty >= lastResult.systemQty ? 'default' : 'secondary'} className="text-xs">
                      <Hash className="h-3 w-3 mr-0.5" />
                      {lastResult.scannedQty} / {lastResult.systemQty} scanned
                    </Badge>
                    {lastResult.isOverScan && (
                      <span className="text-xs text-amber-600 font-medium">
                        +{lastResult.scannedQty - lastResult.systemQty} extra
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Scans - Grouped by ASIN */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            Scanned ASINs
            <Badge variant="outline" className="ml-auto">{verifiedAsins.length} ASINs</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAsinScans.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No scans yet. Start scanning items!
            </div>
          ) : (
            <div className="max-h-[350px] overflow-y-auto space-y-1.5">
              {recentAsinScans.map(group => {
                const isOver = group.scannedQty > group.systemQty;
                const isFull = group.scannedQty >= group.systemQty;
                return (
                  <div
                    key={group.asin}
                    className={`flex items-center gap-2 text-xs py-2 px-3 rounded-lg border ${
                      isOver ? 'border-amber-500/30 bg-amber-500/5' :
                      isFull ? 'border-emerald-500/30 bg-emerald-500/5' :
                      'border-border bg-muted/30'
                    }`}
                  >
                    {isFull && !isOver && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                    {isOver && <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                    {!isFull && <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-mono truncate">{group.asin}</div>
                      {group.title && (
                        <div className="text-muted-foreground truncate">{group.title}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!isCompleted && (
                        <>
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => onAdjustQty(group.asin, Math.max(0, group.scannedQty - 1))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <Badge variant={isFull ? 'default' : 'secondary'} className="min-w-[60px] justify-center">
                        {group.scannedQty} / {group.systemQty}
                      </Badge>
                      {!isCompleted && (
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => onAdjustQty(group.asin, group.scannedQty + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
