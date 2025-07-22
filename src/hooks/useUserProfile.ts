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
    const getUser = async () => {
      console.log('useUserProfile: Getting user...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('useUserProfile: Current user:', user);
      setUser(user);
      
      if (user) {
        console.log('useUserProfile: User found, fetching profile for:', user.id);
        fetchProfile(user.id);
      } else {
        console.log('useUserProfile: No user found');
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    console.log('useUserProfile: fetchProfile called for userId:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('useUserProfile: Profile query result:', { data, error });

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      console.log('useUserProfile: Setting profile:', data);
      setProfile(data as UserProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
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