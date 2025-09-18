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
    productName: "Smart Wireless Headphones Pro",
    launchDate: "2024-10-15",
    status: "active",
    scenario: "new-product",
    demandForecast: 15000,
    supplyRecommendation: 16500,
    riskLevel: "low",
    bufferStock: 10,
  },
  {
    id: "2", 
    productName: "Ultra-Thin Laptop X1",
    launchDate: "2024-11-01",
    status: "planning",
    scenario: "replacement",
    replacedProduct: "Standard Laptop Pro",
    existingInventory: 2500,
    demandForecast: 12000,
    supplyRecommendation: 9500,
    riskLevel: "medium",
    bufferStock: 15,
  },
  {
    id: "3",
    productName: "Smart Home Hub V3",
    launchDate: "2024-12-01",
    status: "review",
    scenario: "new-product",
    demandForecast: 8000,
    supplyRecommendation: 9200,
    riskLevel: "high",
    bufferStock: 20,
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "active": return "bg-green-100 text-green-800";
    case "planning": return "bg-blue-100 text-blue-800"; 
    case "review": return "bg-yellow-100 text-yellow-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "low": return "text-green-600";
    case "medium": return "text-yellow-600";
    case "high": return "text-red-600";
    default: return "text-gray-600";
  }
};

export default function SupplyPlanning() {
  const [selectedTab, setSelectedTab] = useState("overview");

  const totalPlans = mockSupplyPlans.length;
  const activePlans = mockSupplyPlans.filter(p => p.status === "active").length;
  const planningPlans = mockSupplyPlans.filter(p => p.status === "planning").length;
  const totalDemand = mockSupplyPlans.reduce((sum, p) => sum + p.demandForecast, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">NPI Supply Planning</h1>
          <p className="text-muted-foreground mt-1">
            Manage supply plans for new product introductions
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          Create Supply Plan
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlans}</div>
            <p className="text-xs text-muted-foreground">Supply plans in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activePlans}</div>
            <p className="text-xs text-muted-foreground">Currently executing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Planning</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{planningPlans}</div>
            <p className="text-xs text-muted-foreground">Being planned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Demand</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDemand.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Units forecasted</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active Plans</TabsTrigger>
          <TabsTrigger value="planning">In Planning</TabsTrigger>
          <TabsTrigger value="transition">Transition Planning</TabsTrigger>
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
                        Launch Date: {new Date(plan.launchDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(plan.status)}>
                        {plan.status}
                      </Badge>
                      <Badge variant="outline" className={getRiskColor(plan.riskLevel)}>
                        {plan.riskLevel} risk
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Scenario</p>
                      <p className="text-sm">{plan.scenario === "new-product" ? "New Product" : "Product Replacement"}</p>
                      {plan.replacedProduct && (
                        <p className="text-xs text-muted-foreground">Replacing: {plan.replacedProduct}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Demand Forecast</p>
                      <p className="text-lg font-semibold">{plan.demandForecast.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Supply Recommendation</p>
                      <p className="text-lg font-semibold">{plan.supplyRecommendation.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Buffer Stock</p>
                      <p className="text-sm">{plan.bufferStock}%</p>
                      {plan.existingInventory && (
                        <p className="text-xs text-muted-foreground">
                          Existing: {plan.existingInventory.toLocaleString()}
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
              .filter(plan => plan.status === "active")
              .map((plan) => (
                <Card key={plan.id} className="border-green-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-800">{plan.productName}</CardTitle>
                    <CardDescription>Active supply plan in execution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Progress</p>
                        <p className="text-lg font-semibold text-green-600">On Track</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Supply Status</p>
                        <p className="text-sm">85% completed</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Next Milestone</p>
                        <p className="text-sm">Final delivery in 2 weeks</p>
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
              .filter(plan => plan.status === "planning" || plan.status === "review")
              .map((plan) => (
                <Card key={plan.id} className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-800">{plan.productName}</CardTitle>
                    <CardDescription>Supply plan in development</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Planning Status</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {plan.status === "planning" ? "In Progress" : "Under Review"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Completion</p>
                        <p className="text-sm">{plan.status === "planning" ? "60%" : "90%"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Next Action</p>
                        <p className="text-sm">
                          {plan.status === "planning" ? "Finalize forecasts" : "Await approval"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline">View Details</Button>
                      <Button size="sm">Edit Plan</Button>
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