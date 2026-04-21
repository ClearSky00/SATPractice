import { useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First check if user is already authenticated
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setLoading(false);
          return;
        }

        // Try auto-login if no current user
        const autoLoginSuccess = await authService.autoLogin();
        if (!autoLoginSuccess) {
          // No saved credentials or auto-login failed
          setLoading(false);
        }
        // If auto-login succeeds, the auth state change listener will handle setting the user
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: authListener } = authService.onAuthStateChange((user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      setUser(user);
      setLoading(false); // Always reset loading when auth state changes
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      await authService.signUp(email, password);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      await authService.signIn(email, password);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authService.signOut();
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    try {
      setLoading(true);
      await authService.deleteAccount();
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    isAuthenticated: !!user,
  };
}; 