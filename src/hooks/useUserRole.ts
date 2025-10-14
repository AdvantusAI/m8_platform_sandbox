
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
        const { data, error } = await supabase
          .schema('m8_schema')
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          // If it's a permission error, try to create a default role
          if (error.code === 'PGRST301' || error.message?.includes('permission')) {
            try {
              // Try to insert a default user role
              const { error: insertError } = await supabase
                .schema('m8_schema')
                .from('user_roles')
                .insert({ user_id: user.id, role: 'user' });
              
              if (!insertError) {
                setRole('user');
              } else {
                console.error('Error creating default role:', insertError);
                setRole('user'); // Default to user anyway
              }
            } catch (insertErr) {
              console.error('Error creating default role:', insertErr);
              setRole('user');
            }
          } else {
            setRole('user'); // Default to user if no role found
          }
        } else {
          // Map database roles to our UserRole type
          const dbRole = data?.role;
          if (dbRole === 'administrator') {
            setRole('administrator');
          } else {
            setRole('user');
          }
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
