import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DynamicDriverRegistry } from "@/components/dashboard/DynamicDriverRegistry";
import { AvailableDrivers } from "@/components/dashboard/AvailableDrivers";
import { ShipmentBoard } from "@/components/dashboard/ShipmentBoard";
import { ShipmentHistory } from "@/components/dashboard/ShipmentHistory";
import { StatsDashboard } from "@/components/dashboard/StatsDashboard";
import { UserManagement } from "@/components/dashboard/UserManagement";
import { ShipmentFollow } from "@/components/dashboard/ShipmentFollow";
import { OperatorPerformance } from "@/components/dashboard/OperatorPerformance";
import { EnhancedVehicleTimeline } from "@/components/dashboard/EnhancedVehicleTimeline";
import { LogisticsSaturationMap } from "@/components/dashboard/LogisticsSaturationMap";
import { DailyVehicleProposals } from "@/components/dashboard/DailyVehicleProposals";
import { CriticalPendencies } from "@/components/dashboard/CriticalPendencies";
import { GlobalMatchingPanel } from "@/components/dashboard/GlobalMatchingPanel";
import { useOperatorHeartbeat } from "@/hooks/useOperatorHeartbeat";
import {
  Users,
  UserCheck,
  Package,
  History,
  BarChart3,
  Settings,
  ClipboardList,
  Activity,
} from "lucide-react";

const Dashboard = () => {
  // Initialize operator heartbeat for activity tracking
  useOperatorHeartbeat();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-lg">
                <Package className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">GMX</h1>
                <p className="text-sm font-medium text-muted-foreground">
                  Sistema de Gestão de Fretes
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="stats" className="space-y-6">
          <div className="bg-card border rounded-lg p-2 shadow-sm">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1 bg-transparent h-auto">
              <TabsTrigger 
                value="stats" 
                className="flex-col sm:flex-row gap-1 sm:gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs sm:text-sm font-medium">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger 
                value="registry" 
                className="flex-col sm:flex-row gap-1 sm:gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="h-5 w-5" />
                <span className="text-xs sm:text-sm font-medium">Cadastros</span>
              </TabsTrigger>
              <TabsTrigger 
                value="available" 
                className="flex-col sm:flex-row gap-1 sm:gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <UserCheck className="h-5 w-5" />
                <span className="text-xs sm:text-sm font-medium">Disponíveis</span>
              </TabsTrigger>
              <TabsTrigger 
                value="shipments" 
                className="flex-col sm:flex-row gap-1 sm:gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Package className="h-5 w-5" />
                <span className="text-xs sm:text-sm font-medium">Embarques</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex-col sm:flex-row gap-1 sm:gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <History className="h-5 w-5" />
                <span className="text-xs sm:text-sm font-medium">Histórico</span>
              </TabsTrigger>
              <TabsTrigger 
                value="follow" 
                className="flex-col sm:flex-row gap-1 sm:gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ClipboardList className="h-5 w-5" />
                <span className="text-xs sm:text-sm font-medium">Follow</span>
              </TabsTrigger>
              <TabsTrigger 
                value="operators" 
                className="flex-col sm:flex-row gap-1 sm:gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Activity className="h-5 w-5" />
                <span className="text-xs sm:text-sm font-medium">Operadores</span>
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="flex-col sm:flex-row gap-1 sm:gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Settings className="h-5 w-5" />
                <span className="text-xs sm:text-sm font-medium">Usuários</span>
              </TabsTrigger>
            </TabsList>
          </div>

        <TabsContent value="stats" className="space-y-6">
          <CriticalPendencies />
          <GlobalMatchingPanel />
          <StatsDashboard />
          <EnhancedVehicleTimeline />
          <LogisticsSaturationMap />
          <DailyVehicleProposals />
        </TabsContent>

          <TabsContent value="registry" className="space-y-6">
            <DynamicDriverRegistry />
          </TabsContent>

          <TabsContent value="available" className="space-y-6">
            <AvailableDrivers />
          </TabsContent>

          <TabsContent value="shipments" className="space-y-6">
            <ShipmentBoard />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <ShipmentHistory />
          </TabsContent>

          <TabsContent value="follow" className="space-y-6">
            <ShipmentFollow />
          </TabsContent>

          <TabsContent value="operators" className="space-y-6">
            <OperatorPerformance />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
