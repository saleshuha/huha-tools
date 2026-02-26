import { POTracker } from '@/components/POTracker';
import { ShoppingCart, RefreshCw, Clock } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { usePOOrdersQuery } from '@/hooks/usePOOrdersQuery';

export default function POTrackerPage() {
  const { profile, loading: profileLoading } = useUserProfile();
  const { trackPageView } = useTaxonomy();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);
  const [userAuth, setUserAuth] = useState<any>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: poOrders } = usePOOrdersQuery(authChecked && !!userAuth);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔐 POTrackerPage auth check:', { 
        hasUser: !!user, 
        userId: user?.id,
        profileLoading,
        hasProfile: !!profile 
      });
      setUserAuth(user);
      setAuthChecked(true);
    };
    checkAuth();
  }, [profile, profileLoading]);

  useEffect(() => {
    if (poOrders && poOrders.length > 0) {
      setLastRefreshTime(new Date());
    }
  }, [poOrders]);

  useEffect(() => {
    trackPageView({
      category: 'Amazon',
      subcategory: 'PO Tracker',
      pageRoute: '/po-tracker',
      pageTitle: 'Amazon Retail - Purchase Orders',
      metadata: {
        features: ['bulk_import', 'print_labels', 'export', 'analytics', 'sunsky_matching']
      }
    });
  }, [trackPageView]);

  const handleHardRefresh = async () => {
    setIsRefreshing(true);
    console.log('🔄 Hard refresh initiated - clearing all cache');
    
    toast({
      title: "🔄 Refreshing...",
      description: "Fetching latest data from database..."
    });
    
    queryClient.clear();
    await queryClient.invalidateQueries({ queryKey: ['po-orders'] });
    
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Gradient Hero Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-card to-sky-500/10 border border-border/40 p-6">
        {/* Decorative blur circles */}
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl" />
        
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Amazon Retail</h1>
              <p className="text-muted-foreground text-sm">
                Track purchase orders and manage SKU inventory with advanced analytics
              </p>
            </div>
          </div>
          
          {authChecked && userAuth && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border/20">
                <Clock className="h-3 w-3" />
                <span>{lastRefreshTime.toLocaleTimeString()}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleHardRefresh}
                disabled={isRefreshing}
                className="rounded-lg"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                {isRefreshing ? 'Refreshing...' : 'Hard Refresh'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <POTracker />
    </div>
  );
}