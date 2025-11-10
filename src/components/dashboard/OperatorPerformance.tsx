import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Clock, MessageSquare, Package, Activity } from "lucide-react";
import { useEffect } from "react";

interface OperatorPerformanceData {
  id: string;
  operator_id: string;
  date: string;
  last_heartbeat: string;
  total_online_minutes: number;
  shipments_created: number;
  shipments_updated: number;
  documents_reviewed: number;
  status_changes: number;
  alerts_resolved: number;
  profile?: {
    display_name: string;
    email: string;
  };
}

export function OperatorPerformance() {
  const today = new Date().toISOString().split('T')[0];

  const { data: performances = [], isLoading } = useQuery({
    queryKey: ['operator_performance', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operator_performance')
        .select(`
          *,
          profile:profiles(display_name, email)
        `)
        .eq('date', today)
        .order('total_online_minutes', { ascending: false });

      if (error) throw error;
      return data as OperatorPerformanceData[];
    },
  });

  const getOnlineStatus = (lastHeartbeat?: string) => {
    if (!lastHeartbeat) return 'offline';
    
    const lastBeat = new Date(lastHeartbeat).getTime();
    const now = Date.now();
    const diffMinutes = (now - lastBeat) / (1000 * 60);
    
    return diffMinutes < 2 ? 'online' : 'offline';
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const totalMetrics = performances.reduce(
    (acc, p) => ({
      onlineMinutes: acc.onlineMinutes + (p.total_online_minutes || 0),
      shipmentsCreated: acc.shipmentsCreated + (p.shipments_created || 0),
      shipmentsUpdated: acc.shipmentsUpdated + (p.shipments_updated || 0),
      documentsReviewed: acc.documentsReviewed + (p.documents_reviewed || 0),
      statusChanges: acc.statusChanges + (p.status_changes || 0),
    }),
    { onlineMinutes: 0, shipmentsCreated: 0, shipmentsUpdated: 0, documentsReviewed: 0, statusChanges: 0 }
  );

  const onlineOperators = performances.filter(
    p => getOnlineStatus(p.last_heartbeat) === 'online'
  ).length;

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operadores Online</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineOperators}</div>
            <p className="text-xs text-muted-foreground">
              de {performances.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Online</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(totalMetrics.onlineMinutes)}</div>
            <p className="text-xs text-muted-foreground">Total de hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embarques Criados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.shipmentsCreated}</div>
            <p className="text-xs text-muted-foreground">
              +{totalMetrics.shipmentsUpdated} atualizações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Docs Revisados</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.documentsReviewed}</div>
            <p className="text-xs text-muted-foreground">Total de hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.statusChanges}</div>
            <p className="text-xs text-muted-foreground">Mudanças de status</p>
          </CardContent>
        </Card>
      </div>

      {/* Operators List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Desempenho Individual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performances.map((perf) => {
              const status = getOnlineStatus(perf.last_heartbeat);
              const isOnline = status === 'online';

              return (
                <div 
                  key={perf.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <div>
                        <p className="font-semibold">{perf.profile?.display_name || 'Operador'}</p>
                        <p className="text-sm text-muted-foreground">{perf.profile?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{formatTime(perf.total_online_minutes || 0)}</p>
                      <p className="text-muted-foreground">Online hoje</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{perf.shipments_created || 0}</p>
                      <p className="text-muted-foreground">Embarques</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{perf.documents_reviewed || 0}</p>
                      <p className="text-muted-foreground">Docs</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{perf.status_changes || 0}</p>
                      <p className="text-muted-foreground">Ações</p>
                    </div>
                  </div>

                  <Badge variant={isOnline ? 'default' : 'secondary'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              );
            })}

            {performances.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-semibold">Nenhum operador ativo hoje</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
