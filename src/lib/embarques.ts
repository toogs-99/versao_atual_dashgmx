// import { supabase } from "@/integrations/supabase/client";
import { EmbarqueInsert, EmbarqueUpdate, EmbarqueStatus } from "@/types/embarque";
import { toast } from "sonner";

export async function createEmbarque(data: EmbarqueInsert) {
  console.log("Mock createEmbarque:", data);
  toast.success('Embarque criado com sucesso! (MOCK)');
  return { id: 'mock-id-' + Date.now(), ...data };
}

export async function updateEmbarqueStatus(id: string, status: EmbarqueStatus) {
  console.log("Mock updateEmbarqueStatus:", id, status);
  toast.success('Status atualizado com sucesso! (MOCK)');
  return { id, status };
}

export async function updateEmbarque(id: string, data: EmbarqueUpdate) {
  console.log("Mock updateEmbarque:", id, data);
  toast.success('Embarque atualizado com sucesso! (MOCK)');
  return { id, ...data };
}

export async function deleteEmbarque(id: string) {
  console.log("Mock deleteEmbarque:", id);
  toast.success('Embarque removido com sucesso! (MOCK)');
}

export async function assignDriver(embarqueId: string, driverId: string) {
  console.log("Mock assignDriver:", embarqueId, driverId);
  toast.success('Motorista atribuído com sucesso! (MOCK)');
  return { id: embarqueId, driver_id: driverId };
}
