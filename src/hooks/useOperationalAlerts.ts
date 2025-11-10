import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface OperationalAlert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  entity_type?: string;
  entity_id?: string;
  title: string;
  description?: string;
  action_required?: string;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
}

export function useOperationalAlerts() {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['operational_alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OperationalAlert[];
    },
  });

  // Set up Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('operational-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operational_alerts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['operational_alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const resolveAlert = async (alertId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('operational_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', alertId);

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['operational_alerts'] });
  };

  const createAlert = async (alert: Omit<OperationalAlert, 'id' | 'created_at' | 'is_resolved'>) => {
    const { error } = await supabase
      .from('operational_alerts')
      .insert(alert);

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['operational_alerts'] });
  };

  // Group alerts by severity
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const highAlerts = alerts.filter(a => a.severity === 'high');
  const mediumAlerts = alerts.filter(a => a.severity === 'medium');
  const lowAlerts = alerts.filter(a => a.severity === 'low');

  return {
    alerts,
    criticalAlerts,
    highAlerts,
    mediumAlerts,
    lowAlerts,
    isLoading,
    resolveAlert,
    createAlert,
  };
}
