import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MapPin, TruckIcon, AlertCircle, CheckCircle } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

interface VehicleJourney {
  id: string;
  embarque_id: string;
  driver_id: string;
  current_status: string;
  departure_time?: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  route_lead_time?: string;
  actual_lead_time?: string;
  is_on_time: boolean;
  delay_reason?: string;
  delay_justification?: string;
  driver?: any;
  embarque?: any;
}

export function VehicleTimeline() {
  const queryClient = useQueryClient();
  const [selectedJourney, setSelectedJourney] = useState<VehicleJourney | null>(null);
  const [justification, setJustification] = useState("");

  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ['vehicle_journeys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_journeys')
        .select(`
          *,
          driver:drivers(*),
          embarque:embarques(*)
        `)
        .in('current_status', ['loading', 'in_transit', 'unloading'])
        .order('departure_time', { ascending: true });

      if (error) throw error;
      return data as VehicleJourney[];
    },
  });

  const handleAddJustification = async () => {
    if (!selectedJourney || !justification.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('vehicle_journeys')
      .update({
        delay_justification: justification,
        justification_added_at: new Date().toISOString(),
        justification_added_by: user.id,
      })
      .eq('id', selectedJourney.id);

    if (error) {
      toast.error("Erro ao adicionar justificativa");
      return;
    }

    toast.success("Justificativa adicionada");
    setJustification("");
    setSelectedJourney(null);
    queryClient.invalidateQueries({ queryKey: ['vehicle_journeys'] });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      loading: "bg-blue-500",
      in_transit: "bg-yellow-500",
      unloading: "bg-orange-500",
      completed: "bg-green-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      loading: "Carregando",
      in_transit: "Em Trânsito",
      unloading: "Descarregando",
      completed: "Concluído",
    };
    return labels[status] || status;
  };

  const calculateDelay = (estimated?: string, actual?: string) => {
    if (!estimated || !actual) return 0;
    return differenceInMinutes(new Date(actual), new Date(estimated));
  };

  if (isLoading) {
    return <div>Carregando timeline...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Timeline de Veículos Ativos</h3>
      
      {journeys.map((journey) => {
        const delay = calculateDelay(journey.estimated_arrival, journey.actual_arrival);
        const needsJustification = !journey.is_on_time && delay > 30 && !journey.delay_justification;

        return (
          <Card key={journey.id} className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(journey.current_status)}`} />
                <div>
                  <p className="font-semibold">
                    {journey.driver?.name || "Motorista não informado"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {journey.driver?.truck_plate || "Placa não informada"}
                  </p>
                </div>
              </div>
              
              <Badge variant={journey.is_on_time ? "default" : "destructive"}>
                {journey.is_on_time ? (
                  <><CheckCircle className="w-3 h-3 mr-1" /> No Prazo</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" /> Atrasado</>
                )}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>
                  {journey.embarque?.origin} → {journey.embarque?.destination}
                </span>
              </div>

              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
                
                {/* Departure */}
                <div className="relative">
                  <div className="absolute -left-[1.4rem] top-1 w-4 h-4 rounded-full bg-green-500 border-4 border-background" />
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Partida: {journey.departure_time 
                        ? format(new Date(journey.departure_time), "dd/MM HH:mm", { locale: ptBR })
                        : "Não informado"}
                    </span>
                  </div>
                </div>

                {/* Current Status */}
                <div className="relative">
                  <div className={`absolute -left-[1.4rem] top-1 w-4 h-4 rounded-full ${getStatusColor(journey.current_status)} border-4 border-background`} />
                  <div className="flex items-center gap-2">
                    <TruckIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {getStatusLabel(journey.current_status)}
                    </span>
                  </div>
                </div>

                {/* Estimated Arrival */}
                <div className="relative">
                  <div className="absolute -left-[1.4rem] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-background" />
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      ETA: {journey.estimated_arrival 
                        ? format(new Date(journey.estimated_arrival), "dd/MM HH:mm", { locale: ptBR })
                        : "Calculando..."}
                    </span>
                  </div>
                </div>

                {/* Disponibilidade prevista */}
                {journey.estimated_arrival && (
                  <div className="relative">
                    <div className="absolute -left-[1.4rem] top-1 w-4 h-4 rounded-full bg-purple-500 border-4 border-background" />
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                        Disponível após: {format(
                          new Date(new Date(journey.estimated_arrival).getTime() + 2 * 60 * 60 * 1000), 
                          "dd/MM HH:mm", 
                          { locale: ptBR }
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {needsJustification && (
                <Dialog open={selectedJourney?.id === journey.id} onOpenChange={(open) => {
                  if (!open) setSelectedJourney(null);
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => setSelectedJourney(journey)}
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Adicionar Justificativa de Atraso
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Justificar Atraso</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Veículo: {journey.driver?.truck_plate} - Atraso de {delay} minutos
                      </p>
                      <Textarea
                        placeholder="Descreva o motivo do atraso..."
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        rows={4}
                      />
                      <Button onClick={handleAddJustification} className="w-full">
                        Salvar Justificativa
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {journey.delay_justification && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p className="font-medium mb-1">Justificativa:</p>
                  <p>{journey.delay_justification}</p>
                </div>
              )}
            </div>
          </Card>
        );
      })}

      {journeys.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum veículo em trânsito no momento
        </Card>
      )}
    </div>
  );
}
