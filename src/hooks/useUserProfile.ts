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

  const fetchProfile = async (userId: string) => {
    console.log('🔍 useUserProfile: fetchProfile START for userId:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ useUserProfile: Profile error:', error);
        setLoading(false);
        return;
      }

      if (data) {
        console.log('✅ useUserProfile: Profile loaded:', data.id, data.country);
        setProfile(data as UserProfile);
      } else {
        console.warn('⚠️ useUserProfile: No profile for user:', userId);
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ useUserProfile: Exception:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useUserProfile: Initializing...');
    let mounted = true;

    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        console.log('useUserProfile: Auth state changed:', event);
        
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

    // Then check current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('❌ useUserProfile: Session error:', error);
        setLoading(false);
        return;
      }
      
      const currentUser = session?.user ?? null;
      console.log('useUserProfile: Initial session user:', currentUser?.id);
      setUser(currentUser);
      
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    profile,
    user,
    loading,
    isAdmin: profile?.role === 'admin',
    isMainAdmin: profile?.is_main_admin === true
  };
}