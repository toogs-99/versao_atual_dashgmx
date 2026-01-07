import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, Clock, CheckCircle, DollarSign, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { CriticalPendencies } from "./CriticalPendencies";
import { RouteAnalyticsModal } from "./RouteAnalyticsModal";
import { useToast } from "@/hooks/use-toast"; // Assuming this was here or restore closest match
import { directus } from "@/lib/directus";
import { readItems } from "@directus/sdk";

type PeriodFilter = 'hoje' | 'mes' | 'tudo';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export const StatsDashboard = () => {
  const { toast } = useToast();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('hoje');
  const [frotaProdutoFilter, setFrotaProdutoFilter] = useState<string>('todos');
  const [frotaRotaFilter, setFrotaRotaFilter] = useState<string>('todos');
  const [rotasProdutoFilter, setRotasProdutoFilter] = useState<string>('Arroz');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Helper function to filter by date
  const getDateFilter = (period: PeriodFilter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === 'hoje') {
      return today.toISOString().split('T')[0];
    } else if (period === 'mes') {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return firstDayOfMonth.toISOString().split('T')[0];
    }
    return null; // 'tudo'
  };

  // Fetch Frota data (REAL)
  const { data: frotaData, isLoading: frotaLoading } = useQuery({
    queryKey: ['frota-real', periodFilter, frotaProdutoFilter, frotaRotaFilter],
    queryFn: async () => {
      try {
        // Fetch ALL recent availability records to determine true status
        const disponiveis = await directus.request(readItems('disponivel', {
          fields: ['*', 'motorista_id.id', 'motorista_id.nome', 'motorista_id.sobrenome'],
          sort: ['-date_created'],
          limit: 500 // Fetch enough to cover active fleet
        }));

        // Filter to keep only the most recent record per driver
        const latestStatusMap = new Map();
        for (const item of disponiveis) {
          const driverId = item.motorista_id?.id || item.motorista_id;
          if (driverId && !latestStatusMap.has(driverId)) {
            latestStatusMap.set(driverId, item);
          }
        }

        // Keep only those whose LATEST status is 'disponivel'
        const activeDrivers: any[] = Array.from(latestStatusMap.values())
          .filter((item: any) => item.status === 'disponivel');

        // Map to chart-compatible structure
        // Since we don't have 'Produto' or 'Rota' in disponivel table, we'll improvise or use defaults
        // Group by Location (City) as Rota
        // One record per driver = 1 'disponiveis'

        return activeDrivers.map(d => ({
          id: d.id,
          produto: 'Geral', // Default product group
          rota: d.local_disponibilidade || d.localizacao_atual || 'Não Informado', // Use location as route
          disponiveis: 1, // Represents 1 driver
          data: d.date_created.split('T')[0]
        }));

      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return [];
      }
    }
  });

  // Fetch Rotas data (REAL from embarques)
  const { data: rotasData, isLoading: rotasLoading } = useQuery({
    queryKey: ['rotas-real', periodFilter],
    queryFn: async () => {
      try {
        const filter: any = {};
        const dateFilter = getDateFilter(periodFilter);
        if (dateFilter) {
          filter.created_at = { _gte: dateFilter };
        }

        const embarques = await directus.request(readItems('embarques', {
          fields: ['origin', 'destination', 'produto_predominante'],
          filter: filter,
          limit: 1000
        }));

        // Transformar para formato de gráfico
        // Agrupar por "Origem -> Destino"
        const routeStats = embarques.reduce((acc: any, curr: any) => {
          if (!curr.origin || !curr.destination) return acc;
          const routeName = `${curr.origin.split('-')[0].trim()} -> ${curr.destination.split('-')[0].trim()}`;
          const produto = curr.produto_predominante || 'Diversos';

          const key = `${routeName}|${produto}`;

          if (!acc[key]) {
            acc[key] = { rota: routeName, produto, quantidade: 0 };
          }
          acc[key].quantidade += 1;
          return acc;
        }, {});

        return Object.values(routeStats) as { rota: string, produto: string, quantidade: number }[];
      } catch (err) {
        console.error("Erro ao buscar rotas:", err);
        return [];
      }
    }
  });

  // Fetch Acionamento data (REAL from driver status/disponibilidade)
  const { data: acionamentoData, isLoading: acionamentoLoading } = useQuery({
    queryKey: ['acionamento-real', periodFilter],
    queryFn: async () => {
      try {
        // Buscar motoristas para ver status atual
        // Assumindo que temos um campo de status ou inferimos da tabela disponivel
        const motoristas = await directus.request(readItems('drivers', {
          fields: ['status'],
          limit: 1000
        }));

        // Contagem de status
        const stats = {
          'Disponível': 0,
          'Em Viagem': 0,
          'Indisponível': 0
        };

        motoristas.forEach((m: any) => {
          // Normalizar status possiveis
          const s = m.status?.toLowerCase();
          if (s === 'active' || s === 'disponivel') stats['Disponível']++;
          else if (s === 'busy' || s === 'em_viagem') stats['Em Viagem']++;
          else stats['Indisponível']++;
        });

        return [
          { tipo: 'Disponível', valor: stats['Disponível'] },
          { tipo: 'Em Viagem', valor: stats['Em Viagem'] },
          { tipo: 'Indisponível', valor: stats['Indisponível'] }
        ];

      } catch (err) {
        console.error("Erro ao buscar acionamento:", err);
        return [];
      }
    }
  });

  // Calculate totals
  const totalVeiculos = useMemo(() => {
    return frotaData?.reduce((sum, item) => sum + item.disponiveis, 0) || 0;
  }, [frotaData]);

  const frotaChartData = useMemo(() => {
    if (!frotaData) return [];

    // Group by route and sum disponíveis
    const routeTotals = frotaData.reduce((acc, item) => {
      if (!acc[item.rota]) {
        acc[item.rota] = 0;
      }
      acc[item.rota] += item.disponiveis;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(routeTotals)
      .map(([rota, disponiveis]) => ({ rota, disponiveis }))
      .sort((a, b) => b.disponiveis - a.disponiveis);
  }, [frotaData]);

  const top10Rotas = useMemo(() => {
    if (!rotasData) return [];

    // Filter by product if selected
    let filtered = rotasData;
    if (rotasProdutoFilter && rotasProdutoFilter !== 'todos') {
      filtered = rotasData.filter(r => r.produto === rotasProdutoFilter);
    }

    // Sort by quantity
    return filtered
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [rotasData, rotasProdutoFilter]);

  const acionamentoChartData = useMemo(() => {
    if (!acionamentoData) return [];
    return acionamentoData.map(item => ({ name: item.tipo, value: item.valor }));
  }, [acionamentoData]);

  // Get unique produtos from frota_mock data
  const availableProdutos = useMemo(() => {
    if (!frotaData) return ['todos'];
    const produtos = Array.from(new Set(frotaData.map(item => item.produto)));
    return ['todos', ...produtos.sort()];
  }, [frotaData]);

  // Get unique rotas from frota_mock data
  const availableRotas = useMemo(() => {
    if (!frotaData) return ['todos'];
    const rotas = Array.from(new Set(frotaData.map(item => item.rota)));
    return ['todos', ...rotas.sort()];
  }, [frotaData]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Dashboard Operacional - Visão em Tempo Real</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Monitoramento completo de operações, veículos e cargas com filtros inteligentes
              </p>
            </div>
            <div className="flex gap-2">
              <Select value={frotaProdutoFilter} onValueChange={setFrotaProdutoFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Produtos</SelectItem>
                  <SelectItem value="Arroz">Arroz</SelectItem>
                  <SelectItem value="Açúcar">Açúcar</SelectItem>
                  <SelectItem value="Farelo">Farelo</SelectItem>
                  <SelectItem value="Milho">Milho</SelectItem>
                </SelectContent>
              </Select>
              <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="mes">Este mês</SelectItem>
                  <SelectItem value="tudo">Tudo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Critical Pendencies Section */}
      <CriticalPendencies />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-card transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Veículos Disponíveis
            </CardTitle>
            <Truck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Prontos para carga</p>
          </CardContent>
        </Card>

        <Card className="shadow-card transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Em Andamento
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Fretes ativos</p>
          </CardContent>
        </Card>

        <Card className="shadow-card transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aguardando Resposta
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Ofertas enviadas</p>
          </CardContent>
        </Card>

        <Card className="shadow-card transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Concluídos Hoje
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Entregas realizadas</p>
          </CardContent>
        </Card>

        <Card className="shadow-card transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receita do Mês
            </CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 145k</div>
            <p className="text-xs text-muted-foreground">+12% vs mês anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Visão Geral Section */}
      <div>
        <h3 className="text-2xl font-bold tracking-tight mb-4">Visão Geral</h3>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card 1: Frota/Veículos */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Quantidade de Veículos Disponíveis
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="mes">Mês</SelectItem>
                  <SelectItem value="tudo">Tudo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={frotaProdutoFilter} onValueChange={setFrotaProdutoFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Produto" />
                </SelectTrigger>
                <SelectContent>
                  {availableProdutos.map(p => (
                    <SelectItem key={p} value={p}>{p === 'todos' ? 'Todos Produtos' : p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={frotaRotaFilter} onValueChange={setFrotaRotaFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Rota" />
                </SelectTrigger>
                <SelectContent>
                  {availableRotas.map(r => (
                    <SelectItem key={r} value={r}>{r === 'todos' ? 'Todas Rotas' : r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {frotaLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-4xl font-bold text-primary">{totalVeiculos}</div>
                  <p className="text-sm text-muted-foreground">
                    Veículos disponíveis no período selecionado
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={frotaChartData}
                    margin={{ left: 60, right: 10, top: 5, bottom: 5 }}
                    onClick={(data) => {
                      if (data?.activeLabel) {
                        setSelectedRoute(data.activeLabel);
                        setSelectedProduct(frotaProdutoFilter !== 'todos' ? frotaProdutoFilter : undefined);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="rota"
                      height={60}
                      fontSize={10}
                      label={{ value: 'Rotas', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      label={{ value: 'Quantidade', angle: -90, position: 'center' }}
                    />
                    <Tooltip cursor={{ fill: 'hsl(var(--primary) / 0.1)' }} />
                    <Bar
                      dataKey="disponiveis"
                      fill="hsl(var(--primary))"
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  💡 Clique em uma barra para ver detalhes da rota
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Gráfico de Pizza - Disponibilidade x Acionamento */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Disponibilidade x Acionamento
              </CardTitle>
            </div>
            <div className="flex gap-2 mt-4">
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="mes">Mês</SelectItem>
                  <SelectItem value="tudo">Tudo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {acionamentoLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart onClick={(data: any) => {
                    if (data && data.name) {
                      toast({
                        title: `Veículos: ${data.name}`,
                        description: `Total: ${data.value} veículos neste status`,
                      });
                    }
                  }}>
                    <Pie
                      data={acionamentoChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      className="cursor-pointer"
                    >
                      {acionamentoChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          className="hover:opacity-80"
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  💡 Clique nas fatias para ver detalhes dos veículos
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Rotas and Top Motoristas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 3: Gráfico de Barras - Top 10 Rotas */}
        <Card className="shadow-card col-span-full lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Top 10 Rotas Mais Utilizadas por Produto
              </CardTitle>
            </div>
            <div className="flex gap-2 mt-4">
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="mes">Mês</SelectItem>
                  <SelectItem value="tudo">Tudo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={rotasProdutoFilter} onValueChange={setRotasProdutoFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableProdutos.filter(p => p !== 'todos').map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {rotasLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={top10Rotas}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                    onClick={(data) => {
                      if (data?.activeLabel) {
                        setSelectedRoute(data.activeLabel);
                        setSelectedProduct(rotasProdutoFilter);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      label={{ value: 'Quantidade de Viagens', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      dataKey="rota"
                      type="category"
                      width={150}
                      fontSize={11}
                      label={{ value: 'Rotas', angle: -90, position: 'insideLeft', offset: 10 }}
                    />
                    <Tooltip cursor={{ fill: 'hsl(var(--primary) / 0.1)' }} />
                    <Bar
                      dataKey="quantidade"
                      fill="hsl(var(--primary))"
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  💡 Clique em uma barra para ver análise detalhada
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Motoristas */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Top Motoristas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: "João Silva", trips: 45 },
              { name: "Carlos Lima", trips: 38 },
              { name: "Pedro Santos", trips: 32 },
            ].map((driver, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{driver.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {driver.trips} viagens
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Route Analytics Modal */}
      <RouteAnalyticsModal
        open={!!selectedRoute}
        onOpenChange={(open) => !open && setSelectedRoute(null)}
        route={selectedRoute || ''}
        product={selectedProduct || undefined}
      />
    </div>
  );
};
