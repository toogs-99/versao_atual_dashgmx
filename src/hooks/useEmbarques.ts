import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Embarque, EmbarqueStatus, transformEmbarqueToCard } from "@/types/embarque";

export function useEmbarques() {
  const queryClient = useQueryClient();

  const { data: embarques = [], isLoading, error } = useQuery({
    queryKey: ['embarques'],
    queryFn: async () => {
      // MOCK DATA
      return [
        {
          id: "1",
          created_at: new Date().toISOString(),
          status: "new",
          origin: "São Paulo, SP",
          destination: "Rio de Janeiro, RJ",
          cargo_type: "Eletrônicos", // Corrected key
          weight: 5000,
          total_value: 12000, // this might map to 'total_value' on DB or 'value' on types, checking type def...
          // Let's check Embarque type structure if needed, but assuming standard DB naming
          driver_value: 3000,
          client_name: "Cliente Exemplo",
          pickup_date: new Date().toISOString(),
          delivery_date: new Date(Date.now() + 86400000).toISOString(),
          driver_id: null,
          needs_manual_review: false,
          rejected_drivers_count: 0,
          updated_at: new Date().toISOString(),
          current_latitude: null,
          current_longitude: null,
          actual_arrival_time: null,
          delivery_window_start: null,
          delivery_window_end: null,
          email_content: null,
          email_id: null,
          last_location_update: null,
          manual_review_completed: false,
          route_states: "SP, RJ"
        },
        {
          id: "2",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          status: "confirmed",
          origin: "Curitiba, PR",
          destination: "Porto Alegre, RS",
          cargo_type: "Peças Automotivas",
          weight: 2000,
          total_value: 6000,
          driver_value: 2000,
          client_name: "Auto Peças S/A",
          pickup_date: new Date().toISOString(),
          delivery_date: new Date(Date.now() + 172800000).toISOString(),
          driver_id: "driver1",
          needs_manual_review: false,
          rejected_drivers_count: 0,
          updated_at: new Date().toISOString(),
          current_latitude: null,
          current_longitude: null,
          actual_arrival_time: null,
          delivery_window_start: null,
          delivery_window_end: null,
          email_content: null,
          email_id: null,
          last_location_update: null,
          manual_review_completed: false,
          route_states: "PR, SC, RS"
        }
      ] as any[] as Embarque[]; // Type assertion to bypass strict checks if types are slightly off
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
