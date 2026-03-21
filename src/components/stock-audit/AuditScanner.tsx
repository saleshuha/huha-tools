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
  Package, ScanBarcode, Search, Plus, Minus, Hash, Repeat, TrendingUp
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
  const [lastScannedAsin, setLastScannedAsin] = useState<string | null>(null);
  const [highlightTimeout, setHighlightTimeout] = useState<NodeJS.Timeout | null>(null);
  const [editingQtyAsin, setEditingQtyAsin] = useState<string | null>(null);
  const [editQtyValue, setEditQtyValue] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input after each scan
  useEffect(() => {
    if (inputMode === 'manual' && inputRef.current && !scanLoading) {
      inputRef.current.focus();
    }
  }, [scanLoading, inputMode, lastResult]);

  // Clear highlight after 3 seconds
  useEffect(() => {
    return () => {
      if (highlightTimeout) clearTimeout(highlightTimeout);
    };
  }, [highlightTimeout]);

  const triggerHighlight = (asin: string) => {
    if (highlightTimeout) clearTimeout(highlightTimeout);
    setLastScannedAsin(asin);
    const timeout = setTimeout(() => setLastScannedAsin(null), 3000);
    setHighlightTimeout(timeout);

    // Auto-scroll to the highlighted row
    setTimeout(() => {
      const el = document.getElementById(`asin-row-${asin}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleScan = useCallback(async (barcode: string, qty: number = 1) => {
    const result = await onScanBarcode(barcode.trim(), qty);
    if (result) {
      setLastResult(result);
      setPendingAsin(null);
      if (result.asin) triggerHighlight(result.asin);
    }
    setCameraActive(false);
    setTimeout(() => setCameraActive(true), 500);
  }, [onScanBarcode]);

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    if (qtyMode === 'manual-qty') {
      if (!pendingAsin) {
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

  const handleInlineQtyEdit = (asin: string, currentQty: number) => {
    setEditingQtyAsin(asin);
    setEditQtyValue(String(currentQty));
  };

  const submitInlineQty = (asin: string) => {
    const val = parseInt(editQtyValue) || 0;
    onAdjustQty(asin, Math.max(0, val));
    setEditingQtyAsin(null);
    setEditQtyValue('');
  };

  // Stats
  const verifiedAsins = asinGroups.filter(g => g.scannedQty > 0);
  const fullyVerified = asinGroups.filter(g => g.scannedQty >= g.systemQty && g.systemQty > 0);
  const partiallyScanned = asinGroups.filter(g => g.scannedQty > 0 && g.scannedQty < g.systemQty);
  const totalAsins = asinGroups.filter(g => g.systemQty > 0).length;
  const progress = totalAsins > 0 ? Math.round((fullyVerified.length / totalAsins) * 100) : 0;
  const partialProgress = totalAsins > 0 ? Math.round((partiallyScanned.length / totalAsins) * 100) : 0;
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
    .slice(0, 30);

  const getCompletionColor = (scanned: number, system: number) => {
    if (system === 0) return 'bg-muted text-muted-foreground';
    const pct = scanned / system;
    if (pct >= 1) return 'bg-emerald-500 text-white';
    if (pct >= 0.5) return 'bg-amber-500 text-white';
    return 'bg-rose-500/80 text-white';
  };

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card className="overflow-hidden">
        <div className="h-1.5 flex">
          <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          <div className="bg-amber-500 transition-all duration-500" style={{ width: `${partialProgress}%` }} />
          <div className="flex-1 bg-muted" />
        </div>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Audit Progress</span>
            <span className="text-sm text-muted-foreground font-mono">
              {fullyVerified.length} / {totalAsins} ASINs
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-1" />
              <span className="text-lg font-bold text-emerald-600">{fullyVerified.length}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Verified</span>
            </div>
            <div className="flex flex-col items-center p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-500 mb-1" />
              <span className="text-lg font-bold text-amber-600">{partiallyScanned.length}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Partial</span>
            </div>
            <div className="flex flex-col items-center p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <XCircle className="h-5 w-5 text-rose-500 mb-1" />
              <span className="text-lg font-bold text-rose-600">{unmatchedCount}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Unmatched</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scanner Input */}
      {!isCompleted && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
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
          <CardContent className="space-y-3 pt-3">
            {/* Quantity Mode Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border/50">
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
              <div className="p-3 rounded-lg border-2 border-primary/40 bg-primary/5 space-y-2 animate-scale-in">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Enter quantity for:</span>
                    <span className="ml-2 font-mono text-sm font-bold text-primary">{pendingAsin}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={cancelPending}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="outline" className="h-10 w-10"
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
                    className="w-24 text-center font-bold text-lg h-10"
                    autoFocus
                  />
                  <Button
                    size="sm" variant="outline" className="h-10 w-10"
                    onClick={() => setManualQty(String((parseInt(manualQty) || 1) + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleQtySubmit} disabled={scanLoading} className="h-10">
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
                  placeholder="Scan or type ASIN, SKU, or Serial Number..."
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                  disabled={scanLoading || (qtyMode === 'manual-qty' && !!pendingAsin)}
                  className="h-11 text-sm"
                  autoFocus
                />
                <Button
                  onClick={handleManualSubmit}
                  disabled={scanLoading || !manualInput.trim() || (qtyMode === 'manual-qty' && !!pendingAsin)}
                  className="h-11 px-5"
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

      {/* Last Scan Result — Prominent */}
      {lastResult && (
        <Card className={`animate-scale-in shadow-lg transition-all ${
          lastResult.matchStatus === 'matched'
            ? lastResult.isOverScan
              ? 'border-2 border-amber-500/60 bg-amber-500/5'
              : 'border-2 border-emerald-500/60 bg-emerald-500/5'
            : 'border-2 border-rose-500/60 bg-rose-500/5'
        }`}>
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className={`rounded-full p-2.5 ${
                lastResult.matchStatus === 'matched'
                  ? lastResult.isOverScan ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                  : 'bg-rose-500/20'
              }`}>
                {lastResult.matchStatus === 'matched' && !lastResult.isOverScan && (
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                )}
                {lastResult.matchStatus === 'matched' && lastResult.isOverScan && (
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                )}
                {lastResult.matchStatus === 'unmatched' && (
                  <XCircle className="h-8 w-8 text-rose-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-base">
                  {lastResult.matchStatus === 'matched' && !lastResult.isOverScan && 'Item Scanned ✓'}
                  {lastResult.matchStatus === 'matched' && lastResult.isOverScan && '⚠️ Over-scanned!'}
                  {lastResult.matchStatus === 'unmatched' && 'Not Found in Inventory'}
                </div>
                {lastResult.asin && (
                  <>
                    <div className="font-mono text-sm text-primary mt-0.5">{lastResult.asin}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {lastResult.title || 'Untitled'}
                    </div>
                  </>
                )}
                {lastResult.matchStatus === 'matched' && (
                  <div className="flex items-center gap-3 mt-2">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${getCompletionColor(lastResult.scannedQty, lastResult.systemQty)}`}>
                      <Hash className="h-3.5 w-3.5" />
                      {lastResult.scannedQty} / {lastResult.systemQty}
                    </div>
                    {lastResult.isOverScan && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-500/10 px-2 py-1 rounded-full">
                        <TrendingUp className="h-3 w-3" />
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
            <Badge variant="outline" className="ml-auto font-mono">{verifiedAsins.length} ASINs</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAsinScans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <ScanBarcode className="h-10 w-10 mx-auto mb-2 opacity-30" />
              No scans yet. Start scanning items!
            </div>
          ) : (
            <div ref={listRef} className="max-h-[400px] overflow-y-auto space-y-1.5">
              {recentAsinScans.map((group, idx) => {
                const isOver = group.scannedQty > group.systemQty;
                const isFull = group.scannedQty >= group.systemQty;
                const isHighlighted = lastScannedAsin === group.asin;
                const isEditingThis = editingQtyAsin === group.asin;

                return (
                  <div
                    key={group.asin}
                    id={`asin-row-${group.asin}`}
                    className={`flex items-center gap-2 text-xs py-2.5 px-3 rounded-lg border transition-all duration-300 ${
                      isHighlighted
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/10 shadow-md animate-scale-in'
                        : isOver ? 'border-amber-500/30 bg-amber-500/5'
                        : isFull ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-border'
                    } ${idx % 2 === 0 && !isHighlighted && !isOver && !isFull ? 'bg-muted/20' : ''}`}
                  >
                    {isFull && !isOver && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                    {isOver && <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                    {!isFull && <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-medium truncate">{group.asin}</div>
                      {group.title && (
                        <div className="text-muted-foreground truncate text-[11px]">{group.title}</div>
                      )}
                      {group.sku && (
                        <div className="text-muted-foreground/70 truncate text-[10px]">SKU: {group.sku}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!isCompleted && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 hover:bg-rose-500/10"
                          onClick={() => onAdjustQty(group.asin, Math.max(0, group.scannedQty - 1))}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isEditingThis ? (
                        <Input
                          type="number"
                          min={0}
                          value={editQtyValue}
                          onChange={e => setEditQtyValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') submitInlineQty(group.asin);
                            if (e.key === 'Escape') setEditingQtyAsin(null);
                          }}
                          onBlur={() => submitInlineQty(group.asin)}
                          className="w-14 h-7 text-center text-xs font-bold p-0"
                          autoFocus
                        />
                      ) : (
                        <button
                          className={`min-w-[65px] text-center py-1 px-2.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${getCompletionColor(group.scannedQty, group.systemQty)}`}
                          onClick={() => !isCompleted && handleInlineQtyEdit(group.asin, group.scannedQty)}
                          title="Click to edit quantity"
                        >
                          {group.scannedQty} / {group.systemQty}
                        </button>
                      )}
                      {!isCompleted && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 hover:bg-emerald-500/10"
                          onClick={() => onAdjustQty(group.asin, group.scannedQty + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
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
