import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface AuditFinalizeDialogProps {
  verifiedCount: number;
  missingCount: number;
  totalSystem: number;
  loading: boolean;
  onFinalize: () => Promise<boolean>;
}

export function AuditFinalizeDialog({
  verifiedCount,
  missingCount,
  totalSystem,
  loading,
  onFinalize,
}: AuditFinalizeDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="lg" disabled={loading}>
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Finalize Audit
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Finalize Stock Audit?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>This action will update your inventory based on the audit results:</p>
              
              <div className="space-y-2 bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Items verified (kept as-is)
                  </span>
                  <strong className="text-emerald-600">{verifiedCount}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-rose-500" />
                    Items missing (qty → 0)
                  </span>
                  <strong className="text-rose-600">{missingCount}</strong>
                </div>
                <hr className="border-border" />
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Total system items</span>
                  <span>{totalSystem}</span>
                </div>
              </div>

              <p className="text-sm text-rose-600 font-medium">
                ⚠️ {missingCount} items will have their quantity set to 0. This cannot be undone automatically.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onFinalize();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
          >
            {loading ? 'Finalizing...' : 'Yes, Finalize Audit'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
