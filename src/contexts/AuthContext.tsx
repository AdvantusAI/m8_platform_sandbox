
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { validateSessionToken, getSessionIdFromToken } from '@/utils/sessionUtils';


interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    try {
      // Get current session before clearing it
      const currentSession = session;
      
      // Clear local session state first to prevent issues
      setSession(null);
      setUser(null);
      
      // If we have a session, validate the token before attempting logout
      if (currentSession?.access_token) {
        const sessionId = getSessionIdFromToken(currentSession.access_token);
        const isValidToken = validateSessionToken(currentSession.access_token);
        
        if (!isValidToken || !sessionId) {
          // Token is invalid or missing session_id, consider logout successful
          console.log('Token invalid or missing session_id, logout successful');
          return { error: null };
        }
      }
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      // If there's an error related to session_id not existing, 
      // it's likely because the session was already invalidated
      if (error && error.message?.includes('session_id claim in JWT does not exist')) {
        // This is actually a successful logout scenario - the session is already gone
        console.log('Session already invalidated, logout successful');
        return { error: null };
      }
      
      return { error };
    } catch (err) {
      // Handle any unexpected errors during logout
      console.error('Unexpected error during logout:', err);
      return { error: err };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
