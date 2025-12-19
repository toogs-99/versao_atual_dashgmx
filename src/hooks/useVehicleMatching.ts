import { useQuery, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface VehicleMatch {
  id: string;
  embarque_id: string;
  driver_id: string;
  compatibility_score: number;
  compatibility_level: 'high' | 'medium' | 'low';
  factors: Record<string, any>;
  status: 'suggested' | 'offered' | 'accepted' | 'rejected';
  offered_at?: string;
  response_at?: string;
  created_at: string;
  driver?: any;
  embarque?: any;
}

export function useVehicleMatching(embarqueId?: string) {
  const queryClient = useQueryClient();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['vehicle_matching', embarqueId],
    queryFn: async () => {
      // MOCK DATA
      const mockMatches: VehicleMatch[] = [
        {
          id: 'm1',
          embarque_id: 'e1',
          driver_id: 'd1',
          compatibility_score: 95,
          compatibility_level: 'high',
          factors: { location_match: true, equipment_compatible: true },
          status: 'suggested',
          created_at: new Date().toISOString(),
          driver: { name: 'João (MOCK)', truck_plate: 'ABC-1234' }
        },
        {
          id: 'm2',
          embarque_id: 'e1',
          driver_id: 'd2',
          compatibility_score: 75,
          compatibility_level: 'medium',
          factors: { equipment_compatible: true },
          status: 'suggested',
          created_at: new Date().toISOString(),
          driver: { name: 'Pedro (MOCK)', truck_plate: 'XYZ-5678' }
        }
      ];

      if (embarqueId) {
        return mockMatches.filter(m => m.embarque_id === embarqueId);
      }
      return mockMatches;
    },
    enabled: !!embarqueId || embarqueId === undefined,
  });

  // Set up Realtime subscription
  // Realtime removed
  useEffect(() => { }, []);

  const createMatch = async (match: Omit<VehicleMatch, 'id' | 'created_at'>) => {
    console.log("Mock Create Match:", match);
    queryClient.invalidateQueries({ queryKey: ['vehicle_matching'] });
  };

  const updateMatchStatus = async (matchId: string, status: VehicleMatch['status']) => {
    console.log("Mock Update Match Status:", matchId, status);
    queryClient.invalidateQueries({ queryKey: ['vehicle_matching'] });
  };

  const highMatches = matches.filter(m => m.compatibility_level === 'high');
  const mediumMatches = matches.filter(m => m.compatibility_level === 'medium');
  const lowMatches = matches.filter(m => m.compatibility_level === 'low');

  return {
    matches,
    highMatches,
    mediumMatches,
    lowMatches,
    isLoading,
    createMatch,
    updateMatchStatus,
  };
}
