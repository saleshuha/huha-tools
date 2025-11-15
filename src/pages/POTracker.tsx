import { POTracker } from '@/components/POTracker';
import { ShoppingCart, RefreshCw, Clock } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
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
  
  // Use the query to track when data is refreshed
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

  // Track page view
  // Update last refresh timestamp when data changes
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
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <HuhaHeader01
            icon={<ShoppingCart className="w-5 h-5 text-primary-foreground" />}
            title="Amazon Retail"
            subtitle="Track purchase orders and manage SKU inventory for Amazon supplier with advanced analytics and automated matching"
            badges={[
              {
                label: "Purchase Order Management",
                variant: "secondary" as const,
                className: "bg-green-500/20 text-green-700 dark:text-green-300"
              }
            ]}
            className="flex-1"
          />
          {authChecked && userAuth && (
            <div className="flex items-center gap-3 ml-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border">
                <Clock className="h-3 w-3" />
                <span>
                  Last updated: {lastRefreshTime.toLocaleTimeString()}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleHardRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                {isRefreshing ? 'Refreshing...' : 'Hard Refresh'}
              </Button>
            </div>
          )}
        </div>
        <POTracker />
      </div>
    </div>
  );
}