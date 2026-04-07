import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAdminCheck(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin-check', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId!,
        _role: 'admin',
      });
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!userId,
  });
}
