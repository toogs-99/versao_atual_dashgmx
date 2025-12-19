import { useState, useEffect } from "react";
// import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Permission =
  | "cadastros"
  | "disponiveis"
  | "embarques"
  | "historico"
  | "dashboard"
  | "faq"
  | "usuarios";

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  permissions: Permission[];
  created_at: string;
}

const FAKE_USERS_KEY = "fake_users";

type UserRecord = User;

const getFakeUsers = (): UserRecord[] => {
  try {
    const raw = localStorage.getItem(FAKE_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setFakeUsers = (list: UserRecord[]) => {
  try {
    localStorage.setItem(FAKE_USERS_KEY, JSON.stringify(list));
  } catch { }
};

const ensureSeededFakeUsers = () => {
  if (getFakeUsers().length > 0) return;
  const basePerms = {
    admin: ["cadastros", "disponiveis", "embarques", "historico", "dashboard", "faq", "usuarios"] as Permission[],
    responsavel: ["cadastros", "disponiveis", "embarques", "historico", "dashboard", "faq"] as Permission[],
    user: ["dashboard", "historico", "embarques"] as Permission[],
  };
  const names = [
    "Ana Souza", "Bruno Lima", "Carla Pereira", "Diego Santos", "Eduarda Rocha",
    "Felipe Alves", "Gabriela Martins", "Henrique Costa", "Isabela Nunes", "João Pedro"
  ];
  const roles = ["admin", "responsavel", "user", "user", "responsavel", "user", "admin", "user", "responsavel", "user"] as const;
  const now = new Date();
  const seeded = names.map((n, i) => ({
    id: (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2),
    email: `${n.toLowerCase().replace(/\s+/g, '')}@gmx.com.br`,
    display_name: n,
    role: roles[i] as unknown as string,
    permissions: basePerms[roles[i] as "admin" | "responsavel" | "user"],
    created_at: new Date(now.getTime() - i * 86400000).toISOString(),
  }));
  setFakeUsers(seeded);
};

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      ensureSeededFakeUsers();
      const fake = getFakeUsers();
      setUsers(fake);
    } catch (error: any) {
      console.error("Full error:", error);
      toast({
        title: "Erro ao carregar usuários (Mock)",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Realtime removed
  }, []);

  const createUser = async (email: string, password: string, displayName: string, role: string, permissions: Permission[]) => {
    try {
      const id = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2);
      const newUser: User = {
        id,
        email,
        display_name: displayName,
        role,
        permissions,
        created_at: new Date().toISOString()
      };
      const current = getFakeUsers();
      setFakeUsers([newUser, ...current]);
      setUsers(prev => [newUser, ...prev]);
      toast({
        title: "Usuário criado com sucesso",
        description: `${displayName} foi adicionado ao sistema`
      });
      return newUser;
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Falha ao criar usuário",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateUser = async (userId: string, displayName?: string, role?: string, permissions?: Permission[]) => {
    try {
      const list = getFakeUsers();
      const idx = list.findIndex(u => u.id === userId);
      if (idx !== -1) {
        const updated: User = {
          ...list[idx],
          display_name: displayName ?? list[idx].display_name,
          role: role ?? list[idx].role,
          permissions: permissions ?? list[idx].permissions,
        };
        const newList = [...list];
        newList[idx] = updated;
        setFakeUsers(newList);
        setUsers(prev => prev.map(u => u.id === userId ? updated : u));
        toast({
          title: "Usuário atualizado",
          description: "As alterações foram salvas"
        });
        return;
      }
      // No-op in fake mode if user not found
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Falha ao atualizar usuário",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const list = getFakeUsers();
      const newList = list.filter(u => u.id !== userId);
      setFakeUsers(newList);
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido do sistema"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Falha ao excluir usuário",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    users,
    isLoading,
    createUser,
    updateUser,
    deleteUser,
    refetch: fetchUsers
  };
};