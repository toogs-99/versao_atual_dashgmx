import { useQuery, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/integrations/supabase/client";
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
      // MOCK DATA
      return [
        {
          id: 'a1',
          alert_type: 'vehicle_breakdown',
          severity: 'critical',
          entity_type: 'vehicle',
          entity_id: 'v1',
          title: 'Veículo com problema mecânico',
          description: 'Caminhão placa ABC-1234 reportou falha no motor.',
          action_required: 'Contatar socorro mecânico',
          is_resolved: false,
          created_at: new Date().toISOString()
        },
        {
          id: 'a2',
          alert_type: 'delay_risk',
          severity: 'high',
          entity_type: 'shipment',
          entity_id: 's1',
          title: 'Risco de atraso na entrega',
          description: 'Carga SP -> RJ parada em trânsito há 2 horas.',
          action_required: 'Verificar com motorista',
          is_resolved: false,
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ] as OperationalAlert[];
    },
  });

  // Set up Realtime subscription
  // Realtime removed
  useEffect(() => { }, []);

  const resolveAlert = async (alertId: string) => {
    console.log("Mock Resolve Alert:", alertId);
    queryClient.invalidateQueries({ queryKey: ['operational_alerts'] });
  };

  const createAlert = async (alert: Omit<OperationalAlert, 'id' | 'created_at' | 'is_resolved'>) => {
    console.log("Mock Create Alert:", alert);
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
