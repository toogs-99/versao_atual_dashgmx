import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, User, Save, X } from "lucide-react";
import { useUsers, type Permission } from "@/hooks/useUsers";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const permissions: { id: Permission; label: string }[] = [
  { id: "cadastros", label: "Cadastros" },
  { id: "disponiveis", label: "Disponíveis" },
  { id: "embarques", label: "Embarques" },
  { id: "historico", label: "Histórico" },
  { id: "dashboard", label: "Dashboard" },
  { id: "faq", label: "FAQ IA" },
  { id: "usuarios", label: "Usuários" },
];

const roleColors: Record<string, string> = {
  admin: "bg-primary text-primary-foreground",
  responsavel: "bg-blue-500 text-white",
  user: "bg-secondary text-secondary-foreground",
  personalizado: "bg-purple-500 text-white",
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  responsavel: "Responsável",
  user: "Usuário",
  personalizado: "Personalizado",
};

export const UserManagement = () => {
  const { users, isLoading, createUser, updateUser, deleteUser } = useUsers();
  
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, Permission[]>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, Permission[]>>({});
  const usersPerPage = 6;
  
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "user"
  });

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const getDefaultPermissionsForRole = (role: string): Permission[] => {
    switch (role) {
      case "admin":
        return permissions.map(p => p.id);
      case "responsavel":
        return permissions.filter(p => p.id !== "usuarios").map(p => p.id);
      case "user":
        return permissions.filter(p => ["dashboard", "historico", "embarques"].includes(p.id)).map(p => p.id);
      default:
        return [];
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const defaultPerms = getDefaultPermissionsForRole(formData.role);
      const userPermissions = selectedPermissions["new"] || defaultPerms;
      
      // Determine if role should be "personalizado"
      const permsMatch = JSON.stringify(userPermissions.sort()) === JSON.stringify(defaultPerms.sort());
      const finalRole = permsMatch ? formData.role : "personalizado";
      
      await createUser(formData.email, formData.password, formData.displayName, finalRole, userPermissions);
      setFormData({ displayName: "", email: "", password: "", role: "user" });
      setSelectedPermissions({});
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveUser = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const userPermissions = selectedPermissions[userId];
      
      // Check if permissions match any predefined role
      let matchedRole = "personalizado";
      const roles = ["admin", "responsavel", "user"];
      
      for (const role of roles) {
        const rolePerms = getDefaultPermissionsForRole(role);
        if (JSON.stringify(userPermissions?.sort()) === JSON.stringify(rolePerms.sort())) {
          matchedRole = role;
          break;
        }
      }
      
      await updateUser(userId, undefined, matchedRole, userPermissions);
      setEditingUser(null);
      setOriginalPermissions({});
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (userToDelete) {
      await deleteUser(userToDelete);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const togglePermission = (userId: string, permission: Permission) => {
    setSelectedPermissions(prev => {
      const current = prev[userId] || [];
      const hasPermission = current.includes(permission);
      
      return {
        ...prev,
        [userId]: hasPermission 
          ? current.filter(p => p !== permission)
          : [...current, permission]
      };
    });
  };

  const startEditing = (userId: string, userPermissions: Permission[]) => {
    setEditingUser(userId);
    setSelectedPermissions(prev => ({
      ...prev,
      [userId]: userPermissions
    }));
    setOriginalPermissions(prev => ({
      ...prev,
      [userId]: [...userPermissions]
    }));
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Usuários e Permissões
          </h2>
          <p className="text-muted-foreground">
            Gerencie o acesso ao sistema
          </p>
        </div>
      </div>

      
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Cadastrar Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nome</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => handleFormChange("displayName", e.target.value)}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                    placeholder="email@gmx.com.br"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleFormChange("password", e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Nível de Acesso</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleFormChange("role", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="responsavel">Responsável</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Permissões (baseadas no nível de acesso)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`new-${permission.id}`}
                        checked={selectedPermissions["new"]?.includes(permission.id) ?? getDefaultPermissionsForRole(formData.role).includes(permission.id)}
                        onCheckedChange={() => togglePermission("new", permission.id)}
                      />
                      <label
                        htmlFor={`new-${permission.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {permission.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isCreating}>
                <Plus className="mr-2 h-4 w-4" />
                {isCreating ? "Criando..." : "Criar Usuário"}
              </Button>
            </form>
          </CardContent>
        </Card>


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {currentUsers.map((user) => (
          <Card key={user.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{user.display_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {editingUser === user.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveUser(user.id)}
                      >
                        <Save className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(user.id, user.permissions)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(user.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge className={roleColors[user.role]}>
                {roleLabels[user.role]}
              </Badge>

              {editingUser === user.id && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs font-semibold">Editar Permissões:</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${user.id}-${permission.id}`}
                          checked={selectedPermissions[user.id]?.includes(permission.id)}
                          onCheckedChange={() => togglePermission(user.id, permission.id)}
                        />
                        <label
                          htmlFor={`${user.id}-${permission.id}`}
                          className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {permission.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editingUser !== user.id && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold mb-1">Permissões:</p>
                  <div className="flex flex-wrap gap-1">
                    {user.permissions.length > 0 ? (
                      user.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {permissions.find(p => p.id === perm)?.label}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhuma permissão</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4 text-sm">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rodapé com Gerenciamento de Cargos */}
      <Card className="shadow-card mt-8">
        <CardHeader>
          <CardTitle>Gerenciamento de Cargos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cargos padrão do sistema e suas permissões. Quando um usuário não se enquadra em nenhum cargo padrão, ele é automaticamente categorizado como "Personalizado".
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className={roleColors.admin}>Administrador</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">Acesso completo ao sistema</p>
                <div className="flex flex-wrap gap-1">
                  {getDefaultPermissionsForRole("admin").map(perm => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      {permissions.find(p => p.id === perm)?.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className={roleColors.responsavel}>Responsável</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">Acesso operacional completo</p>
                <div className="flex flex-wrap gap-1">
                  {getDefaultPermissionsForRole("responsavel").map(perm => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      {permissions.find(p => p.id === perm)?.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className={roleColors.user}>Usuário</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">Acesso básico de visualização</p>
                <div className="flex flex-wrap gap-1">
                  {getDefaultPermissionsForRole("user").map(perm => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      {permissions.find(p => p.id === perm)?.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={roleColors.personalizado}>Personalizado</Badge>
              <span className="text-sm text-muted-foreground">
                Atribuído automaticamente quando as permissões não correspondem a nenhum cargo padrão
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
