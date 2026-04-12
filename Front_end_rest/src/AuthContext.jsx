import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [fullName, setFullName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionSetup(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSessionSetup(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSessionSetup = (session) => {
    setSession(session);
    if (session?.user) {
      const meta = session.user.user_metadata || {};
      setRole(meta.role || 'farmer');
      setFullName(meta.full_name || session.user.email);
    } else {
      setRole(null);
      setFullName(null);
    }
    setLoading(false);
  };

  const getAuthHeaders = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    isAuthenticated: !!session,
    userId: session?.user?.id,
    email: session?.user?.email,
    role,
    fullName,
    loading,
    logout,
    getAuthHeaders
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
