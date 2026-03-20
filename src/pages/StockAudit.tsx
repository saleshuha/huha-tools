import { usePageTracking } from '@/hooks/usePageTracking';
import { useStockAudit } from '@/hooks/useStockAudit';
import { AuditSessionManager } from '@/components/stock-audit/AuditSessionManager';
import { AuditScanner } from '@/components/stock-audit/AuditScanner';
import { AuditReviewPanel } from '@/components/stock-audit/AuditReviewPanel';
import { AuditFinalizeDialog } from '@/components/stock-audit/AuditFinalizeDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardCheck, XCircle } from 'lucide-react';

export default function StockAudit() {
  usePageTracking({
    category: 'Inventory',
    subcategory: 'Stock Audit',
    pageTitle: 'Physical Stock Audit',
  });

  const {
    sessions,
    activeSession,
    scans,
    loading,
    scanLoading,
    fetchSessions,
    createSession,
    resumeSession,
    scanBarcode,
    adjustAsinQty,
    getAsinGroups,
    getVerifiedAsins,
    getFullyVerifiedAsins,
    getPartiallyScannedAsins,
    getMissingAsins,
    getUnmatchedScans,
    finalizeAudit,
    cancelSession,
    closeSession,
  } = useStockAudit();

  const asinGroups = getAsinGroups();
  const verifiedAsins = getVerifiedAsins();
  const fullyVerified = getFullyVerifiedAsins();
  const partiallyScanned = getPartiallyScannedAsins();
  const missingAsins = getMissingAsins();
  const unmatchedScans = getUnmatchedScans();
  const totalSystemAsins = asinGroups.filter(g => g.systemQty > 0).length;

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {activeSession && (
              <Button variant="ghost" size="sm" onClick={closeSession}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <ClipboardCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {activeSession ? activeSession.name : 'Physical Stock Audit'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {activeSession
                  ? `${activeSession.country} • ${activeSession.status === 'completed' ? 'Completed' : 'In Progress'}`
                  : 'Verify physical stock against system inventory'}
              </p>
            </div>
          </div>

          {activeSession && activeSession.status === 'in_progress' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={cancelSession}>
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <AuditFinalizeDialog
                fullyVerified={fullyVerified}
                partiallyScanned={partiallyScanned}
                missingAsins={missingAsins}
                totalSystemAsins={totalSystemAsins}
                loading={loading}
                onFinalize={finalizeAudit}
              />
            </div>
          )}
        </div>

        {/* Content */}
        {!activeSession ? (
          <AuditSessionManager
            sessions={sessions}
            loading={loading}
            onCreateSession={createSession}
            onResumeSession={resumeSession}
            onFetchSessions={fetchSessions}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <AuditScanner
                session={activeSession}
                scans={scans}
                asinGroups={asinGroups}
                scanLoading={scanLoading}
                onScanBarcode={scanBarcode}
                onAdjustQty={adjustAsinQty}
              />
            </div>
            <div>
              <AuditReviewPanel
                verifiedAsins={verifiedAsins}
                fullyVerified={fullyVerified}
                partiallyScanned={partiallyScanned}
                missingAsins={missingAsins}
                unmatchedScans={unmatchedScans}
                totalSystemAsins={totalSystemAsins}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
