import { useState } from 'react';
import { DFProcessingWizard } from '@/components/df-processing/DFProcessingWizard';
import { DFProcessingHistoryDialog } from '@/components/df-processing/DFProcessingHistoryDialog';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { Package, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageTracking } from '@/hooks/usePageTracking';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function OrderProcessingPage() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  usePageTracking({
    category: 'Amazon',
    subcategory: 'Order Processing',
    pageTitle: 'DF Order Processing'
  });

  const handleDeleteAll = async () => {
    try {
      setDeleting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('order_imports')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'All DF orders deleted',
        description: 'All uploaded order data has been permanently removed.',
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting orders',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteStep(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(var(--primary-light)/0.06),transparent_40%)]" />
      </div>
      
      <div className="relative z-10 app-container py-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <HuhaHeader01
            icon={<Package className="w-5 h-5 text-primary-foreground" />}
            title="DF Order Processing"
            subtitle="Upload orders, match sources & inventory, process stock deductions"
          />
          <div className="flex items-center gap-2">
            <AlertDialog open={deleteStep > 0} onOpenChange={(open) => !open && setDeleteStep(0)}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setDeleteStep(1)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All Orders
                </Button>
              </AlertDialogTrigger>

              {deleteStep === 1 && (
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>all uploaded DF order data</strong> from the database. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button variant="destructive" onClick={() => setDeleteStep(2)}>
                      Yes, I want to delete
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              )}

              {deleteStep === 2 && (
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Final Confirmation</AlertDialogTitle>
                    <AlertDialogDescription>
                      This is your <strong>last chance</strong>. All DF order records will be permanently erased. Are you absolutely sure?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeleteAll}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Delete Everything'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              )}
            </AlertDialog>

            <Button
              variant="outline"
              className="gap-2 shrink-0"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="w-4 h-4" />
              Processing History
            </Button>
          </div>
        </div>

        <DFProcessingWizard />

        <DFProcessingHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      </div>
    </div>
  );
}