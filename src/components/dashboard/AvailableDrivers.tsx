import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, MapPin, Clock, Truck, List, Grid } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { DriverProfileDialog } from "@/components/driver/DriverProfileDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const AvailableDrivers = () => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchAvailableDrivers();

    const channel = supabase
      .channel('available-drivers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers'
        },
        () => {
          fetchAvailableDrivers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchAvailableDrivers, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchAvailableDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("availability_status", "available")
        .eq("status", "active")
        .order("name", { ascending: true });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast({
        title: "Erro ao carregar motoristas",
        description: "Não foi possível carregar motoristas disponíveis.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const totalPages = Math.ceil(drivers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDrivers = drivers.slice(startIndex, endIndex);

  if (isLoading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Motoristas Disponíveis
          </h2>
          <p className="text-muted-foreground">
            {drivers.length} motoristas prontos para aceitar fretes
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4 mr-2" />
              Cards
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4 mr-2" />
              Tabela
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={(checked) => setAutoRefresh(checked as boolean)}
            />
            <label
              htmlFor="auto-refresh"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Auto-refresh
            </label>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAvailableDrivers}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {currentDrivers.map((driver) => (
            <Card
              key={driver.id}
              className="shadow-card transition-all hover:shadow-md border-success/20 cursor-pointer"
              onClick={() => {
                setSelectedDriver(driver);
                setIsProfileOpen(true);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm">{driver.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {driver.truck_plate || "N/A"}
                    </p>
                  </div>
                  <Badge className="bg-success text-success-foreground text-xs">
                    Disponível
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Truck className="h-3 w-3 text-muted-foreground" />
                  <span>{driver.vehicle_type || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span>{driver.city && driver.state ? `${driver.city}, ${driver.state}` : driver.current_location || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{driver.last_update ? new Date(driver.last_update).toLocaleString('pt-BR') : "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Tipo Veículo</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Disponível há</TableHead>
                <TableHead>Última Confirmação</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentDrivers.map((driver) => (
                <TableRow 
                  key={driver.id} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    setSelectedDriver(driver);
                    setIsProfileOpen(true);
                  }}
                >
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell>{driver.truck_plate || "N/A"}</TableCell>
                  <TableCell>{driver.vehicle_type || "N/A"}</TableCell>
                  <TableCell>{driver.city && driver.state ? `${driver.city}, ${driver.state}` : driver.current_location || "N/A"}</TableCell>
                  <TableCell>{driver.last_update ? new Date(driver.last_update).toLocaleString('pt-BR') : "N/A"}</TableCell>
                  <TableCell>{driver.last_update ? new Date(driver.last_update).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "N/A"}</TableCell>
                  <TableCell>
                    <Badge className="bg-success text-success-foreground">Disponível</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => setCurrentPage(pageNum)}
                  isActive={currentPage === pageNum}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <DriverProfileDialog
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        driverName={selectedDriver?.name || null}
        driverData={selectedDriver}
      />
    </div>
  );
};
