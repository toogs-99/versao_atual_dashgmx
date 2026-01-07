import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { directus } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { Truck, Download, Calendar, MapPin, Package, CheckCircle, Clock } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export function DailyVehicleProposals() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Fetch daily vehicle offers (matches)
  const { data: offers, isLoading: offersLoading } = useQuery({
    queryKey: ['daily_vehicle_offers', selectedDate, clientFilter],
    queryFn: async () => {
      try {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch matches created within the selected date
        const data = await directus.request(readItems('vehicle_matches', {
          filter: {
            created_at: {
              _between: [startOfDay.toISOString(), endOfDay.toISOString()]
            }
          },
          fields: ['*', 'driver_id.*', 'embarque_id.*', 'driver_id.cavadlo_id.*'], // Expand driver and potential shipment
          sort: ['-created_at']
        }));

        const mappedOffers = data.map((match: any) => {
          // Logic to determine "suggested clients" - likely from the shipment (embarque) if matched, 
          // or just placeholder if purely a proactive suggestion. 
          // If match is linked to an embarque, the "client" is the embarque origin/destination or a client field.
          // Let's assume embarque has client info.

          const clientName = match.embarque_id?.destinatario || 'Cliente Sugerido';

          return {
            id: match.id,
            date: match.created_at,
            driver_id: match.driver_id?.id,
            vehicle_type: match.driver_id?.tipo_veiculo || 'N/A',
            current_location: match.driver_id?.localizacao_atual || 'Não Informado',
            available_at: match.created_at, // Using creation time as availability time proxy
            compatible_products: match.factors?.compatible_products || [], // Accessing JSON factor for products if exists
            suggested_clients: [clientName],
            offer_status: match.status,
            driver: {
              name: `${match.driver_id?.nome || ''} ${match.driver_id?.sobrenome || ''}`,
              truck_plate: match.driver_id?.placa || 'N/A',
              status: match.driver_id?.status || 'active'
            }
          };
        });

        return mappedOffers.filter((o: any) => {
          if (clientFilter !== 'all' && !o.suggested_clients.includes(clientFilter)) return false;
          return true;
        });

      } catch (err) {
        console.error("Error fetching vehicle offers:", err);
        return [];
      }
    },
  });

  // Get unique clients from offers
  const availableClients = Array.from(
    new Set(
      offers?.flatMap(offer =>
        Array.isArray(offer.suggested_clients)
          ? offer.suggested_clients.map(c => String(c))
          : []
      ) || []
    )
  ).sort();

  const handleExportProposals = () => {
    if (!offers || offers.length === 0) {
      toast.error("Nenhuma proposta para exportar");
      return;
    }

    const csvContent = [
      ['Data', 'Motorista', 'Placa', 'Tipo Veículo', 'Localização', 'Disponível Em', 'Produtos Compatíveis', 'Clientes Sugeridos', 'Status'].join(';'),
      ...offers.map(offer => [
        format(new Date(offer.date), 'dd/MM/yyyy', { locale: ptBR }),
        offer.driver?.name || 'N/A',
        offer.driver?.truck_plate || 'N/A',
        offer.vehicle_type || 'N/A',
        offer.current_location || 'N/A',
        offer.available_at ? format(new Date(offer.available_at), 'dd/MM HH:mm', { locale: ptBR }) : 'Imediato',
        Array.isArray(offer.compatible_products) ? offer.compatible_products.join(', ') : 'N/A',
        Array.isArray(offer.suggested_clients) ? offer.suggested_clients.join(', ') : 'N/A',
        offer.offer_status === 'pending' ? 'Pendente' :
          offer.offer_status === 'sent' ? 'Enviado' :
            offer.offer_status === 'accepted' ? 'Aceito' : 'Rejeitado'
      ].join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `propostas_veiculos_${selectedDate}.csv`;
    link.click();

    toast.success("Relatório exportado com sucesso");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'sent':
        return 'Enviado';
      case 'accepted':
        return 'Aceito';
      case 'rejected':
        return 'Rejeitado';
      default:
        return status;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Propostas Diárias de Veículos Disponíveis
          </CardTitle>
          <Button
            onClick={handleExportProposals}
            variant="outline"
            size="sm"
            disabled={!offers || offers.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Sugestões automáticas de veículos para oferta comercial
        </p>

        <div className="flex gap-2 mt-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Clientes</SelectItem>
              {availableClients.map(client => (
                <SelectItem key={client} value={client}>{client}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {offersLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
          </div>
        ) : offers && offers.length > 0 ? (
          <div className="space-y-3">
            {offers.map((offer) => (
              <div key={offer.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">
                        {offer.driver?.name || 'Motorista não informado'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {offer.driver?.truck_plate} - {offer.vehicle_type || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(offer.offer_status)}>
                    {getStatusLabel(offer.offer_status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{offer.current_location || 'Localização não informada'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {offer.available_at
                        ? format(new Date(offer.available_at), 'dd/MM HH:mm', { locale: ptBR })
                        : 'Disponível agora'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {offer.driver?.status === 'active' ? 'GR Aprovada' : 'Verificar GR'}
                    </span>
                  </div>
                </div>

                {Array.isArray(offer.compatible_products) && offer.compatible_products.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Produtos Compatíveis:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(offer.compatible_products) && offer.compatible_products.map((product, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {String(product)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(offer.suggested_clients) && offer.suggested_clients.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Clientes Sugeridos:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {offer.suggested_clients.map((client, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {String(client)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma proposta de veículo disponível para a data selecionada</p>
            <p className="text-sm mt-2">
              As propostas são geradas automaticamente pelo sistema
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
