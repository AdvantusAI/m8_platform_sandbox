import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '../../components/features/launches/i18n';
import { LaunchDraft } from '../../components/features/launches/types';

// Mock recent launches data
const mockRecentLaunches: LaunchDraft[] = [
  {
    id: 'draft_1',
    status: 'published',
    basics: {
      name: 'Cola Zero Lime 355ml',
      category: 'Beverages/Cola',
      brand: 'M8 Cola',
      uom: 'EA',
      lifecycle: 'launch',
      launchDate: '2025-11-01',
      locations: ['DC_MEX', 'DC_GDL'],
      channels: ['ModernTrade', 'eCommerce'],
    },
    analogs: [],
    market: {
      price: 14.5,
      currency: 'MXN',
      distribution: { weeks: [] },
    },
    cannibalization: { impactedSkus: [] },
    scenarios: [],
    audit: {
      createdBy: 'user_1',
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T14:30:00Z',
    },
  },
  {
    id: 'draft_2',
    status: 'in_review',
    basics: {
      name: 'Orange Soda 600ml',
      category: 'Beverages/Soda',
      brand: 'Citrus Fresh',
      uom: 'EA',
      lifecycle: 'launch',
      launchDate: '2025-12-15',
      locations: ['DC_MEX'],
      channels: ['ModernTrade'],
    },
    analogs: [],
    market: {
      price: 18.0,
      currency: 'MXN',
      distribution: { weeks: [] },
    },
    cannibalization: { impactedSkus: [] },
    scenarios: [],
    audit: {
      createdBy: 'user_2',
      createdAt: '2025-01-16T09:00:00Z',
      updatedAt: '2025-01-16T11:20:00Z',
    },
  },
];

const statusIcons = {
  draft: Clock,
  in_review: TrendingUp,
  approved: CheckCircle,
  published: CheckCircle,
  rejected: Clock,
};

const statusColors = {
  draft: 'bg-muted text-muted-foreground',
  in_review: 'bg-primary/10 text-primary',
  approved: 'bg-green-100 text-green-800',
  published: 'bg-green-500 text-white',
  rejected: 'bg-red-100 text-red-800',
};

export function LaunchLanding() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleStartNew = () => {
    navigate('/launches/new');
  };

  const handleViewDraft = (draftId: string) => {
    navigate(`/launches/${draftId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('launch.title')}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t('launch.subtitle')}
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Start New Launch */}
        <Card className="cursor-pointer transition-all hover:shadow-lg border-2 hover:border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {t('launch.startNew')}
                </CardTitle>
                <CardDescription>
                  Create a new product launch with AI-powered forecasting
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={handleStartNew} className="w-full" size="lg">
              <Plus className="mr-2 h-4 w-4" />
              {t('launch.startNew')}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-secondary/10">
                <TrendingUp className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {t('launch.recentLaunches')}
                </CardTitle>
                <CardDescription>
                  View and manage your product launches
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {mockRecentLaunches.length > 0 ? (
              <div className="space-y-3">
                {mockRecentLaunches.slice(0, 3).map((launch) => {
                  const StatusIcon = statusIcons[launch.status];
                  return (
                    <div
                      key={launch.id}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleViewDraft(launch.id)}
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">
                            {launch.basics.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {launch.basics.brand} • {launch.basics.launchDate}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        className={`text-xs ${statusColors[launch.status]}`}
                        variant="secondary"
                      >
                        {t(`status.${launch.status}` as any)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('launch.noDrafts')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Highlights */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">M8.Predict AI Forecasting</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">

              Usa ML para predecir la demanda usando productos analógicos y factores del mercado.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Planificación de Escenarios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Compara escenarios optimistas, base y pesimistas para tomar decisiones informadas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Integración de la Cadena de Suministro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Valida la factibilidad del lanzamiento con restricciones de la cadena de suministro y tiempos de entrega en tiempo real.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}