import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useOperatorHeartbeat() {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  useEffect(() => {
    const startSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      sessionStartRef.current = new Date();
      const today = new Date().toISOString().split('T')[0];

      // Upsert performance record for today
      const { error } = await supabase
        .from('operator_performance')
        .upsert({
          operator_id: user.id,
          date: today,
          session_start: sessionStartRef.current.toISOString(),
          last_heartbeat: new Date().toISOString(),
        }, {
          onConflict: 'operator_id,date',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error starting session:', error);
      }
    };

    const sendHeartbeat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !sessionStartRef.current) return;

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const minutesOnline = Math.floor((now.getTime() - sessionStartRef.current.getTime()) / 60000);

      const { error } = await supabase
        .from('operator_performance')
        .update({
          last_heartbeat: now.toISOString(),
          total_online_minutes: minutesOnline,
          session_end: now.toISOString(),
        })
        .eq('operator_id', user.id)
        .eq('date', today);

      if (error) {
        console.error('Error sending heartbeat:', error);
      }
    };

    // Start session
    startSession();

    // Send heartbeat every 60 seconds
    intervalRef.current = setInterval(sendHeartbeat, 60000);

    // Send heartbeat on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Send final heartbeat on unmount
      sendHeartbeat();
    };
  }, []);

  const trackActivity = async (
    activityType: string,
    entityId?: string,
    entityType?: string,
    metadata?: Record<string, any>
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('operator_activity')
      .insert({
        operator_id: user.id,
        activity_type: activityType,
        entity_id: entityId,
        entity_type: entityType,
        metadata: metadata || {},
      });

    if (error) {
      console.error('Error tracking activity:', error);
    }

    // Update performance counters
    const today = new Date().toISOString().split('T')[0];
    const fieldMap: Record<string, string> = {
      'shipment_created': 'shipments_created',
      'shipment_updated': 'shipments_updated',
      'document_reviewed': 'documents_reviewed',
      'status_changed': 'status_changes',
      'alert_resolved': 'alerts_resolved',
    };

    const field = fieldMap[activityType];
    if (field) {
      const { data } = await supabase
        .from('operator_performance')
        .select(field)
        .eq('operator_id', user.id)
        .eq('date', today)
        .single();

      if (data) {
        await supabase
          .from('operator_performance')
          .update({ [field]: (data[field] || 0) + 1 })
          .eq('operator_id', user.id)
          .eq('date', today);
      }
    }
  };

  return { trackActivity };
}
