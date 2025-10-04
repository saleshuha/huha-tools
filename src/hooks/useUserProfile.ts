import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  country: 'UAE' | 'KSA';
  role: 'admin' | 'user';
  is_main_admin: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    console.log('useUserProfile: useEffect triggered');
    let mounted = true;
    
    const getUser = async () => {
      try {
        console.log('useUserProfile: Getting user...');
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!mounted) return;
        
        if (error) {
          console.error('❌ useUserProfile: Auth error:', error);
          setLoading(false);
          return;
        }
        
        console.log('useUserProfile: Current user:', user);
        setUser(user);
        
        if (user) {
          console.log('useUserProfile: User found, fetching profile for:', user.id);
          await fetchProfile(user.id);
        } else {
          console.log('useUserProfile: No user found');
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ useUserProfile: Exception in getUser:', err);
        if (mounted) setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    console.log('🔍 useUserProfile: fetchProfile called for userId:', userId);
    try {
      console.log('📡 useUserProfile: Starting profile query...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('📊 useUserProfile: Profile query completed:', { 
        hasData: !!data, 
        hasError: !!error,
        data: data,
        error: error 
      });

      if (error) {
        console.error('❌ useUserProfile: Error fetching profile:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setLoading(false);
        return;
      }

      if (!data) {
        console.warn('⚠️ useUserProfile: No profile found for user:', userId);
        setLoading(false);
        return;
      }

      console.log('✅ useUserProfile: Profile loaded successfully:', {
        id: data.id,
        email: data.email,
        country: data.country,
        role: data.role
      });
      setProfile(data as UserProfile);
    } catch (error) {
      console.error('❌ useUserProfile: Caught exception:', error);
    } finally {
      console.log('🏁 useUserProfile: fetchProfile completed, loading=false');
      setLoading(false);
    }
  };

  return {
    profile,
    user,
    loading,
    isAdmin: profile?.role === 'admin',
    isMainAdmin: profile?.is_main_admin === true
  };
}