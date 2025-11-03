import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, List, Grid, Download, Settings as SettingsIcon, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDriverFields } from "@/hooks/useDriverFields";
import { DynamicFieldRenderer } from "@/components/driver/DynamicFieldRenderer";
import { DriverProfileDialog } from "@/components/driver/DriverProfileDialog";
import { DriverCrudDialog } from "@/components/driver/DriverCrudDialog";
import { FieldConfigManager } from "./FieldConfigManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const DynamicDriverRegistry = () => {
  const { toast } = useToast();
  const { cardFields, tableFields, isLoading: fieldsLoading } = useDriverFields();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchDrivers();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('drivers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers'
        },
        () => {
          fetchDrivers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast({
        title: "Erro ao carregar motoristas",
        description: "Não foi possível carregar a lista de motoristas.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDriver = (driver: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDriver(driver);
    setIsEditOpen(true);
  };

  const filteredDrivers = drivers.filter((driver) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return Object.values(driver).some(value =>
      value && String(value).toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentDrivers = filteredDrivers.slice(startIndex, startIndex + itemsPerPage);

  const exportToCSV = () => {
    if (filteredDrivers.length === 0) return;

    const headers = tableFields.map(f => f.display_name);
    const rows = filteredDrivers.map(driver =>
      tableFields.map(field => driver[field.field_name] || "")
    );

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `motoristas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || fieldsLoading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cadastro de Motoristas</h2>
          <p className="text-muted-foreground">{filteredDrivers.length} motoristas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)}>
            <User className="h-4 w-4 mr-2" />
            Adicionar Motorista
          </Button>
          <Button variant="outline" onClick={() => setIsConfigOpen(true)}>
            <SettingsIcon className="h-4 w-4 mr-2" />
            Configurar Campos
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={filteredDrivers.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buscar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar em todos os campos..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {currentDrivers.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum motorista encontrado
              </CardContent>
            </Card>
          ) : (
            currentDrivers.map((driver) => (
              <Card
                key={driver.id}
                className="shadow-card transition-all hover:shadow-md cursor-pointer"
                onClick={() => {
                  setSelectedDriver(driver);
                  setIsProfileOpen(true);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-sm">{driver.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cardFields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{field.display_name}:</span>
                      <span className="font-medium">
                        <DynamicFieldRenderer
                          fieldType={field.field_type}
                          value={driver[field.field_name]}
                          fieldName={field.field_name}
                        />
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                {tableFields.map((field) => (
                  <TableHead key={field.id}>{field.display_name}</TableHead>
                ))}
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableFields.length} className="text-center py-8 text-muted-foreground">
                    Nenhum motorista encontrado
                  </TableCell>
                </TableRow>
              ) : (
                currentDrivers.map((driver) => (
                  <TableRow
                    key={driver.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setSelectedDriver(driver);
                      setIsProfileOpen(true);
                    }}
                  >
                    {tableFields.map((field) => (
                      <TableCell key={field.id}>
                        <DynamicFieldRenderer
                          fieldType={field.field_type}
                          value={driver[field.field_name]}
                          fieldName={field.field_name}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleEditDriver(driver, e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pageNum) => (
            <PaginationItem key={pageNum}>
              <PaginationLink
                onClick={() => setCurrentPage(pageNum)}
                isActive={currentPage === pageNum}
                className="cursor-pointer"
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          ))}
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

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuração de Campos</DialogTitle>
          </DialogHeader>
          <FieldConfigManager />
        </DialogContent>
      </Dialog>

      <DriverCrudDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          fetchDrivers();
          setIsCreateOpen(false);
        }}
      />

      <DriverCrudDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        driver={editingDriver}
        onSuccess={() => {
          fetchDrivers();
          setIsEditOpen(false);
          setEditingDriver(null);
        }}
      />
    </div>
  );
};
