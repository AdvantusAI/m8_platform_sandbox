import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, MessageSquare, AlertTriangle, Plus, Target, BarChart3, X, Package, MapPin, Building } from 'lucide-react';
import { useCommercialCollaboration } from '@/hooks/useCommercialCollaboration';
import { useForecastCollaboration } from '@/hooks/useForecastCollaboration';
import { CommercialProfileForm } from '@/components/CommercialProfileForm';
import { MarketIntelligenceForm } from '@/components/MarketIntelligenceForm';
import { ForecastCollaborationTable } from '@/components/ForecastCollaborationTable';
import { ProductSelectionModal } from '@/components/ProductSelectionModal';
import { LocationSelectionModal } from '@/components/LocationSelectionModal';
import { CustomerSelectionModal } from '@/components/CustomerSelectionModal';
export function CommercialDashboard() {
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showIntelligenceForm, setShowIntelligenceForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const {
    profile,
    assignments,
    marketIntelligence,
    loading: commercialLoading
  } = useCommercialCollaboration();
  const {
    forecastData,
    comments,
    loading: forecastLoading
  } = useForecastCollaboration(selectedProductId, selectedLocationId, selectedCustomerId);

  // Calculate metrics
  const pendingReviews = forecastData.filter(f => f.collaboration_status === 'pending_review').length;
  const completedReviews = forecastData.filter(f => f.collaboration_status === 'reviewed').length;
  const totalComments = comments.length;
  const activeIntelligence = marketIntelligence.filter(mi => mi.status === 'submitted').length;
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
  };
  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId);
  };
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
  };
  const handleClearFilters = () => {
    setSelectedProductId('');
    setSelectedLocationId('');
    setSelectedCustomerId('');
  };
  if (commercialLoading || forecastLoading) {
    return <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Cargando dashboard comercial...</p>
        </div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Comercial</h1>
          <p className="text-muted-foreground">
            Colaboración en pronósticos e inteligencia de mercado
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowProfileForm(true)} variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Perfil
          </Button>
          <Button onClick={() => setShowIntelligenceForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Inteligencia de Mercado
          </Button>
        </div>
      </div>

      {/* Profile Alert */}
      {!profile}

      {/* Metrics Cards */}
      

      {/* Main Content Tabs */}
      <Tabs defaultValue="forecasts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forecasts">Colaboración en Pronósticos</TabsTrigger>
          <TabsTrigger value="customers">Mis Clientes</TabsTrigger>
          <TabsTrigger value="intelligence">Inteligencia de Mercado</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="forecasts" className="space-y-4 mt-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" onClick={() => setIsProductModalOpen(true)} className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {selectedProductId ? `Producto: ${selectedProductId}` : 'Seleccionar Producto'}
                </Button>
                
                <Button variant="outline" onClick={() => setIsLocationModalOpen(true)} className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {selectedLocationId ? `Ubicación: ${selectedLocationId}` : 'Seleccionar Ubicación'}
                </Button>
                
                <Button variant="outline" onClick={() => setIsCustomerModalOpen(true)} className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {selectedCustomerId ? `Cliente: ${selectedCustomerId}` : 'Seleccionar Cliente'}
                </Button>
                
                <Button variant="outline" onClick={handleClearFilters} className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Limpiar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          <ForecastCollaborationTable data={forecastData} comments={comments} />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Clientes Asignados</CardTitle>
              <p className="text-sm text-muted-foreground">
                Gestiona tus cuentas clave y territorios
              </p>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sin asignaciones</h3>
                  <p className="text-muted-foreground">
                    Contacta al administrador para configurar tus clientes asignados.
                  </p>
                </div> : <div className="space-y-3">
                  {assignments.map(assignment => <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{assignment.customer_id}</div>
                        <div className="text-sm text-muted-foreground">
                          Desde: {new Date(assignment.start_date).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant={assignment.assignment_type === 'primary' ? 'default' : 'secondary'}>
                        {assignment.assignment_type}
                      </Badge>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Inteligencia de Mercado</CardTitle>
              <p className="text-sm text-muted-foreground">
                Insights y análisis de mercado compartidos
              </p>
            </CardHeader>
            <CardContent>
              {marketIntelligence.length === 0 ? <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sin inteligencia de mercado</h3>
                  <p className="text-muted-foreground mb-4">
                    Comparte insights para mejorar la precisión de los pronósticos.
                  </p>
                  <Button onClick={() => setShowIntelligenceForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Insight
                  </Button>
                </div> : <div className="space-y-3">
                  {marketIntelligence.map(intelligence => <div key={intelligence.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{intelligence.intelligence_type}</Badge>
                          <Badge variant={intelligence.impact_assessment === 'positive' ? 'default' : intelligence.impact_assessment === 'negative' ? 'destructive' : 'secondary'}>
                            {intelligence.impact_assessment}
                          </Badge>
                        </div>
                        <Badge variant="outline">{intelligence.status}</Badge>
                      </div>
                      <h4 className="font-medium mb-1">Cliente: {intelligence.customer_id}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {intelligence.description}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        Horizonte: {intelligence.time_horizon} | Confianza: {intelligence.confidence_level}
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Colaboración Este Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Revisiones Completadas</span>
                    <span className="font-semibold">{completedReviews}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Comentarios Agregados</span>
                    <span className="font-semibold">{totalComments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Inteligencia Compartida</span>
                    <span className="font-semibold">{marketIntelligence.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado de Territorio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Territorio</span>
                    <span className="font-semibold">{profile?.territory || 'No definido'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Región</span>
                    <span className="font-semibold">{profile?.region || 'No definida'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Especialización</span>
                    <span className="font-semibold">{profile?.specialization || 'General'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showProfileForm && <CommercialProfileForm profile={profile} onClose={() => setShowProfileForm(false)} />}

      {showIntelligenceForm && <MarketIntelligenceForm assignments={assignments} onClose={() => setShowIntelligenceForm(false)} />}

      {/* Selection Modals */}
      <ProductSelectionModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSelect={productId => {
      handleProductSelect(productId);
      setIsProductModalOpen(false);
    }} />

      <LocationSelectionModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} onSelect={locationId => {
      handleLocationSelect(locationId);
      setIsLocationModalOpen(false);
    }} />

      <CustomerSelectionModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} onSelect={customerId => {
      handleCustomerSelect(customerId);
      setIsCustomerModalOpen(false);
    }} selectedCustomerId={selectedCustomerId} />
    </div>;
}