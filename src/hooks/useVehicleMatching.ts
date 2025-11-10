import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      let query = supabase
        .from('shipment_vehicle_matching')
        .select(`
          *,
          driver:drivers(*),
          embarque:embarques(*)
        `)
        .order('compatibility_score', { ascending: false });

      if (embarqueId) {
        query = query.eq('embarque_id', embarqueId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as VehicleMatch[];
    },
    enabled: !!embarqueId || embarqueId === undefined,
  });

  // Set up Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('vehicle-matching-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipment_vehicle_matching'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['vehicle_matching'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createMatch = async (match: Omit<VehicleMatch, 'id' | 'created_at'>) => {
    const { error } = await supabase
      .from('shipment_vehicle_matching')
      .insert(match);

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['vehicle_matching'] });
  };

  const updateMatchStatus = async (matchId: string, status: VehicleMatch['status']) => {
    const updateData: any = { status };
    
    if (status === 'offered') {
      updateData.offered_at = new Date().toISOString();
    } else if (status === 'accepted' || status === 'rejected') {
      updateData.response_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('shipment_vehicle_matching')
      .update(updateData)
      .eq('id', matchId);

    if (error) throw error;

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
