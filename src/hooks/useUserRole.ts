import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'administrator' | 'user' | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/users/${user.id}/role`);
        if (response.ok) {
          const data = await response.json();
          const dbRole = data?.role;
          if (dbRole === 'administrator') {
            setRole('administrator');
          } else {
            setRole('user');
          }
        } else {
          setRole('user'); // Default to user if no role found
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const isAdministrator = role === 'administrator';
  const isUser = role === 'user';

  return { role, loading, isAdministrator, isUser };
}
