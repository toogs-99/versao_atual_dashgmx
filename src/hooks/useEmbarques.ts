import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Embarque, EmbarqueStatus, transformEmbarqueToCard } from "@/types/embarque";

export function useEmbarques() {
  const queryClient = useQueryClient();

  const { data: embarques = [], isLoading, error } = useQuery({
    queryKey: ['embarques'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('embarques')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Embarque[];
    },
  });

  // Set up Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('embarques-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'embarques'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['embarques'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Group embarques by status
  const embarquesByStatus = embarques.reduce((acc, embarque) => {
    const status = embarque.status as EmbarqueStatus;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(transformEmbarqueToCard(embarque));
    return acc;
  }, {} as Record<EmbarqueStatus, ReturnType<typeof transformEmbarqueToCard>[]>);

  return {
    embarques,
    embarquesByStatus,
    isLoading,
    error
  };
}
