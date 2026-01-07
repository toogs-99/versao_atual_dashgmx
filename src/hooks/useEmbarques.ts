import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { directus } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { useEffect } from "react";
import { Embarque, EmbarqueStatus, transformEmbarqueToCard } from "@/types/embarque";

export function useEmbarques() {
  const queryClient = useQueryClient();

  const { data: embarques = [], isLoading, error } = useQuery({
    queryKey: ['embarques'],
    queryFn: async () => {
      try {
        const response = await directus.request(readItems('embarques', {
          fields: ['*', 'driver_id.*'],
          sort: ['-created_at' as any]
        }));

        return response.map((item: any) => ({
          ...item,
          driver: item.driver_id ? {
            id: item.driver_id.id,
            name: item.driver_id.nome // Assuming 'nome' is the field for driver name
          } : undefined
        })) as any[];
      } catch (err) {
        console.error("Error fetching embarques:", err);
        throw err;
      }
    },

  });

  // Realtime subscription removed for mock mode
  useEffect(() => { }, []);

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
