import { useState } from "react";
import { Package, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplyTransitionChart } from "@/components/SupplyTransitionChart";

const mockSupplyPlans = [
  {
    id: "1",
    productName: "Audífonos Inalámbricos Inteligentes Pro",
    launchDate: "2024-10-15",
    status: "activo",
    scenario: "nuevo-producto",
    demandForecast: 15000,
    supplyRecommendation: 16500,
    riskLevel: "bajo",
    bufferStock: 10,
  },
  {
    id: "2", 
    productName: "Laptop Ultra-Delgada X1",
    launchDate: "2024-11-01",
    status: "planificando",
    scenario: "reemplazo",
    replacedProduct: "Laptop Estándar Pro",
    existingInventory: 2500,
    demandForecast: 12000,
    supplyRecommendation: 9500,
    riskLevel: "medio",
    bufferStock: 15,
  },
  {
    id: "3",
    productName: "Hub Inteligente para Hogar V3",
    launchDate: "2024-12-01",
    status: "revisión",
    scenario: "nuevo-producto",
    demandForecast: 8000,
    supplyRecommendation: 9200,
    riskLevel: "alto",
    bufferStock: 20,
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "activo": return "bg-green-100 text-green-800";
    case "planificando": return "bg-blue-100 text-blue-800"; 
    case "revisión": return "bg-yellow-100 text-yellow-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "bajo": return "text-green-600";
    case "medio": return "text-yellow-600";
    case "alto": return "text-red-600";
    default: return "text-gray-600";
  }
};

export default function SupplyPlanning() {
  const [selectedTab, setSelectedTab] = useState("overview");

  const totalPlans = mockSupplyPlans.length;
  const activePlans = mockSupplyPlans.filter(p => p.status === "activo").length;
  const planningPlans = mockSupplyPlans.filter(p => p.status === "planificando").length;
  const totalDemand = mockSupplyPlans.reduce((sum, p) => sum + p.demandForecast, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Planificación de Suministro NPI</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona planes de suministro para nuevas introducciones de productos
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          Crear Plan de Suministro
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planes Totales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlans}</div>
            <p className="text-xs text-muted-foreground">Planes de suministro en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planes Activos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activePlans}</div>
            <p className="text-xs text-muted-foreground">Ejecutándose actualmente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Planificación</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{planningPlans}</div>
            <p className="text-xs text-muted-foreground">Siendo planificados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demanda Total</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDemand.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Unidades pronosticadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="active">Planes Activos</TabsTrigger>
          <TabsTrigger value="planning">En Planificación</TabsTrigger>
          <TabsTrigger value="transition">Planificación de Transición</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {mockSupplyPlans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{plan.productName}</CardTitle>
                      <CardDescription>
                        Fecha de Lanzamiento: {new Date(plan.launchDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(plan.status)}>
                        {plan.status}
                      </Badge>
                      <Badge variant="outline" className={getRiskColor(plan.riskLevel)}>
                        riesgo {plan.riskLevel}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Escenario</p>
                      <p className="text-sm">{plan.scenario === "nuevo-producto" ? "Nuevo Producto" : "Reemplazo de Producto"}</p>
                      {plan.replacedProduct && (
                        <p className="text-xs text-muted-foreground">Reemplazando: {plan.replacedProduct}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pronóstico de Demanda</p>
                      <p className="text-lg font-semibold">{plan.demandForecast.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Recomendación de Suministro</p>
                      <p className="text-lg font-semibold">{plan.supplyRecommendation.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Stock de Reserva</p>
                      <p className="text-sm">{plan.bufferStock}%</p>
                      {plan.existingInventory && (
                        <p className="text-xs text-muted-foreground">
                          Existente: {plan.existingInventory.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4">
            {mockSupplyPlans
              .filter(plan => plan.status === "activo")
              .map((plan) => (
                <Card key={plan.id} className="border-green-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-800">{plan.productName}</CardTitle>
                    <CardDescription>Plan de suministro activo en ejecución</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Progreso</p>
                        <p className="text-lg font-semibold text-green-600">En Camino</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Estado de Suministro</p>
                        <p className="text-sm">85% completado</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Próximo Hito</p>
                        <p className="text-sm">Entrega final en 2 semanas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <div className="grid gap-4">
            {mockSupplyPlans
              .filter(plan => plan.status === "planificando" || plan.status === "revisión")
              .map((plan) => (
                <Card key={plan.id} className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-800">{plan.productName}</CardTitle>
                    <CardDescription>Plan de suministro en desarrollo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Estado de Planificación</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {plan.status === "planificando" ? "En Progreso" : "En Revisión"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Completado</p>
                        <p className="text-sm">{plan.status === "planificando" ? "60%" : "90%"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Próxima Acción</p>
                        <p className="text-sm">
                          {plan.status === "planificando" ? "Finalizar pronósticos" : "Esperando aprobación"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline">Ver Detalles</Button>
                      <Button size="sm">Editar Plan</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="transition" className="space-y-4">
          <SupplyTransitionChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}