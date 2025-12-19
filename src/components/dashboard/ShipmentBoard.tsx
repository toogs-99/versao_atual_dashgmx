import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, DollarSign, CheckCircle, X, Maximize2, Play, AlertTriangle, FileText, Loader2, Mail, Plus, Calendar } from "lucide-react";
import { ShipmentDetailsDialog } from "@/components/shipment/ShipmentDetailsDialog";
import { ShipmentTimer } from "@/components/shipment/ShipmentTimer";
import { ShipmentTableView } from "@/components/shipment/ShipmentTableView";
import { ShipmentViewControls } from "@/components/shipment/ShipmentViewControls";
import { DriverProfileDialog } from "@/components/driver/DriverProfileDialog";
import { CreateShipmentDialog } from "@/components/shipment/CreateShipmentDialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useEmbarques } from "@/hooks/useEmbarques";
import { statusMapping, EmbarqueStatus } from "@/types/embarque";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, isToday, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export const ShipmentBoard = () => {
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [focusColumn, setFocusColumn] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [shipmentToStart, setShipmentToStart] = useState<any>(null);
  const [periodFilter, setPeriodFilter] = useState<"today" | "month" | "all">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch data from database
  const { embarques, embarquesByStatus, isLoading } = useEmbarques();

  // Transform database data into columns format with period filter
  const shipmentColumns = useMemo(() => {
    const filterByPeriod = (embarques: any[]) => {
      if (periodFilter === "today") {
        return embarques.filter(e => isToday(new Date(e.created_at)));
      } else if (periodFilter === "month") {
        return embarques.filter(e => isThisMonth(new Date(e.created_at)));
      }
      return embarques; // all
    };

    const formatDate = (dateString: string | null) => {
      if (!dateString) return null;
      try {
        return new Date(dateString).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return null;
      }
    };

    const statuses: EmbarqueStatus[] = ['new', 'needs_attention', 'sent', 'waiting_confirmation', 'confirmed', 'in_transit', 'waiting_receipt'];

    const columns = statuses.map(status => {
      const config = statusMapping[status];
      const filteredEmbarques = filterByPeriod(embarquesByStatus[status] || []);
      const shipments = filteredEmbarques.map(embarque => ({
        ...embarque,
        deadline: formatDistanceToNow(embarque.created_at, { addSuffix: true, locale: ptBR }),
        hasPaymentProof: false,
        driver: embarque.driver?.name,
        pickupDate: formatDate(embarque.pickup_date),
        deliveryDate: formatDate(embarque.delivery_date),
      }));

      return {
        title: config.title,
        status,
        color: config.color,
        badgeColor: config.badgeColor,
        shipments
      };
    });

    // Add "Concluídos" column with period filter
    const delivered = filterByPeriod(embarquesByStatus['delivered'] || [])
      .map(embarque => ({
        ...embarque,
        deadline: formatDistanceToNow(embarque.created_at, { addSuffix: true, locale: ptBR }),
        hasPaymentProof: false,
        driver: embarque.driver?.name,
        pickupDate: formatDate(embarque.pickup_date),
        deliveryDate: formatDate(embarque.delivery_date),
      }));

    columns.push({
      title: 'Concluídos',
      status: 'delivered' as EmbarqueStatus,
      color: 'bg-emerald-50 dark:bg-emerald-950/20',
      badgeColor: 'bg-emerald-500',
      shipments: delivered
    });

    return columns;
  }, [embarques, embarquesByStatus, periodFilter]);

  const handleViewDetails = (shipment: any) => {
    setSelectedShipment(shipment);
    setDialogOpen(true);
  };

  const handleDriverClick = (driverName: string) => {
    setSelectedDriver(driverName);
    setDriverDialogOpen(true);
  };

  const handleConfirmGMX = async (shipment: any) => {
    toast({
      title: "GMX Confirmado (MOCK)",
      description: `Embarque #${shipment.id} confirmado com sucesso!`,
    });
  };

  const handleStartRide = async (shipment: any) => {
    // Mock check: always assume receipt exists or allow override
    const mockReceiptExists = true;

    if (!mockReceiptExists) {
      setShipmentToStart(shipment);
      setAlertDialogOpen(true);
    } else {
      await startRide(shipment);
    }
  };

  const startRide = async (shipment: any) => {
    toast({
      title: "Corrida Iniciada (MOCK)",
      description: `Embarque #${shipment.id} iniciado com sucesso!`,
    });
  };

  const handleForceStart = async () => {
    if (shipmentToStart) {
      await startRide(shipmentToStart);
      setAlertDialogOpen(false);
      setShipmentToStart(null);
    }
  };

  const visibleColumns = focusColumn
    ? shipmentColumns.filter(col => col.status === focusColumn)
    : shipmentColumns;

  const getPaginatedShipments = (shipments: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return shipments.slice(startIndex, endIndex);
  };

  const getTotalPages = (shipments: any[]) => {
    return Math.ceil(shipments.length / itemsPerPage);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Embarques - Ofertas de Fretes
          </h2>
          <p className="text-muted-foreground">
            Acompanhe o status de todas as ofertas
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-64 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  const totalShipments = shipmentColumns.reduce((acc, col) => acc + col.shipments.length, 0);
  if (totalShipments === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Embarques - Ofertas de Fretes
            </h2>
            <p className="text-muted-foreground">
              Acompanhe o status de todas as ofertas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Período:</span>
            <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="all">Total</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <Loader2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Nenhum embarque encontrado</h3>
              <p className="text-sm text-muted-foreground">
                Comece criando seu primeiro embarque
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ShipmentDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shipment={selectedShipment}
      />

      <DriverProfileDialog
        open={driverDialogOpen}
        onOpenChange={setDriverDialogOpen}
        driverName={selectedDriver}
      />

      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Comprovante de Pagamento Ausente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                O comprovante de pagamento do motorista não foi anexado.
              </p>
              <p className="font-medium text-foreground">
                Deseja iniciar a corrida mesmo assim?
              </p>
              <p className="text-xs text-muted-foreground">
                Caso prossiga, o embarque ficará marcado com aviso de comprovante pendente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceStart} className="bg-warning hover:bg-warning/90">
              Prosseguir Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateShipmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Embarques - Ofertas de Fretes
          </h2>
          <p className="text-muted-foreground">
            Acompanhe o status de todas as ofertas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            className="bg-gradient-primary"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Oferta
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Período:</span>
            <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="all">Total</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ShipmentViewControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={(items) => {
          setItemsPerPage(items);
          setCurrentPage(1);
        }}
        focusColumn={focusColumn}
        onFocusColumnChange={(col) => {
          setFocusColumn(col);
          setCurrentPage(1);
        }}
        columns={shipmentColumns}
      />

      {viewMode === "card" ? (
        <div className={`grid gap-4 ${focusColumn ? 'md:grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}`}>
          {visibleColumns.map((column) => {
            const paginatedShipments = getPaginatedShipments(column.shipments);
            const totalPages = getTotalPages(column.shipments);

            return (
              <div key={column.status} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{column.title}</h3>
                  <Badge className={column.badgeColor}>
                    {column.shipments.length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {paginatedShipments.map((shipment) => (
                    <Card
                      key={shipment.id}
                      className={`shadow-card transition-all hover:shadow-hover cursor-pointer ${column.color}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium">
                            {shipment.cargo}
                          </CardTitle>
                          <ShipmentTimer
                            deadline={shipment.deadline}
                            className="text-muted-foreground"
                            highlight={column.status === "waiting_confirmation"}
                            realtime={column.status === "waiting_confirmation"}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{shipment.origin}</p>
                              <p className="text-xs text-muted-foreground">Origem</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-danger mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{shipment.destination}</p>
                              <p className="text-xs text-muted-foreground">Destino</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-success">
                            R$ {shipment.value.toLocaleString()}
                          </span>
                        </div>

                        {shipment.email_content && (
                          <div className="pt-2 border-t">
                            <Badge variant="outline" className="text-xs border-primary/50 text-primary bg-primary/5">
                              <Mail className="h-3 w-3 mr-1" />
                              Email disponível
                            </Badge>
                          </div>
                        )}

                        {shipment.driver && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              Motorista:{" "}
                              <button
                                className="font-medium text-primary hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDriverClick(shipment.driver);
                                }}
                              >
                                {shipment.driver}
                              </button>
                            </p>
                          </div>
                        )}

                        {shipment.delivery_window && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              Janela de Entrega: <span className="font-medium">{shipment.delivery_window}</span>
                            </p>
                          </div>
                        )}

                        {(shipment.pickupDate || shipment.deliveryDate) && (
                          <div className="pt-2 border-t space-y-1">
                            {shipment.pickupDate && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Coleta:</span>
                                <span className="font-medium">{shipment.pickupDate}</span>
                              </div>
                            )}
                            {shipment.deliveryDate && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Entrega:</span>
                                <span className="font-medium">{shipment.deliveryDate}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {shipment.rejected_drivers_count > 0 && (column.status === "new" || column.status === "sent") && (
                          <div className="pt-2 border-t">
                            <Badge variant="outline" className="text-xs">
                              ❌ {shipment.rejected_drivers_count} motorista{shipment.rejected_drivers_count > 1 ? 's' : ''} recusou{shipment.rejected_drivers_count > 1 ? 'ram' : ''}
                            </Badge>
                          </div>
                        )}

                        {shipment.hasPaymentProof === false && column.status === "confirmed" && (
                          <div className="pt-2 border-t">
                            <Badge variant="outline" className="text-xs border-warning text-warning">
                              <FileText className="h-3 w-3 mr-1" />
                              Sem comprovante de pagamento
                            </Badge>
                          </div>
                        )}

                        {shipment.actual_arrival && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-success font-medium">
                              ✓ Chegou: {shipment.actual_arrival}
                            </p>
                          </div>
                        )}

                        {shipment.startedAt && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-success font-medium">
                              🚛 Em rota desde {shipment.startedAt}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleViewDetails(shipment)}
                          >
                            <Maximize2 className="h-3 w-3 mr-1" />
                            Detalhes
                          </Button>
                        </div>

                        {column.status === "waiting_confirmation" && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              className="flex-1 bg-gradient-success hover:opacity-90"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmGMX(shipment);
                              }}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Confirmar GMX
                            </Button>
                            <Button variant="outline" size="sm" className="hover:bg-destructive/10">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {column.status === "confirmed" && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              className="flex-1 bg-gradient-primary hover:opacity-90"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartRide(shipment);
                              }}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              Iniciar Corrida
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleColumns.map((column) => {
            const paginatedShipments = getPaginatedShipments(column.shipments);
            const totalPages = getTotalPages(column.shipments);

            return (
              <Card key={column.status} className={column.color}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{column.title}</CardTitle>
                    <Badge className={column.badgeColor}>
                      {column.shipments.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ShipmentTableView
                    shipments={paginatedShipments}
                    status={column.status}
                    onViewDetails={handleViewDetails}
                    onDriverClick={handleDriverClick}
                  />

                  {totalPages > 1 && (
                    <div className="mt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
