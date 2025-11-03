import { supabase } from "@/integrations/supabase/client";
import { EmbarqueInsert, EmbarqueUpdate, EmbarqueStatus } from "@/types/embarque";
import { toast } from "sonner";

export async function createEmbarque(data: EmbarqueInsert) {
  try {
    const { data: newEmbarque, error } = await supabase
      .from('embarques')
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    toast.success('Embarque criado com sucesso!');
    return newEmbarque;
  } catch (error) {
    console.error('Error creating embarque:', error);
    toast.error('Erro ao criar embarque');
    throw error;
  }
}

export async function updateEmbarqueStatus(id: string, status: EmbarqueStatus) {
  try {
    const { data, error } = await supabase
      .from('embarques')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    toast.success('Status atualizado com sucesso!');
    return data;
  } catch (error) {
    console.error('Error updating embarque status:', error);
    toast.error('Erro ao atualizar status');
    throw error;
  }
}

export async function updateEmbarque(id: string, data: EmbarqueUpdate) {
  try {
    const { data: updatedEmbarque, error } = await supabase
      .from('embarques')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    toast.success('Embarque atualizado com sucesso!');
    return updatedEmbarque;
  } catch (error) {
    console.error('Error updating embarque:', error);
    toast.error('Erro ao atualizar embarque');
    throw error;
  }
}

export async function deleteEmbarque(id: string) {
  try {
    const { error } = await supabase
      .from('embarques')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast.success('Embarque removido com sucesso!');
  } catch (error) {
    console.error('Error deleting embarque:', error);
    toast.error('Erro ao remover embarque');
    throw error;
  }
}

export async function assignDriver(embarqueId: string, driverId: string) {
  try {
    const { data, error } = await supabase
      .from('embarques')
      .update({ driver_id: driverId })
      .eq('id', embarqueId)
      .select()
      .single();

    if (error) throw error;

    toast.success('Motorista atribuído com sucesso!');
    return data;
  } catch (error) {
    console.error('Error assigning driver:', error);
    toast.error('Erro ao atribuir motorista');
    throw error;
  }
}
