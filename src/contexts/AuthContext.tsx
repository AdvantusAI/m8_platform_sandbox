import React, { createContext, useContext, useEffect, useState } from 'react';


interface User {
  id: string;
  email: string;
  full_name?: string;
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error?: any }>;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<{ error?: any }>;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

    
     
      // Try MongoDB API authentication
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (apiError) {
        console.log('API not available, removing invalid token');
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      // Try MongoDB API for user creation
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
        }),
      });

      if (response.ok) {
        return { error: null };
      } else {
        const data = await response.json();
        return { error: new Error(data.message || 'Failed to create account') };
      }
    } catch (error) {
      // API not available - simulate user creation for demo
      if (email && password && password.length >= 6) {
        // Just return success for demo purposes
        return { error: null };
      }
      return { error: new Error('API not available') };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      console.log('Sign-in response status:', response.status);
      console.log('Sign-in response headers:', response.headers.get('content-type'));

      if (response.ok) {
        try {
          const data = await response.json();
          console.log('Sign-in successful, user:', data.user);
          localStorage.setItem('auth_token', data.token);
          setUser(data.user);
          return { error: null };
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          return { error: new Error('Error en el formato de respuesta del servidor') };
        }
      } else {
        // Handle non-JSON error responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            console.log('Sign-in failed:', errorData);
            return { error: new Error(errorData.message || 'Credenciales inválidas') };
          } catch (jsonError) {
            console.error('Failed to parse error JSON:', jsonError);
            return { error: new Error('Error del servidor') };
          }
        } else {
          // Non-JSON response (likely HTML error page)
          const textResponse = await response.text();
          console.error('Non-JSON response:', textResponse.substring(0, 200));
          return { error: new Error('Error del servidor. Verifique que el servidor esté ejecutándose.') };
        }
      }
    } catch (error) {
      console.error('Sign-in network error:', error);
      return { error: new Error('Error de conexión. Verifique que el servidor esté ejecutándose en el puerto 3001.') };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('auth_token');
      setUser(null);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
