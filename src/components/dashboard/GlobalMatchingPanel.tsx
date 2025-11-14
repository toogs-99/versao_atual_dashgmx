import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Truck, MapPin, Calendar, TrendingUp, ArrowRight, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useVehicleMatching } from "@/hooks/useVehicleMatching";

export function GlobalMatchingPanel() {
  const { toast } = useToast();
  const { updateMatchStatus } = useVehicleMatching();
  const [offeringMatch, setOfferingMatch] = useState<string | null>(null);

  // Buscar todos os embarques aguardando
  const { data: pendingEmbarques = [], isLoading: loadingEmbarques } = useQuery({
    queryKey: ['pending-embarques-matching'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('embarques')
        .select('*')
        .in('status', ['new', 'awaiting_response'])
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar matching para cada embarque
  const { data: allMatches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ['all-vehicle-matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_vehicle_matching')
        .select(`
          *,
          driver:drivers(*),
          embarque:embarques(*)
        `)
        .in('status', ['suggested', 'offered'])
        .order('compatibility_score', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleOfferMatch = async (matchId: string, embarqueId: string) => {
    setOfferingMatch(matchId);
    try {
      await updateMatchStatus(matchId, 'offered');
      toast({
        title: "Oferta enviada",
        description: "A oferta foi enviada para o motorista com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a oferta.",
        variant: "destructive",
      });
    } finally {
      setOfferingMatch(null);
    }
  };

  const handleOfferAllMatches = async (embarqueId: string) => {
    const embarqueMatches = allMatches.filter(m => m.embarque_id === embarqueId && m.status === 'suggested');
    
    try {
      for (const match of embarqueMatches) {
        await updateMatchStatus(match.id, 'offered');
      }
      toast({
        title: "Ofertas enviadas",
        description: `${embarqueMatches.length} ofertas foram enviadas com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar todas as ofertas.",
        variant: "destructive",
      });
    }
  };

  const getCompatibilityBadge = (level: string, score: number) => {
    const config: Record<string, any> = {
      high: { icon: '🟢', variant: 'default', label: 'Alta' },
      medium: { icon: '🟡', variant: 'secondary', label: 'Média' },
      low: { icon: '🔴', variant: 'outline', label: 'Baixa' },
    };
    const { icon, variant, label } = config[level] || config.low;
    return (
      <Badge variant={variant} className="gap-1">
        <span>{icon}</span>
        <span>{score}% {label}</span>
      </Badge>
    );
  };

  const getFactorsList = (factors: any) => {
    if (!factors) return [];
    
    const factorsList = [];
    if (factors.location_match) factorsList.push({ icon: '✅', text: 'Mesma região (retorno eficiente)' });
    if (factors.equipment_compatible) factorsList.push({ icon: '✅', text: 'Equipamento compatível' });
    if (factors.available_soon) factorsList.push({ icon: '✅', text: `Disponível em breve` });
    if (factors.gr_approved) factorsList.push({ icon: '✅', text: 'GR Aprovada' });
    if (!factors.client_history) factorsList.push({ icon: '⚠️', text: 'Sem histórico com este cliente' });
    
    return factorsList;
  };

  if (loadingEmbarques || loadingMatches) {
    return <div className="p-8 text-center">Carregando matching automático...</div>;
  }

  if (pendingEmbarques.length === 0) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="py-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
          <p className="font-semibold text-green-600">Nenhum embarque aguardando matching</p>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as cargas foram atribuídas ou estão em andamento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Matching Automático Global - {pendingEmbarques.length} Cargas Aguardando
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Veículos sugeridos automaticamente com base em compatibilidade, localização e disponibilidade
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {pendingEmbarques.map((embarque) => {
          const embarqueMatches = allMatches
            .filter(m => m.embarque_id === embarque.id)
            .slice(0, 3); // Top 3 sugestões

          return (
            <div key={embarque.id} className="border rounded-lg p-4 space-y-4">
              {/* Embarque Info */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{embarque.client_name || 'Cliente não especificado'}</h3>
                    <Badge variant={embarque.status === 'new' ? 'destructive' : 'secondary'}>
                      {embarque.status === 'new' ? 'Novo' : 'Aguardando Resposta'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{embarque.origin}</span>
                      <ArrowRight className="h-4 w-4" />
                      <span>{embarque.destination}</span>
                    </div>
                    {embarque.delivery_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(embarque.delivery_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                {embarqueMatches.length > 0 && (
                  <Button 
                    size="sm"
                    onClick={() => handleOfferAllMatches(embarque.id)}
                    disabled={!embarqueMatches.some(m => m.status === 'suggested')}
                  >
                    Ofertar para Todos ({embarqueMatches.length})
                  </Button>
                )}
              </div>

              {/* Veículos Sugeridos */}
              {embarqueMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {embarqueMatches.map((match) => (
                    <div
                      key={match.id}
                      className="border rounded-lg p-3 space-y-2 bg-accent/20 hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-semibold text-sm">{match.driver?.name}</p>
                            <p className="text-xs text-muted-foreground">{match.driver?.truck_plate}</p>
                          </div>
                        </div>
                        {getCompatibilityBadge(match.compatibility_level, Math.round(match.compatibility_score))}
                      </div>

                      {/* Fatores de Compatibilidade */}
                      <div className="space-y-1">
                        {getFactorsList(match.factors).map((factor, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <span>{factor.icon}</span>
                            <span className="text-muted-foreground">{factor.text}</span>
                          </div>
                        ))}
                      </div>

                      {/* Status e Ação */}
                      <div className="pt-2 border-t">
                        {match.status === 'suggested' ? (
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => handleOfferMatch(match.id, embarque.id)}
                            disabled={offeringMatch === match.id}
                          >
                            {offeringMatch === match.id ? 'Enviando...' : 'Ofertar'}
                          </Button>
                        ) : (
                          <Badge variant="default" className="w-full justify-center">
                            Oferta Enviada
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum veículo sugerido ainda</p>
                  <p className="text-xs">Execute o matching automático para gerar sugestões</p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
