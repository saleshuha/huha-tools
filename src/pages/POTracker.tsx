import { POTracker } from '@/components/POTracker';
import { ShoppingCart, RefreshCw } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function POTrackerPage() {
  const { profile, loading: profileLoading } = useUserProfile();
  const { trackPageView } = useTaxonomy();
  const [authChecked, setAuthChecked] = useState(false);
  const [userAuth, setUserAuth] = useState<any>(null);

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

  const handleHardRefresh = () => {
    console.log('🔄 Hard refreshing page...');
    window.location.reload();
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleHardRefresh}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
        <POTracker />
      </div>
    </div>
  );
}