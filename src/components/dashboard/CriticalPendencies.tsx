import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOperationalAlerts } from "@/hooks/useOperationalAlerts";
import { useEmbarques } from "@/hooks/useEmbarques";
import { useQuery } from "@tanstack/react-query";
// import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  Clock,
  FileText,
  UserX,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Ban
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function CriticalPendencies() {
  const { criticalAlerts, highAlerts, resolveAlert } = useOperationalAlerts();
  const { embarques } = useEmbarques();
  const { toast } = useToast();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  // Buscar motoristas inativos
  const { data: inactiveDrivers = [] } = useQuery({
    queryKey: ['inactive-drivers'],
    queryFn: async () => {
      // MOCK DATA
      return []; // No inactive drivers for mock
    },
  });

  // Calculate critical metrics
  const shipmentsNoResponse = embarques.filter(e =>
    e.status === 'new' &&
    new Date(e.created_at).getTime() < Date.now() - 5 * 60 * 60 * 1000
  );

  const shipmentsNoDocuments = embarques.filter(e =>
    ['in_transit', 'completed'].includes(e.status) &&
    !e.delivery_date
  );

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveAlert(alertId);
      toast({
        title: "Alerta resolvido",
        description: "O alerta foi marcado como resolvido com sucesso.",
      });
      setSelectedAlert(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível resolver o alerta.",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Pendências Críticas - Ação Imediata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cargas sem aceite */}
          {shipmentsNoResponse.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-destructive/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-destructive">
                    {shipmentsNoResponse.length} Cargas sem aceite há &gt; 5h
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Risco de No-Show aumentado
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  toast({
                    title: "Cargas sem aceite",
                    description: shipmentsNoResponse.map(e => `${e.origin} → ${e.destination}`).join(', '),
                  });
                }}>
                  Ver Lista
                </Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  toast({
                    title: "Matching acionado",
                    description: "Gerando sugestões automáticas para as cargas pendentes",
                  });
                }}>
                  Acionar Matching
                </Button>
              </div>
            </div>
          )}

          {/* Documentos pendentes */}
          {shipmentsNoDocuments.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-orange-500/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-orange-600">
                    {shipmentsNoDocuments.length} CT-es pendentes de canhoto
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Documentação incompleta
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                Revisar Documentos
              </Button>
            </div>
          )}

          {/* Alertas Críticos */}
          {criticalAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-4 bg-background rounded-lg border border-destructive/20 cursor-pointer hover:bg-accent/50"
              onClick={() => setSelectedAlert(alert)}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  {getPriorityIcon(alert.severity)}
                </div>
                <div>
                  <p className="font-semibold text-destructive">
                    {alert.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {alert.description}
                  </p>
                </div>
              </div>
              <Badge variant={getPriorityColor(alert.severity)}>
                {alert.severity.toUpperCase()}
              </Badge>
            </div>
          ))}

          {/* Alertas de Alta Prioridade */}
          {highAlerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-4 bg-background rounded-lg border border-orange-500/20 cursor-pointer hover:bg-accent/50"
              onClick={() => setSelectedAlert(alert)}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  {getPriorityIcon(alert.severity)}
                </div>
                <div>
                  <p className="font-semibold text-orange-600">
                    {alert.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {alert.description}
                  </p>
                </div>
              </div>
              <Badge variant={getPriorityColor(alert.severity)}>
                {alert.severity.toUpperCase()}
              </Badge>
            </div>
          ))}

          {criticalAlerts.length === 0 && highAlerts.length === 0 && shipmentsNoResponse.length === 0 && shipmentsNoDocuments.length === 0 && (
            <div className="flex items-center justify-center p-4 bg-muted/10 rounded-lg border border-border/40 gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-muted-foreground">Tudo em ordem! Nenhuma pendência crítica no momento.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Details Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && getPriorityIcon(selectedAlert.severity)}
              {selectedAlert?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-1">Descrição:</p>
              <p className="text-sm text-muted-foreground">{selectedAlert?.description}</p>
            </div>
            {selectedAlert?.action_required && (
              <div>
                <p className="text-sm font-semibold mb-1">Ação Necessária:</p>
                <p className="text-sm text-muted-foreground">{selectedAlert.action_required}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                Fechar
              </Button>
              <Button onClick={() => selectedAlert && handleResolveAlert(selectedAlert.id)}>
                Marcar como Resolvido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
