
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { User, Truck, FileText, ScrollText, Image as ImageIcon } from "lucide-react";
import { directus } from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Save, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface DriverProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverName: string | null;
  driverData?: any;
  initialEditMode?: boolean;
  onUpdate?: (newDriver?: any) => void;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch (e) {
    return dateStr;
  }
};

const FieldRow = ({ label, value }: { label: string; value: any }) => (
  <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
    <span className="text-sm text-muted-foreground">{label}:</span>
    <span className="font-medium text-sm text-right">{value || "-"}</span>
  </div>
);

export const DriverProfileDialog = ({ open, onOpenChange, driverName, driverData, initialEditMode = false, onUpdate }: DriverProfileDialogProps) => {
  const [data, setData] = useState({
    cnh: null as any,
    antt: null as any,
    crlv: null as any,
    comprovante_endereco: null as any,
    fotos: null as any,
    carretas: [] as any[],
    disponivel: null as any, // New state for availability data
  });
  /* Carreta State */
  const [isEditingCarreta, setIsEditingCarreta] = useState(false);
  const [currentCarretaIndex, setCurrentCarretaIndex] = useState<number | null>(null);
  const [carretaForm, setCarretaForm] = useState<any>({});

  const [localDriverData, setLocalDriverData] = useState<any>(driverData);

  const [loading, setLoading] = useState(false);
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [infoFormData, setInfoFormData] = useState<any>({});

  // Document Edit States
  const [isEditingCNH, setIsEditingCNH] = useState(false);
  const [cnhForm, setCnhForm] = useState<any>({});

  const [isEditingCRLV, setIsEditingCRLV] = useState(false);
  const [crlvForm, setCrlvForm] = useState<any>({});

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<any>({});

  const [isEditingANTT, setIsEditingANTT] = useState(false);
  const [anttForm, setAnttForm] = useState<any>({});

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  useEffect(() => {
    setLocalDriverData(driverData);
  }, [driverData]);

  useEffect(() => {
    if (open) {
      if (driverData?.id) {
        // Mode: Edit existing
        setLocalDriverData(driverData);
        if (initialEditMode) {
          handleEditInfo();
        }
        fetchRelatedData();
      } else {
        // Mode: Create new
        setLocalDriverData(null);
        setEditFormData({});
        setData({
          cnh: null, antt: null, crlv: null, comprovante_endereco: null,
          fotos: null, carretas: [], disponivel: null
        });
        setInfoFormData({});
        setIsEditingInfo(true); // Force edit mode for info
        setLoading(false);
      }
    }
  }, [open, driverData, initialEditMode]);

  const fetchRelatedData = async () => {
    setLoading(true);
    try {
      // Parallel requests for better performance
      const [cnhParams, anttParams, crlvParams, compParams, fotosParams, c1Params, c2Params, c3Params, dispParams] = await Promise.all([
        directus.request(readItems('cnh', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('antt', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('crlv', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('comprovante_endereco', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('fotos', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('carreta_1', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('carreta_2', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('carreta_3', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('disponivel', {
          filter: { motorista_id: { _eq: driverData.id } },
          sort: ['-date_created'], // Get latest availability status
          limit: 1,
          fields: ['*', 'user_created.*'] // Expand creator user
        })),
      ]);

      setData({
        cnh: cnhParams[0] || null,
        antt: anttParams[0] || null,
        crlv: crlvParams[0] || null,
        comprovante_endereco: compParams[0] || null,
        fotos: fotosParams[0] || null,
        carretas: [
          { type: 'Carreta 1', collection: 'carreta_1', data: c1Params[0] || null },
          { type: 'Carreta 2', collection: 'carreta_2', data: c2Params[0] || null },
          { type: 'Carreta 3', collection: 'carreta_3', data: c3Params[0] || null },
        ],
        disponivel: dispParams[0] || null,
      });

    } catch (error) {
      console.error("Error fetching related data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAvailability = () => {
    if (data.disponivel) {
      setEditFormData({
        status: data.disponivel.status,
        localizacao_atual: data.disponivel.localizacao_atual || data.disponivel.local_disponibilidade, // Fallback
        destino_preferencia: data.disponivel.destino_preferencia,
        data_liberacao: data.disponivel.data_liberacao ? new Date(data.disponivel.data_liberacao).toISOString().split('T')[0] : '', // Simple date formatting
        observacao: data.disponivel.observacao
      });
      setIsEditingAvailability(true);
    }
  };

  const handleSaveAvailability = async () => {
    if (!data.disponivel?.id) return;

    try {
      setLoading(true);
      await directus.request(updateItem('disponivel', data.disponivel.id, {
        status: editFormData.status,
        localizacao_atual: editFormData.localizacao_atual, // Try saving to both if unsure, or just the one that works
        local_disponibilidade: editFormData.localizacao_atual, // Copy value to potential new field name
        destino_preferencia: editFormData.destino_preferencia,
        data_liberacao: editFormData.data_liberacao,
        observacao: editFormData.observacao
      }));

      setIsEditingAvailability(false);
      await fetchRelatedData(); // Refresh data
      toast({ title: "Disponibilidade atualizada com sucesso" });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating availability:", error);
      toast({ variant: "destructive", title: "Erro ao atualizar disponibilidade", description: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingAvailability(false);
    setEditFormData({});
  };

  const handleEditInfo = () => {
    // If creating new, localDriverData might be null
    const sourceData = localDriverData || {};
    setInfoFormData({
      nome: sourceData.nome || '',
      sobrenome: sourceData.sobrenome || '',
      telefone: sourceData.telefone || '',
      forma_pagamento: sourceData.forma_pagamento || '',
      cpf: sourceData.cpf || '',
      cidade: sourceData.cidade || '',
      estado: sourceData.estado || '',
    });
    setIsEditingInfo(true);
  };

  const handleSaveInfo = async () => {
    try {
      setLoading(true);

      let createdDriver = null;

      if (localDriverData?.id) {
        // Update existing
        await directus.request(updateItem('cadastro_motorista', localDriverData.id, {
          nome: infoFormData.nome,
          sobrenome: infoFormData.sobrenome,
          telefone: infoFormData.telefone,
          forma_pagamento: infoFormData.forma_pagamento,
          cpf: infoFormData.cpf,
          cidade: infoFormData.cidade,
          estado: infoFormData.estado,
        }));

        setLocalDriverData((prev: any) => ({
          ...prev,
          ...infoFormData,
          date_updated: new Date().toISOString()
        }));
        toast({ title: "Informações atualizadas com sucesso" });
      } else {
        // Create new
        const newDriver = await directus.request(createItem('cadastro_motorista', {
          nome: infoFormData.nome,
          sobrenome: infoFormData.sobrenome,
          telefone: infoFormData.telefone,
          forma_pagamento: infoFormData.forma_pagamento,
          cpf: infoFormData.cpf,
          cidade: infoFormData.cidade,
          estado: infoFormData.estado,
          status: 'draft' // Optional: set initial status
        }));

        setLocalDriverData(newDriver);
        createdDriver = newDriver;
        toast({ title: "Motorista criado com sucesso!", description: "As abas de Documentos e Veículos foram liberadas. Continue o cadastro." });
      }

      setIsEditingInfo(false);
      if (onUpdate) onUpdate(createdDriver || undefined);
    } catch (error) {
      console.error("Error saving info:", error);
      toast({ variant: "destructive", title: "Erro ao salvar informações", description: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEditInfo = () => {
    setIsEditingInfo(false);
    setInfoFormData({});
  };

  // --- CNH Handlers ---
  const handleEditCNH = () => {
    setCnhForm(data.cnh ? { ...data.cnh } : {});
    setIsEditingCNH(true);
  };

  const handleSaveCNH = async () => {
    try {
      setLoading(true);
      if (data.cnh?.id) {
        await directus.request(updateItem('cnh', data.cnh.id, cnhForm));
        toast({ title: "CNH atualizada com sucesso" });
      } else {
        await directus.request(createItem('cnh', { ...cnhForm, motorista_id: driverData.id }));
        toast({ title: "CNH criada com sucesso" });
      }
      setIsEditingCNH(false);
      await fetchRelatedData();
    } catch (error) {
      console.error("Error saving CNH:", error);
      toast({ variant: "destructive", title: "Erro ao salvar CNH", description: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCNH = () => {
    setIsEditingCNH(false);
    setCnhForm({});
  };

  // --- CRLV Handlers ---
  const handleEditCRLV = () => {
    setCrlvForm(data.crlv ? { ...data.crlv } : {});
    setIsEditingCRLV(true);
  };

  const handleSaveCRLV = async () => {
    try {
      setLoading(true);
      if (data.crlv?.id) {
        await directus.request(updateItem('crlv', data.crlv.id, crlvForm));
        toast({ title: "CRLV atualizado com sucesso" });
      } else {
        await directus.request(createItem('crlv', { ...crlvForm, motorista_id: driverData.id }));
        toast({ title: "CRLV criada com sucesso" });
      }
      setIsEditingCRLV(false);
      await fetchRelatedData();
    } catch (error) {
      console.error("Error saving CRLV:", error);
      toast({ variant: "destructive", title: "Erro ao salvar CRLV", description: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCRLV = () => {
    setIsEditingCRLV(false);
    setCrlvForm({});
  };

  // --- Carreta Handlers ---
  const handleEditCarreta = (index: number, carretaData: any) => {
    setCurrentCarretaIndex(index);
    setCarretaForm(carretaData ? { ...carretaData } : {});
    setIsEditingCarreta(true);
  };

  const handleSaveCarreta = async () => {
    if (currentCarretaIndex === null) return;

    const currentCarreta = data.carretas[currentCarretaIndex];
    if (!currentCarreta) return;

    try {
      setLoading(true);
      if (currentCarreta.data?.id) {
        await directus.request(updateItem(currentCarreta.collection, currentCarreta.data.id, carretaForm));
        toast({ title: `${currentCarreta.type} atualizada com sucesso` });
      } else {
        await directus.request(createItem(currentCarreta.collection, { ...carretaForm, motorista_id: driverData.id }));
        toast({ title: `${currentCarreta.type} criada com sucesso` });
      }
      setIsEditingCarreta(false);
      setCurrentCarretaIndex(null);
      await fetchRelatedData();
    } catch (error) {
      console.error(`Error saving ${currentCarreta.type}:`, error);
      toast({ variant: "destructive", title: `Erro ao salvar ${currentCarreta.type}`, description: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCarreta = () => {
    setIsEditingCarreta(false);
    setCurrentCarretaIndex(null);
    setCarretaForm({});
  };

  // --- Address Handlers ---
  const handleEditAddress = () => {
    setAddressForm(data.comprovante_endereco ? { ...data.comprovante_endereco } : {});
    setIsEditingAddress(true);
  };

  const handleSaveAddress = async () => {
    try {
      setLoading(true);
      if (data.comprovante_endereco?.id) {
        await directus.request(updateItem('comprovante_endereco', data.comprovante_endereco.id, addressForm));
        toast({ title: "Endereço atualizado com sucesso" });
      } else {
        await directus.request(createItem('comprovante_endereco', { ...addressForm, motorista_id: driverData.id }));
        toast({ title: "Endereço criado com sucesso" });
      }
      setIsEditingAddress(false);
      await fetchRelatedData();
    } catch (error) {
      console.error("Error saving Address:", error);
      toast({ variant: "destructive", title: "Erro ao salvar endereço", description: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAddress = () => {
    setIsEditingAddress(false);
    setAddressForm({});
  };

  // --- ANTT Handlers ---
  const handleEditANTT = () => {
    setAnttForm(data.antt ? { ...data.antt } : {});
    setIsEditingANTT(true);
  };

  const handleSaveANTT = async () => {
    try {
      setLoading(true);
      if (data.antt?.id) {
        await directus.request(updateItem('antt', data.antt.id, anttForm));
        toast({ title: "ANTT atualizada com sucesso" });
      } else {
        await directus.request(createItem('antt', { ...anttForm, motorista_id: driverData.id }));
        toast({ title: "ANTT criada com sucesso" });
      }
      setIsEditingANTT(false);
      await fetchRelatedData();
    } catch (error) {
      console.error("Error saving ANTT:", error);
      toast({ variant: "destructive", title: "Erro ao salvar ANTT", description: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelANTT = () => {
    setIsEditingANTT(false);
    setAnttForm({});
  };

  // if (!localDriverData) return null; // Removed to allow creation mode

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-6 w-6" />
              {localDriverData?.id ? `Profile: ${driverName || localDriverData.nome}` : 'Novo Motorista'}
              {localDriverData?.status && (
                <Badge variant={localDriverData.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                  {localDriverData.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando informações completas...</div>
          ) : (
            <Tabs defaultValue="geral" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="disponibilidade" disabled={!localDriverData?.id}>Disponibilidade</TabsTrigger>
                <TabsTrigger value="docs" disabled={!localDriverData?.id}>Documentos</TabsTrigger>
                <TabsTrigger value="veiculos" disabled={!localDriverData?.id}>Veículos</TabsTrigger>
                <TabsTrigger value="fotos" disabled={!localDriverData?.id}>Fotos</TabsTrigger>
              </TabsList>

              {!localDriverData?.id && (
                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md my-4 text-sm border border-yellow-200">
                  Salve as informações básicas para liberar o cadastro de documentos e veículos.
                </div>
              )}
              <TabsContent value="geral" className="space-y-4 mt-4">
                {/* Info Content ... (omitted for brevity in replacement, but keeping structure valid) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 justify-between">
                      Informações Básicas
                      {!isEditingInfo && (
                        <Button variant="ghost" size="sm" onClick={handleEditInfo}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      )}
                      {isEditingInfo && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancelEditInfo}>
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={handleSaveInfo}>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    {isEditingInfo ? (
                      <>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Nome</span>
                          <Input
                            value={infoFormData.nome || ''}
                            onChange={(e) => setInfoFormData({ ...infoFormData, nome: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Sobrenome</span>
                          <Input
                            value={infoFormData.sobrenome || ''}
                            onChange={(e) => setInfoFormData({ ...infoFormData, sobrenome: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Telefone</span>
                          <Input
                            value={infoFormData.telefone || ''}
                            onChange={(e) => setInfoFormData({ ...infoFormData, telefone: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Forma de Pagamento</span>
                          <Input
                            value={infoFormData.forma_pagamento || ''}
                            onChange={(e) => setInfoFormData({ ...infoFormData, forma_pagamento: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">CPF</span>
                          <Input
                            value={infoFormData.cpf || ''}
                            onChange={(e) => setInfoFormData({ ...infoFormData, cpf: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Cidade</span>
                          <Input
                            value={infoFormData.cidade || ''}
                            onChange={(e) => setInfoFormData({ ...infoFormData, cidade: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Estado</span>
                          <Input
                            value={infoFormData.estado || ''}
                            onChange={(e) => setInfoFormData({ ...infoFormData, estado: e.target.value })}
                          />
                        </div>

                        {localDriverData?.id && (
                          <div className="md:col-span-2 grid gap-4 md:grid-cols-2 opacity-60">
                            <FieldRow label="Status" value={localDriverData.status} />
                            <FieldRow label="Cadastrado em" value={formatDate(localDriverData.date_created)} />
                          </div>
                        )}
                      </>
                    ) : (
                      localDriverData && (
                        <>
                          <FieldRow label="Nome Completo" value={`${localDriverData.nome || ''} ${localDriverData.sobrenome || ''}`} />
                          <FieldRow label="CPF" value={localDriverData.cpf} />
                          <FieldRow label="Telefone" value={localDriverData.telefone} />
                          <FieldRow label="Forma de Pagamento" value={localDriverData.forma_pagamento} />
                          <FieldRow label="Cidade" value={localDriverData.cidade} />
                          <FieldRow label="Estado" value={localDriverData.estado} />
                          <FieldRow label="Status" value={localDriverData.status} />
                          <FieldRow label="Cadastrado em" value={formatDate(localDriverData.date_created)} />
                        </>
                      )
                    )}
                  </CardContent>

                </Card>

                {/* Dados da Disponibilidade (New Section) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-blue-600" />
                        Dados da Disponibilidade (Logística)
                      </div>
                      {data.disponivel && !isEditingAvailability && (
                        <Button variant="ghost" size="sm" onClick={handleEditAvailability}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      )}
                      {isEditingAvailability && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={handleSaveAvailability}>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    {data.disponivel ? (

                      isEditingAvailability ? (
                        <>
                          <div className="flex flex-col space-y-1.5">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Select
                              value={editFormData.status}
                              onValueChange={(val) => setEditFormData({ ...editFormData, status: val })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="disponivel">Disponível</SelectItem>
                                <SelectItem value="indisponivel">Indisponível</SelectItem>
                                <SelectItem value="em_viagem">Em Viagem</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex flex-col space-y-1.5">
                            <span className="text-sm text-muted-foreground">Localização Atual</span>
                            <Input
                              value={editFormData.localizacao_atual || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, localizacao_atual: e.target.value })}
                            />
                          </div>

                          <div className="flex flex-col space-y-1.5">
                            <span className="text-sm text-muted-foreground">Destino Preferência</span>
                            <Input
                              value={editFormData.destino_preferencia || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, destino_preferencia: e.target.value })}
                            />
                          </div>

                          <div className="flex flex-col space-y-1.5">
                            <span className="text-sm text-muted-foreground">Previsão Liberação</span>
                            <Input
                              type="date"
                              value={editFormData.data_liberacao || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, data_liberacao: e.target.value })}
                            />
                          </div>

                          <div className="col-span-2 flex flex-col space-y-1.5">
                            <span className="text-sm text-muted-foreground">Observação</span>
                            <Textarea
                              value={editFormData.observacao || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, observacao: e.target.value })}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <FieldRow label="Status Logístico" value={
                            <Badge variant={
                              data.disponivel.status === 'disponivel' ? 'default' :
                                data.disponivel.status === 'indisponivel' ? 'destructive' : 'secondary'
                            }>
                              {data.disponivel.status?.toUpperCase() || "N/A"}
                            </Badge>
                          } />
                          <FieldRow label="Localização Atual" value={data.disponivel.localizacao_atual || data.disponivel.local_disponibilidade} />
                          <FieldRow label="Destino Preferência" value={data.disponivel.destino_preferencia} />
                          <FieldRow label="Previsão Liberação"
                            value={data.disponivel.data_liberacao ?
                              format(new Date(data.disponivel.data_liberacao), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : "-"}
                          />
                          <FieldRow label="Data Contato"
                            value={data.disponivel.date_created ?
                              format(new Date(data.disponivel.date_created), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : "-"}
                          />
                          <FieldRow label="Nome do Operador" value={
                            data.disponivel.user_created ?
                              `${data.disponivel.user_created.first_name || ''} ${data.disponivel.user_created.last_name || ''}`
                              : "Sistema"
                          } />
                          <div className="col-span-2">
                            <FieldRow label="Observação" value={data.disponivel.observacao} />
                          </div>
                          <div className="grid grid-cols-2 gap-4 col-span-2">
                            <FieldRow label="Latitude" value={data.disponivel.latitude} />
                            <FieldRow label="Longitude" value={data.disponivel.longitude} />
                          </div>
                          <div className="col-span-2 mt-2">
                            <p className="text-xs text-muted-foreground">Última atualização: {formatDate(data.disponivel.date_created)}</p>
                          </div>
                        </>
                      )
                    ) : (
                      <div className="col-span-2 text-center text-muted-foreground py-4">Este motorista não tem registro na tabela de disponibilidade.</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="docs" className="space-y-4 mt-4">
                {/* CNH */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        CNH (Carteira Nacional de Habilitação)
                      </div>
                      {!isEditingCNH && (
                        <Button variant="ghost" size="sm" onClick={handleEditCNH}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {data.cnh ? 'Editar' : 'Adicionar'}
                        </Button>
                      )}
                      {isEditingCNH && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancelCNH}>
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={handleSaveCNH}>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    {isEditingCNH ? (
                      <>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">CPF</span>
                          <Input value={cnhForm.cpf || ''} onChange={(e) => setCnhForm({ ...cnhForm, cpf: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Data Nasc</span>
                          <Input type="date" value={cnhForm.data_nasc ? new Date(cnhForm.data_nasc).toISOString().split('T')[0] : ''} onChange={(e) => setCnhForm({ ...cnhForm, data_nasc: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Nome Mãe</span>
                          <Input value={cnhForm.nome_mae || ''} onChange={(e) => setCnhForm({ ...cnhForm, nome_mae: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Nº Registro CNH</span>
                          <Input value={cnhForm.n_registro_cnh || ''} onChange={(e) => setCnhForm({ ...cnhForm, n_registro_cnh: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Nº Formulário CNH</span>
                          <Input value={cnhForm.n_formulario_cnh || ''} onChange={(e) => setCnhForm({ ...cnhForm, n_formulario_cnh: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Validade</span>
                          <Input type="date" value={cnhForm.validade ? new Date(cnhForm.validade).toISOString().split('T')[0] : ''} onChange={(e) => setCnhForm({ ...cnhForm, validade: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Emissão CNH</span>
                          <Input type="date" value={cnhForm.emissao_cnh ? new Date(cnhForm.emissao_cnh).toISOString().split('T')[0] : ''} onChange={(e) => setCnhForm({ ...cnhForm, emissao_cnh: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Nº CNH Segurança</span>
                          <Input value={cnhForm.n_cnh_seguranca || ''} onChange={(e) => setCnhForm({ ...cnhForm, n_cnh_seguranca: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Nº CNH Renach</span>
                          <Input value={cnhForm.n_cnh_renach || ''} onChange={(e) => setCnhForm({ ...cnhForm, n_cnh_renach: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">1ª Habilitação</span>
                          <Input type="date" value={cnhForm.primeira_habilitacao ? new Date(cnhForm.primeira_habilitacao).toISOString().split('T')[0] : ''} onChange={(e) => setCnhForm({ ...cnhForm, primeira_habilitacao: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Categoria</span>
                          <Input value={cnhForm.categoria || ''} onChange={(e) => setCnhForm({ ...cnhForm, categoria: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Cidade Emissão</span>
                          <Input value={cnhForm.cidade_emissao || ''} onChange={(e) => setCnhForm({ ...cnhForm, cidade_emissao: e.target.value })} />
                        </div>
                      </>
                    ) : (data.cnh ? (
                      <>
                        <FieldRow label="CPF" value={data.cnh.cpf} />
                        <FieldRow label="Data Nasc" value={formatDate(data.cnh.data_nasc)} />
                        <FieldRow label="Nome Mãe" value={data.cnh.nome_mae} />
                        <FieldRow label="Nº Registro CNH" value={data.cnh.n_registro_cnh} />
                        <FieldRow label="Nº Formulário CNH" value={data.cnh.n_formulario_cnh} />
                        <FieldRow label="Validade" value={formatDate(data.cnh.validade)} />
                        <FieldRow label="Emissão CNH" value={formatDate(data.cnh.emissao_cnh)} />
                        <FieldRow label="Nº CNH Segurança" value={data.cnh.n_cnh_seguranca} />
                        <FieldRow label="Nº CNH Renach" value={data.cnh.n_cnh_renach} />
                        <FieldRow label="1ª Habilitação" value={formatDate(data.cnh.primeira_habilitacao)} />
                        <FieldRow label="Categoria" value={data.cnh.categoria} />
                        <FieldRow label="Cidade Emissão" value={data.cnh.cidade_emissao} />
                        {data.cnh.link && (
                          <div className="col-span-2 mt-2">
                            <Button
                              variant="link"
                              className="p-0 h-auto text-blue-600 hover:underline"
                              onClick={() => setDocumentUrl(data.cnh.link)}
                            >
                              Ver Documento Original
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="col-span-2 text-center text-muted-foreground py-4">Nenhuma CNH cadastrada</div>
                    )
                    )}
                  </CardContent>
                </Card>

                {/* CRLV */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        CRLV (Certificado de Registro e Licenciamento de Veículo)
                      </div>
                      {!isEditingCRLV && (
                        <Button variant="ghost" size="sm" onClick={handleEditCRLV}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {data.crlv ? 'Editar' : 'Adicionar'}
                        </Button>
                      )}
                      {isEditingCRLV && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancelCRLV}>
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={handleSaveCRLV}>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    {isEditingCRLV ? (
                      <>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Placa Cavalo</span>
                          <Input value={crlvForm.placa_cavalo || ''} onChange={(e) => setCrlvForm({ ...crlvForm, placa_cavalo: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Renavam</span>
                          <Input value={crlvForm.renavam || ''} onChange={(e) => setCrlvForm({ ...crlvForm, renavam: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Nome Proprietário</span>
                          <Input value={crlvForm.nome_proprietario || ''} onChange={(e) => setCrlvForm({ ...crlvForm, nome_proprietario: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">CPF/CNPJ Prop.</span>
                          <Input value={crlvForm.cnpj_cpf || ''} onChange={(e) => setCrlvForm({ ...crlvForm, cnpj_cpf: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Modelo</span>
                          <Input value={crlvForm.modelo || ''} onChange={(e) => setCrlvForm({ ...crlvForm, modelo: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Cor</span>
                          <Input value={crlvForm.cor || ''} onChange={(e) => setCrlvForm({ ...crlvForm, cor: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Ano Fabricação</span>
                          <Input value={crlvForm.ano_fabricacao || ''} onChange={(e) => setCrlvForm({ ...crlvForm, ano_fabricacao: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Ano Modelo</span>
                          <Input value={crlvForm.ano_modelo || ''} onChange={(e) => setCrlvForm({ ...crlvForm, ano_modelo: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Chassi</span>
                          <Input value={crlvForm.chassi || ''} onChange={(e) => setCrlvForm({ ...crlvForm, chassi: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Nr. Certificado</span>
                          <Input value={crlvForm.nr_certificado || ''} onChange={(e) => setCrlvForm({ ...crlvForm, nr_certificado: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Exercício Doc</span>
                          <Input value={crlvForm.exercicio_doc || ''} onChange={(e) => setCrlvForm({ ...crlvForm, exercicio_doc: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Cidade Emplacado</span>
                          <Input value={crlvForm.cidade_emplacado || ''} onChange={(e) => setCrlvForm({ ...crlvForm, cidade_emplacado: e.target.value })} />
                        </div>
                      </>
                    ) : (data.crlv ? (
                      <>
                        <FieldRow label="Placa Cavalo" value={data.crlv.placa_cavalo} />
                        <FieldRow label="Renavam" value={data.crlv.renavam} />
                        <FieldRow label="Nome Proprietário" value={data.crlv.nome_proprietario} />
                        <FieldRow label="CPF/CNPJ Prop." value={data.crlv.cnpj_cpf} />
                        <FieldRow label="Modelo" value={data.crlv.modelo} />
                        <FieldRow label="Cor" value={data.crlv.cor} />
                        <FieldRow label="Ano Fabricação" value={data.crlv.ano_fabricacao} />
                        <FieldRow label="Ano Modelo" value={data.crlv.ano_modelo} />
                        <FieldRow label="Chassi" value={data.crlv.chassi} />
                        <FieldRow label="Nr. Certificado" value={data.crlv.nr_certificado} />
                        <FieldRow label="Exercício Doc" value={data.crlv.exercicio_doc} />
                        <FieldRow label="Cidade Emplacado" value={data.crlv.cidade_emplacado} />
                        {data.crlv.link && (
                          <div className="col-span-2 mt-2">
                            <Button
                              variant="link"
                              className="p-0 h-auto text-blue-600 hover:underline"
                              onClick={() => setDocumentUrl(data.crlv.link)}
                            >
                              Ver Documento Original
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="col-span-2 text-center text-muted-foreground py-4">Nenhum CRLV cadastrado</div>
                    )
                    )}
                  </CardContent>
                </Card>

                {/* Comprovante de Endereço */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Comprovante de Endereço
                      </div>
                      {!isEditingAddress && (
                        <Button variant="ghost" size="sm" onClick={handleEditAddress}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {data.comprovante_endereco ? 'Editar' : 'Adicionar'}
                        </Button>
                      )}
                      {isEditingAddress && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancelAddress}>
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={handleSaveAddress}>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    {isEditingAddress ? (
                      <>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">CEP</span>
                          <Input value={addressForm.cep || ''} onChange={(e) => setAddressForm({ ...addressForm, cep: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Endereço</span>
                          <Input value={addressForm.endereco || ''} onChange={(e) => setAddressForm({ ...addressForm, endereco: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Número</span>
                          <Input value={addressForm.numero || ''} onChange={(e) => setAddressForm({ ...addressForm, numero: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Complemento</span>
                          <Input value={addressForm.complemento || ''} onChange={(e) => setAddressForm({ ...addressForm, complemento: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Bairro</span>
                          <Input value={addressForm.bairro || ''} onChange={(e) => setAddressForm({ ...addressForm, bairro: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Cidade</span>
                          <Input value={addressForm.cidade || ''} onChange={(e) => setAddressForm({ ...addressForm, cidade: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Estado</span>
                          <Input value={addressForm.estado || ''} onChange={(e) => setAddressForm({ ...addressForm, estado: e.target.value })} />
                        </div>
                      </>
                    ) : (data.comprovante_endereco ? (
                      <>
                        <FieldRow label="CEP" value={data.comprovante_endereco.cep} />
                        <FieldRow label="Endereço" value={data.comprovante_endereco.endereco} />
                        <FieldRow label="Número" value={data.comprovante_endereco.numero} />
                        <FieldRow label="Complemento" value={data.comprovante_endereco.complemento} />
                        <FieldRow label="Bairro" value={data.comprovante_endereco.bairro} />
                        <FieldRow label="Cidade" value={data.comprovante_endereco.cidade} />
                        <FieldRow label="Estado" value={data.comprovante_endereco.estado} />
                        {data.comprovante_endereco.link && (
                          <div className="col-span-2 mt-2">
                            <Button
                              variant="link"
                              className="p-0 h-auto text-blue-600 hover:underline"
                              onClick={() => setDocumentUrl(data.comprovante_endereco.link)}
                            >
                              Ver Documento Original
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="col-span-2 text-center text-muted-foreground py-4">Nenhum comprovante de endereço cadastrado</div>
                    )
                    )}
                  </CardContent>
                </Card>

                {/* Registro ANTT */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <ScrollText className="h-5 w-5" />
                        Registro ANTT
                      </div>
                      {!isEditingANTT && (
                        <Button variant="ghost" size="sm" onClick={handleEditANTT}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {data.antt ? 'Editar' : 'Adicionar'}
                        </Button>
                      )}
                      {isEditingANTT && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancelANTT}>
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={handleSaveANTT}>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {isEditingANTT ? (
                      <>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Número ANTT</span>
                          <Input value={anttForm.numero_antt || ''} onChange={(e) => setAnttForm({ ...anttForm, numero_antt: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">CPF/CNPJ</span>
                          <Input value={anttForm.cnpj_cpf || ''} onChange={(e) => setAnttForm({ ...anttForm, cnpj_cpf: e.target.value })} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Nome</span>
                          <Input value={anttForm.nome || ''} onChange={(e) => setAnttForm({ ...anttForm, nome: e.target.value })} />
                        </div>
                      </>
                    ) : (data.antt ? (
                      <>
                        <FieldRow label="Número ANTT" value={data.antt.numero_antt} />
                        <FieldRow label="CPF/CNPJ" value={data.antt.cnpj_cpf} />
                        {data.antt.nome && <FieldRow label="Nome" value={data.antt.nome} />}
                        {data.antt.link && (
                          <div className="col-span-2 mt-2">
                            <Button
                              variant="link"
                              className="p-0 h-auto text-blue-600 hover:underline"
                              onClick={() => setDocumentUrl(data.antt.link)}
                            >
                              Ver Documento Original
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground py-4">Nenhum registro ANTT principal encontrado</div>
                    )
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="veiculos" className="space-y-4 mt-4">
                {data.carretas.map((carreta: any, index: number) => {
                  const isEditingThis = isEditingCarreta && currentCarretaIndex === index;

                  return (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base justify-between">
                          <div className="flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            {carreta.type}
                            {(!isEditingThis && carreta.data?.placa) && <Badge variant="outline" className="ml-2">{carreta.data.placa}</Badge>}
                          </div>
                          {!isEditingThis && (
                            <Button variant="ghost" size="sm" onClick={() => handleEditCarreta(index, carreta.data)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {carreta.data ? 'Editar' : 'Adicionar'}
                            </Button>
                          )}
                          {isEditingThis && (
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={handleCancelCarreta}>
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                              </Button>
                              <Button size="sm" onClick={handleSaveCarreta}>
                                <Save className="h-4 w-4 mr-2" />
                                Salvar
                              </Button>
                            </div>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {isEditingThis ? (
                          <>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">Placa</span>
                              <Input value={carretaForm.placa || ''} onChange={(e) => setCarretaForm({ ...carretaForm, placa: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">CAP</span>
                              <Input value={carretaForm.cap || ''} onChange={(e) => setCarretaForm({ ...carretaForm, cap: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">CNPJ/CPF Prop.</span>
                              <Input value={carretaForm.cnpj_cpf_proprietario || ''} onChange={(e) => setCarretaForm({ ...carretaForm, cnpj_cpf_proprietario: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">Proprietário Doc.</span>
                              <Input value={carretaForm.proprietario_documento || ''} onChange={(e) => setCarretaForm({ ...carretaForm, proprietario_documento: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">CEP</span>
                              <Input value={carretaForm.cep || ''} onChange={(e) => setCarretaForm({ ...carretaForm, cep: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">Renavam</span>
                              <Input value={carretaForm.renavam || ''} onChange={(e) => setCarretaForm({ ...carretaForm, renavam: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">Modelo</span>
                              <Input value={carretaForm.modelo || ''} onChange={(e) => setCarretaForm({ ...carretaForm, modelo: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">Ano Fab.</span>
                              <Input value={carretaForm.ano_fabricacao || ''} onChange={(e) => setCarretaForm({ ...carretaForm, ano_fabricacao: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">Ano Modelo</span>
                              <Input value={carretaForm.ano_modelo || ''} onChange={(e) => setCarretaForm({ ...carretaForm, ano_modelo: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">Nr Cert. Doc</span>
                              <Input value={carretaForm.nr_certificado_doc || ''} onChange={(e) => setCarretaForm({ ...carretaForm, nr_certificado_doc: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">Exercício Doc</span>
                              <Input value={carretaForm.exercicio_doc || ''} onChange={(e) => setCarretaForm({ ...carretaForm, exercicio_doc: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">Cor</span>
                              <Input value={carretaForm.cor || ''} onChange={(e) => setCarretaForm({ ...carretaForm, cor: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">Chassi</span>
                              <Input value={carretaForm.chassi || ''} onChange={(e) => setCarretaForm({ ...carretaForm, chassi: e.target.value })} />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <span className="text-sm text-muted-foreground">Cidade Emplacado</span>
                              <Input value={carretaForm.cidade_emplacado || ''} onChange={(e) => setCarretaForm({ ...carretaForm, cidade_emplacado: e.target.value })} />
                            </div>
                            <div className="col-span-full border-t pt-2 mt-2">
                              <h4 className="text-sm font-semibold mb-2">Dados ANTT (Carreta)</h4>
                              <div className="grid gap-3 md:grid-cols-3">
                                <div className="flex flex-col space-y-1.5">
                                  <span className="text-sm text-muted-foreground">ANTT Número</span>
                                  <Input value={carretaForm.antt_numero || ''} onChange={(e) => setCarretaForm({ ...carretaForm, antt_numero: e.target.value })} />
                                </div>
                                <div className="flex flex-col space-y-1.5">
                                  <span className="text-sm text-muted-foreground">ANTT CPF/CNPJ</span>
                                  <Input value={carretaForm.antt_cnpj_cpf || ''} onChange={(e) => setCarretaForm({ ...carretaForm, antt_cnpj_cpf: e.target.value })} />
                                </div>
                                <div className="flex flex-col space-y-1.5">
                                  <span className="text-sm text-muted-foreground">ANTT Nome</span>
                                  <Input value={carretaForm.antt_nome || ''} onChange={(e) => setCarretaForm({ ...carretaForm, antt_nome: e.target.value })} />
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (carreta.data ? (
                          <>
                            <FieldRow label="Placa" value={carreta.data.placa} />
                            <FieldRow label="CAP" value={carreta.data.cap} />
                            <FieldRow label="CNPJ/CPF Prop." value={carreta.data.cnpj_cpf_proprietario} />
                            <FieldRow label="Proprietário Doc." value={carreta.data.proprietario_documento} />
                            <FieldRow label="CEP" value={carreta.data.cep} />
                            <FieldRow label="Renavam" value={carreta.data.renavam} />
                            <FieldRow label="Modelo" value={carreta.data.modelo} />
                            <FieldRow label="Ano Fab." value={carreta.data.ano_fabricacao} />
                            <FieldRow label="Ano Modelo" value={carreta.data.ano_modelo} />
                            <FieldRow label="Nr Cert. Doc" value={carreta.data.nr_certificado_doc} />
                            <FieldRow label="Exercício Doc" value={carreta.data.exercicio_doc} />
                            <FieldRow label="Cor" value={carreta.data.cor} />
                            <FieldRow label="Chassi" value={carreta.data.chassi} />
                            <FieldRow label="Cidade Emplacado" value={carreta.data.cidade_emplacado} />
                            <div className="col-span-full border-t pt-2 mt-2">
                              <h4 className="text-sm font-semibold mb-2">Dados ANTT (Carreta)</h4>
                              <div className="grid gap-3 md:grid-cols-3">
                                <FieldRow label="ANTT Número" value={carreta.data.antt_numero} />
                                <FieldRow label="ANTT CPF/CNPJ" value={carreta.data.antt_cnpj_cpf} />
                                <FieldRow label="ANTT Nome" value={carreta.data.antt_nome} />
                              </div>
                            </div>
                            {carreta.data.link && (
                              <div className="col-span-full mt-2">
                                <Button
                                  variant="link"
                                  className="p-0 h-auto text-blue-600 hover:underline"
                                  onClick={() => setDocumentUrl(carreta.data.link)}
                                >
                                  Ver Documento Original
                                </Button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="col-span-full text-center text-muted-foreground py-4">Não cadastrado</div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="fotos" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Fotos do Veículo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.fotos ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { label: 'Foto Cavalo', url: data.fotos.foto_cavalo },
                          { label: 'Foto Lateral', url: data.fotos.foto_lateral },
                          { label: 'Foto Traseira', url: data.fotos.foto_traseira }
                        ].map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-2">
                            <span className="font-medium text-sm text-center">{item.label}</span>
                            {item.url ? (
                              <div
                                className="relative aspect-video bg-muted rounded-md overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity group"
                                onClick={() => setDocumentUrl(item.url)}
                              >
                                <img src={item.url} alt={item.label} className="object-cover w-full h-full" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                                  <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">Visualizar</span>
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video bg-muted rounded-md border flex items-center justify-center text-muted-foreground text-xs">
                                Sem foto
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-10">Nenhuma foto cadastrada</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )
          }
        </DialogContent >
      </Dialog >

      <Dialog open={!!documentUrl} onOpenChange={(open) => !open && setDocumentUrl(null)}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col bg-background">
          <DialogHeader className="px-4 py-2 border-b">
            <DialogTitle>Visualização do Documento</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full h-full bg-muted/20 relative">
            {documentUrl && (
              <iframe
                src={documentUrl}
                className="w-full h-full absolute inset-0"
                title="Documento"
                style={{ border: 'none' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
