import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../api/supabase';
import { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';

// Define types for our context
type SessionContextType = {
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  signOut: () => Promise<void>;
};

// Create the context
const SessionContext = createContext<SessionContextType>({
  session: null,
  loading: true,
  userRole: null,
  signOut: async () => {},
});

// Hook to use the session context
export const useSession = () => useContext(SessionContext);

// Provider component
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    console.log('SessionProvider initializing');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'Session exists' : 'No session');
      setSession(session);
      setLoading(false);
      
      // Get user role if session exists
      if (session?.user) {
        console.log('User authenticated, fetching role for:', session.user.id);
        fetchUserRole(session.user.id);
      }
    });

    // Set up listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
        setSession(session);
        
        if (session?.user) {
          console.log('User authenticated in event listener, fetching role for:', session.user.id);
          fetchUserRole(session.user.id);
        } else {
          console.log('No user in session, setting role to null');
          setUserRole(null);
        }
      }
    );

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  // Function to fetch user role from database
  const fetchUserRole = async (userId: string) => {
    console.log('Fetching user role for ID:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      } else {
        console.log('User role fetched successfully:', data?.role);
        setUserRole(data?.role || null);
      }
    } catch (error) {
      console.error('Exception fetching user role:', error);
      setUserRole(null);
    }
  };

  // Function to sign out the user
  const signOut = async () => {
    console.log('Signing out user');
    try {
      await supabase.auth.signOut();
      console.log('Sign out successful');
      // Navigate to login screen after signing out
      router.replace({ pathname: '/login' });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SessionContext.Provider value={{ session, loading, userRole, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}; 