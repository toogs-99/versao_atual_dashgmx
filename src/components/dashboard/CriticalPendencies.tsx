import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Package, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { directus, publicDirectus } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { useOperationalAlerts } from "@/hooks/useOperationalAlerts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CriticalPendencies() {
  const { criticalAlerts, highAlerts, resolveAlert } = useOperationalAlerts();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const { toast } = useToast();

  const { data: immediateActions = [], isLoading: loadingActions } = useQuery({
    queryKey: ['immediate-actions'],
    queryFn: async () => {
      try {
        const response = await publicDirectus.request(readItems('embarques', {
          filter: {
            status: {
              _in: ['needs_attention', 'waiting_confirmation']
            }
          },
          fields: ['id', 'status', 'origin', 'destination', 'cargo_type', 'date_created', 'client_name'],
          sort: ['-date_created'],
          limit: 10
        }));
        return response;
      } catch (error) {
        console.error("Error fetching immediate actions:", error);
        return [];
      }
    },
    refetchInterval: 30000
  });

  const handleResolveAlert = async () => {
    if (!selectedAlert) return;

    await resolveAlert(selectedAlert.id);
    toast({
      title: "Alerta resolvido",
      description: "O alerta foi marcado como resolvido.",
    });
    setSelectedAlert(null);
  };

  if (loadingActions) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando ações imediatas...</div>;
  }

  if (immediateActions.length === 0) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Ações Imediatas
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
          <p className="font-semibold text-green-600">Tudo em dia! Nenhuma ação imediata necessária.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Ações Imediatas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {immediateActions.map((action: any) => (
            <div
              key={action.id}
              className="flex items-start justify-between p-3 bg-background rounded-lg border border-destructive/20 shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-destructive">
                    {action.client_name || 'Cliente Desconhecido'}
                  </span>
                  <Badge variant="destructive" className="text-[10px]">
                    {action.status === 'needs_attention' ? 'Verificação Necessária' : 'Aguardando Confirmação'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>{action.origin}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{action.destination}</span>
                </div>
                {action.cargo_type && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Package className="h-3 w-3" />
                    <span>{action.cargo_type}</span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => toast({ title: "Detalhes", description: "Funcionalidade de detalhes em breve." })}
              >
                Ver Detalhes
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolvendo Alerta</DialogTitle>
            <DialogDescription>
              Confirme se deseja marcar este alerta como resolvido.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedAlert && (
              <div className="space-y-2">
                <p><strong>Tipo:</strong> {selectedAlert.type}</p>
                <p><strong>Mensagem:</strong> {selectedAlert.message}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedAlert(null)}>Cancelar</Button>
            <Button onClick={handleResolveAlert}>Confirmar Resolução</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper component for empty state icon
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
