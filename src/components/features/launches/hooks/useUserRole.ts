import { UserRole } from '../types';

// Mock hook for user roles - replace with actual auth implementation
export function useUserRole(): { role: UserRole; isAdmin: boolean; isPlanner: boolean; isViewer: boolean } {
  // For now, return admin role - replace with actual auth logic
  const role: UserRole = 'admin';
  
  return {
    role,
    isAdmin: role === 'admin',
    isPlanner: ['planner', 'admin'].includes(role),
    isViewer: ['viewer', 'planner', 'admin'].includes(role),
  };
}