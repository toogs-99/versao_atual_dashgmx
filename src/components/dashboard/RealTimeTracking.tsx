import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, RefreshCw, AlertTriangle, Clock, MessageSquare, DollarSign, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInHours, differenceInMinutes } from "date-fns";

export const RealTimeTracking = () => {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("list");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");

  useEffect(() => {
    fetchShipments();

    const channel = supabase
      .channel('tracking-shipments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'embarques'
        },
        () => {
          fetchShipments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchShipments, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchShipments = async () => {
    try {
      const { data, error } = await supabase
        .from("embarques")
        .select('*')
        .eq("status", "in_progress")
        .order("pickup_date", { ascending: true });

      if (error) throw error;
      
      // Fetch drivers separately
      const driverIds = [...new Set(data?.map(e => e.driver_id).filter(Boolean))];
      let driversMap: Record<string, any> = {};
      
      if (driverIds.length > 0) {
        const { data: driversData } = await supabase
          .from('drivers')
          .select('id, name, phone, truck_plate')
          .in('id', driverIds);
        
        if (driversData) {
          driversMap = driversData.reduce((acc, driver) => {
            acc[driver.id] = driver;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const shipmentsWithDrivers = (data || []).map(shipment => ({
        ...shipment,
        drivers: shipment.driver_id ? driversMap[shipment.driver_id] : null
      }));
      
      setShipments(shipmentsWithDrivers);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      toast({
        title: "Erro ao carregar embarques",
        description: "Não foi possível carregar embarques em andamento.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = (shipment: any) => {
    if (!shipment.pickup_date || !shipment.delivery_date) return 0;
    
    const start = new Date(shipment.pickup_date);
    const end = new Date(shipment.delivery_date);
    const now = new Date();
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    return Math.round(progress);
  };

  const calculateRisk = (shipment: any) => {
    if (!shipment.delivery_date) return "baixo";
    
    const deliveryDate = new Date(shipment.delivery_date);
    const now = new Date();
    const hoursUntilDelivery = differenceInHours(deliveryDate, now);
    const progress = calculateProgress(shipment);
    
    if (hoursUntilDelivery < 0) return "alto";
    if (hoursUntilDelivery < 6 && progress < 80) return "alto";
    if (hoursUntilDelivery < 12 && progress < 60) return "medio";
    
    if (shipment.actual_arrival_time) {
      const arrivalTime = new Date(shipment.actual_arrival_time);
      const waitingHours = differenceInHours(now, arrivalTime);
      if (waitingHours > 2) return "alto";
    }
    
    return "baixo";
  };

  const getLastUpdate = (shipment: any) => {
    if (!shipment.last_location_update) return "Sem atualização";
    
    const lastUpdate = new Date(shipment.last_location_update);
    const now = new Date();
    const minutesDiff = differenceInMinutes(now, lastUpdate);
    
    if (minutesDiff < 60) return `Há ${minutesDiff} min`;
    const hoursDiff = Math.floor(minutesDiff / 60);
    return `Há ${hoursDiff}h`;
  };

  const getRiskBadge = (risk: string) => {
    const riskMap = {
      baixo: { label: "Baixo Risco", className: "bg-success text-success-foreground" },
      medio: { label: "Risco Médio", className: "bg-warning text-warning-foreground" },
      alto: { label: "Alto Risco", className: "bg-danger text-danger-foreground" },
    };
    const config = riskMap[risk as keyof typeof riskMap];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      in_progress: { label: "Em Rota", className: "bg-primary text-primary-foreground" },
      waiting_unload: { label: "Aguardando Descarga", className: "bg-warning text-warning-foreground" },
    };
    const config = statusMap[status] || { label: status, className: "bg-muted text-muted-foreground" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Rastreamento em Tempo Real
        </h2>
        <p className="text-muted-foreground">
          Acompanhe todos os embarques ativos no momento
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Controles e Filtros</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
                  Auto-atualizar (30s)
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={fetchShipments}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar Agora
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Região" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Regiões</SelectItem>
                <SelectItem value="sudeste">Sudeste</SelectItem>
                <SelectItem value="sul">Sul</SelectItem>
                <SelectItem value="nordeste">Nordeste</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Risco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Riscos</SelectItem>
                <SelectItem value="baixo">Baixo Risco</SelectItem>
                <SelectItem value="medio">Risco Médio</SelectItem>
                <SelectItem value="alto">Alto Risco</SelectItem>
              </SelectContent>
            </Select>

            <Input type="date" placeholder="Data de Entrega" />

            <Button variant="outline" className="w-full">
              Exportar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "map" | "list")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="map">Mapa</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-6">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-lg font-medium">Mapa Interativo</p>
                  <p className="text-sm text-muted-foreground">
                    Integração com Google Maps / Mapbox
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Visualize todos os motoristas em tempo real no mapa
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Carregando embarques...</p>
            </div>
          ) : shipments.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum embarque em andamento no momento</p>
              </CardContent>
            </Card>
          ) : (
            shipments.map((shipment) => {
              const progress = calculateProgress(shipment);
              const risk = calculateRisk(shipment);
              const isWaiting = shipment.actual_arrival_time && differenceInHours(new Date(), new Date(shipment.actual_arrival_time)) > 2;
              
              return (
                <Card
                  key={shipment.id}
                  className={`shadow-card transition-all hover:shadow-hover ${
                    isWaiting ? "border-warning border-2" : ""
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold">#{shipment.id?.toString().slice(0, 8)}</h3>
                          {getStatusBadge(shipment.status)}
                          {getRiskBadge(risk)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Motorista: <span className="font-medium text-foreground">
                            {shipment.drivers?.name || "Não atribuído"}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          <span>{getLastUpdate(shipment)}</span>
                        </div>
                        {isWaiting && (
                          <Badge className="bg-danger text-danger-foreground gap-1">
                            <DollarSign className="h-3 w-3" />
                            Diária Necessária
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-success mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Origem</p>
                          <p className="text-sm font-medium">{shipment.origin}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-danger mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Destino</p>
                          <p className="text-sm font-medium">{shipment.destination}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Progresso da Viagem</span>
                        <span className="text-sm font-bold text-primary">{progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-primary h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {shipment.delivery_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Previsão de entrega: {new Date(shipment.delivery_date).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>

                    {shipment.cargo_type && (
                      <div className="bg-muted p-3 rounded-lg mb-3">
                        <div className="flex items-start gap-2">
                          <Package className="h-4 w-4 text-primary mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-medium mb-1">Tipo de Carga:</p>
                            <p className="text-sm">{shipment.cargo_type}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {risk === "alto" && (
                      <div className="flex items-center gap-2 mt-3 p-2 bg-danger/10 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-danger" />
                        <p className="text-sm text-danger font-medium">
                          Risco de atraso na entrega - Monitoramento necessário
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};