import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/integrations/supabase/client";
import {
  Truck,
  MapPin,
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Navigation
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface VehicleJourney {
  id: string;
  driver_id: string;
  embarque_id: string;
  departure_time: string;
  estimated_arrival: string;
  actual_arrival?: string;
  current_status: string;
  delay_justification?: string;
  is_on_time: boolean;
  driver?: any;
  embarque?: any;
  route_lead_time?: string;
}

export function EnhancedVehicleTimeline() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJourney, setSelectedJourney] = useState<VehicleJourney | null>(null);
  const [justification, setJustification] = useState("");

  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ['vehicle-journeys'],
    queryFn: async () => {
      // MOCK DATA
      return [
        {
          id: 'vj1',
          driver_id: 'd1',
          embarque_id: 'e1',
          departure_time: new Date(Date.now() - 7200000).toISOString(),
          estimated_arrival: new Date(Date.now() + 3600000).toISOString(),
          current_status: 'in_transit',
          is_on_time: true,
          driver: { name: 'João (MOCK)', truck_plate: 'ABC-1234', vehicle_type: 'Truck' },
          embarque: { origin: 'São Paulo, SP', destination: 'Rio de Janeiro, RJ' },
          route_lead_time: '5h'
        },
        {
          id: 'vj2',
          driver_id: 'd2',
          embarque_id: 'e2',
          departure_time: new Date(Date.now() - 108000000).toISOString(),
          estimated_arrival: new Date(Date.now() - 3600000).toISOString(), // Atrasado
          current_status: 'loading',
          is_on_time: false,
          driver: { name: 'Maria (MOCK)', truck_plate: 'XYZ-9876', vehicle_type: 'Truck' },
          embarque: { origin: 'Belo Horizonte, MG', destination: 'São Paulo, SP' },
          route_lead_time: '7h'
        }
      ] as VehicleJourney[];
    },
  });

  const handleAddJustification = async () => {
    if (!selectedJourney || !justification) return;

    // MOCK UPDATE
    console.log("Mock update justification:", selectedJourney.id, justification);
    const error = null;

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a justificativa.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Justificativa adicionada",
      description: "A justificativa foi registrada com sucesso.",
    });

    setSelectedJourney(null);
    setJustification("");
    queryClient.invalidateQueries({ queryKey: ['vehicle-journeys'] });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      loading: 'bg-blue-500',
      in_transit: 'bg-green-500',
      unloading: 'bg-yellow-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      loading: 'Carregando',
      in_transit: 'Em Trânsito',
      unloading: 'Descarregando',
    };
    return labels[status] || status;
  };

  const calculateETA = (estimatedArrival: string) => {
    const eta = new Date(estimatedArrival);
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
      return { text: 'Atrasado', color: 'text-destructive', hours: diffHours, minutes: diffMinutes };
    } else if (diffHours < 2) {
      return { text: `${diffHours}h ${diffMinutes}min`, color: 'text-yellow-600', hours: diffHours, minutes: diffMinutes };
    } else {
      return { text: `${diffHours}h ${diffMinutes}min`, color: 'text-green-600', hours: diffHours, minutes: diffMinutes };
    }
  };

  const calculateNextAvailability = (estimatedArrival: string) => {
    const eta = new Date(estimatedArrival);
    // Adiciona 2h para descarga e 1h para disponibilização
    eta.setHours(eta.getHours() + 3);
    return eta.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <div>Carregando timeline...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Timeline de Veículos - LeadTime vs Jornada Real
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Acompanhamento em tempo real com ETA e previsão de disponibilidade
              </p>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {journeys.length} veículos ativos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {journeys.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhum veículo em trânsito no momento</p>
            </div>
          ) : (
            journeys.map((journey) => {
              const eta = calculateETA(journey.estimated_arrival);
              const nextAvailability = calculateNextAvailability(journey.estimated_arrival);
              const isDelayed = !journey.is_on_time;

              return (
                <Card key={journey.id} className={`${isDelayed ? 'border-yellow-500/50' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header: Driver & Vehicle Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Truck className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">{journey.driver?.name || 'Motorista'}</p>
                            <p className="text-sm text-muted-foreground">
                              {journey.driver?.truck_plate || 'Sem placa'} • {journey.driver?.vehicle_type || 'Tipo não informado'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(journey.current_status)}>
                            {getStatusLabel(journey.current_status)}
                          </Badge>
                          {isDelayed && (
                            <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Fora do LeadTime
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Route Info */}
                      <div className="bg-accent/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="font-medium">Rota Atual</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{journey.embarque?.origin || 'Origem'}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm font-medium">{journey.embarque?.destination || 'Destino'}</span>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="relative pl-8 space-y-4">
                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />

                        {/* Departure */}
                        <div className="relative">
                          <div className="absolute -left-[26px] h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
                          <div>
                            <p className="text-sm font-medium">Partida</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(journey.departure_time).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>

                        {/* Current Status */}
                        <div className="relative">
                          <div className={`absolute -left-[26px] h-4 w-4 rounded-full border-2 border-background ${getStatusColor(journey.current_status)}`} />
                          <div>
                            <p className="text-sm font-medium">{getStatusLabel(journey.current_status)}</p>
                            <p className="text-xs text-muted-foreground">Status atual</p>
                          </div>
                        </div>

                        {/* ETA */}
                        <div className="relative">
                          <div className="absolute -left-[26px] h-4 w-4 rounded-full bg-blue-500 border-2 border-background" />
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">ETA - Chegada Prevista</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(journey.estimated_arrival).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <Badge variant="outline" className={eta.color}>
                              <Clock className="h-3 w-3 mr-1" />
                              {eta.text}
                            </Badge>
                          </div>
                        </div>

                        {/* Next Availability */}
                        <div className="relative">
                          <div className="absolute -left-[26px] h-4 w-4 rounded-full bg-purple-500 border-2 border-background" />
                          <div>
                            <p className="text-sm font-medium flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-purple-500" />
                              Disponível para nova carga
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Previsão: {nextAvailability}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex gap-2">
                          {journey.route_lead_time && (
                            <Badge variant="secondary">
                              LeadTime Padrão: {journey.route_lead_time}
                            </Badge>
                          )}
                        </div>
                        {isDelayed && !journey.delay_justification && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedJourney(journey)}
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Adicionar Justificativa
                          </Button>
                        )}
                        {journey.delay_justification && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Justificativa registrada
                          </div>
                        )}
                      </div>

                      {journey.delay_justification && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm font-medium mb-1">Justificativa do Atraso:</p>
                          <p className="text-sm text-muted-foreground">{journey.delay_justification}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Justification Dialog */}
      <Dialog open={!!selectedJourney} onOpenChange={(open) => !open && setSelectedJourney(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Justificativa de Atraso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Motorista: <span className="font-medium text-foreground">{selectedJourney?.driver?.name}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Rota: {selectedJourney?.embarque?.origin} → {selectedJourney?.embarque?.destination}
              </p>
            </div>
            <Textarea
              placeholder="Descreva o motivo do atraso (ex: trânsito intenso, problema mecânico, condições climáticas...)"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedJourney(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAddJustification} disabled={!justification}>
              Salvar Justificativa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
