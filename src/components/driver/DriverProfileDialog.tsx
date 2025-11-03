import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Truck, Package, DollarSign, Calendar, FileText, Image as ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface DriverProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverName: string | null;
  driverData?: any;
}

export const DriverProfileDialog = ({ open, onOpenChange, driverName, driverData }: DriverProfileDialogProps) => {
  const [driverDocuments, setDriverDocuments] = useState<any[]>([]);
  const [allFields, setAllFields] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  
  useEffect(() => {
    if (open) {
      fetchAllFields();
      if (driverData?.id) {
        fetchDriverDocuments();
        fetchShipments();
      }
    }
  }, [open, driverData, selectedMonth]);

  const fetchAllFields = async () => {
    const { data } = await supabase
      .from("driver_field_config")
      .select("*")
      .order("display_order", { ascending: true });
    
    if (data) setAllFields(data);
  };

  const fetchDriverDocuments = async () => {
    if (!driverData?.id) return;
    
    const { data, error } = await supabase
      .from("driver_documents")
      .select("*")
      .eq("driver_id", driverData.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDriverDocuments(data);
    }
  };

  const fetchShipments = async () => {
    if (!driverData?.id) return;
    
    const monthStart = startOfMonth(new Date(selectedMonth));
    const monthEnd = endOfMonth(new Date(selectedMonth));
    
    const { data, error } = await supabase
      .from("embarques")
      .select("*")
      .eq("driver_id", driverData.id)
      .gte("pickup_date", monthStart.toISOString())
      .lte("pickup_date", monthEnd.toISOString())
      .order("pickup_date", { ascending: false });

    if (!error && data) {
      setShipments(data);
    }
  };
  
  // Mock data for fallback
  const mockData = {
    name: driverName || "",
    phone: "(11) 98765-4321",
    vehicle: "Scania R450 - Placa: ABC-1234",
    totalTrips: 47,
    totalValue: 425000,
    rating: 4.8,
    recentTrips: [
      {
        id: 1,
        date: "15/01/2025",
        origin: "São Paulo, SP",
        destination: "Rio de Janeiro, RJ",
        cargo: "Autopeças",
        value: 8500,
        status: "Concluído",
      },
      {
        id: 2,
        date: "10/01/2025",
        origin: "Campinas, SP",
        destination: "Belo Horizonte, MG",
        cargo: "Eletrônicos",
        value: 12000,
        status: "Concluído",
      },
      {
        id: 3,
        date: "05/01/2025",
        origin: "Santos, SP",
        destination: "Curitiba, PR",
        cargo: "Alimentos",
        value: 6500,
        status: "Concluído",
      },
    ],
  };

  const displayData = driverData || mockData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil do Motorista
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-4">
            {/* Informações Completas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Completas</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {allFields.length > 0 && driverData ? (
                  allFields.map((field) => {
                    const value = driverData[field.field_name];
                    if (!value && value !== 0 && value !== false) return null;
                    
                    return (
                      <div key={field.id} className="flex items-center justify-between border-b pb-2">
                        <span className="text-sm text-muted-foreground">{field.display_name}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Nome:</span>
                      <span className="font-medium">{displayData.name}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">CPF:</span>
                      <span className="font-medium">{displayData.cpf || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Telefone:</span>
                      <span className="font-medium">{displayData.phone}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <span className="font-medium">{displayData.email || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Tipo Veículo:</span>
                      <span className="font-medium">{displayData.vehicle_type || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Placa Cavalo:</span>
                      <span className="font-medium">{displayData.truck_plate || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Carreta 1:</span>
                      <span className="font-medium">{displayData.trailer_plate_1 || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Carreta 2:</span>
                      <span className="font-medium">{displayData.trailer_plate_2 || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Carreta 3:</span>
                      <span className="font-medium">{displayData.trailer_plate_3 || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Cidade:</span>
                      <span className="font-medium">{displayData.city || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Estado:</span>
                      <span className="font-medium">{displayData.state || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Localização Atual:</span>
                      <span className="font-medium">{displayData.current_location || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant={displayData.status === 'active' ? 'default' : 'secondary'}>
                        {displayData.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Disponibilidade:</span>
                      <Badge variant={displayData.availability_status === 'available' ? 'default' : 'secondary'}>
                        {displayData.availability_status === 'available' ? 'Disponível' : 
                         displayData.availability_status === 'busy' ? 'Em Viagem' : 
                         displayData.availability_status === 'waiting_advance' ? 'Aguardando Adiantamento' : 
                         'Esperando Descarregar'}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Estatísticas */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Viagens no Mês</p>
                      <p className="text-2xl font-bold">{shipments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-success/10">
                      <DollarSign className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total no Mês</p>
                      <p className="text-2xl font-bold">
                        R$ {shipments.reduce((sum, s) => sum + (s.driver_value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Histórico de Viagens */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Histórico de Cargas
                  </CardTitle>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => {
                        const date = new Date();
                        date.setMonth(date.getMonth() - i);
                        const value = format(date, "yyyy-MM");
                        const label = format(date, "MMMM yyyy");
                        return (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {shipments.length > 0 ? (
                  <div className="space-y-4">
                    {shipments.map((shipment: any) => (
                      <div
                        key={shipment.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{shipment.cargo_type || "Carga"}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              {shipment.pickup_date ? format(new Date(shipment.pickup_date), "dd/MM/yyyy") : "N/A"}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {shipment.status === 'new' ? 'Novo' :
                             shipment.status === 'in_progress' ? 'Em Andamento' :
                             shipment.status === 'delivered' ? 'Entregue' : shipment.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="text-muted-foreground">
                            {shipment.origin} → {shipment.destination}
                          </p>
                          <p className="font-semibold text-success">
                            R$ {(shipment.driver_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma viagem no mês selecionado
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Documentos e Fotos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {driverDocuments.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {driverDocuments.map((doc) => (
                      <div key={doc.id} className="space-y-2">
                        <div className="aspect-square relative overflow-hidden rounded-lg border bg-muted group cursor-pointer">
                          {doc.image_url ? (
                            <>
                              <img 
                                src={doc.image_url} 
                                alt={doc.document_type || "Documento"}
                                className="object-cover w-full h-full transition-transform group-hover:scale-105"
                                onClick={() => window.open(doc.image_url, '_blank')}
                              />
                              {doc.verified && (
                                <div className="absolute top-2 right-2 bg-success text-success-foreground text-xs px-2 py-1 rounded">
                                  ✓ Verificado
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-center text-muted-foreground truncate">
                          {doc.document_type || "Documento"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-muted rounded-lg text-center">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum documento ou foto disponível
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
