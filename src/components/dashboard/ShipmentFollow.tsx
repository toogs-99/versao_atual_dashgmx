import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEmbarques } from "@/hooks/useEmbarques";
import { useState } from "react";
import { 
  Search, 
  Package, 
  Truck, 
  MapPin, 
  Clock,
  Download,
  Eye
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export function ShipmentFollow() {
  const { embarques, isLoading } = useEmbarques();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmbarques = embarques.filter(e =>
    e.origin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'new': { variant: 'secondary', label: 'Novo' },
      'needs_attention': { variant: 'destructive', label: 'Sem Veículo' },
      'in_transit': { variant: 'default', label: 'Em Trânsito' },
      'completed': { variant: 'outline', label: 'Concluído' },
    };
    
    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateProgress = (embarque: any) => {
    if (embarque.status === 'completed') return 100;
    if (embarque.status === 'in_transit') return 50;
    if (embarque.status === 'new') return 10;
    return 0;
  };

  const calculateETA = (embarque: any) => {
    if (!embarque.delivery_date) return 'Não definido';
    
    const deliveryDate = new Date(embarque.delivery_date);
    const now = new Date();
    const diff = deliveryDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 0) return 'Atrasado';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Follow - Acompanhamento de Cargas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Total: {filteredEmbarques.length}</Badge>
            <Badge variant="default">
              Em trânsito: {filteredEmbarques.filter(e => e.status === 'in_transit').length}
            </Badge>
            <Badge variant="destructive">
              Sem veículo: {filteredEmbarques.filter(e => e.status === 'needs_attention').length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por origem, destino ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Transit Time</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmbarques.map((embarque) => (
                <TableRow key={embarque.id}>
                  <TableCell>
                    {getStatusBadge(embarque.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {embarque.origin} → {embarque.destination}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{embarque.cargo_type || '-'}</span>
                  </TableCell>
                  <TableCell>
                    {embarque.driver_id ? (
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">Alocado</span>
                      </div>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        SEM VEÍCULO
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {embarque.pickup_date && embarque.delivery_date
                          ? `${Math.floor((new Date(embarque.delivery_date).getTime() - new Date(embarque.pickup_date).getTime()) / (1000 * 60 * 60))}h`
                          : '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {calculateETA(embarque)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="w-20">
                      <Progress value={calculateProgress(embarque)} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredEmbarques.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-semibold">Nenhuma carga encontrada</p>
            <p className="text-sm">Ajuste os filtros ou crie uma nova carga</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
