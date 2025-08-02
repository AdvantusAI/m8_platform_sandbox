import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Users, TrendingUp, MessageSquare, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CommercialReviewedRecord {
  id: string;
  postdate: string;
  product_id: string;
  location_id: string | null;
  customer_id: string | null;
  forecast: number | null;
  actual: number | null;
  sales_plan: number | null;
  demand_planner: number | null;
  commercial_input: number | null;
  commercial_confidence: string | null;
  commercial_notes: string | null;
  commercial_reviewed_by: string | null;
  commercial_reviewed_at: string | null;
  collaboration_status: string | null;
}

export function CommercialReviewedDashboard() {
  const [records, setRecords] = useState<CommercialReviewedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Transform data for pivot table
  const getPivotData = () => {
    // Group records by product_id, customer_id, location_id
    const grouped = records.reduce((acc, record) => {
      const key = `${record.product_id}-${record.customer_id || 'N/A'}-${record.location_id || 'N/A'}`;
      if (!acc[key]) {
        acc[key] = {
          product_id: record.product_id,
          customer_id: record.customer_id,
          location_id: record.location_id,
          dates: {}
        };
      }
      
      // Format date as column key
      const dateKey = record.commercial_reviewed_at 
        ? new Date(record.commercial_reviewed_at).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit'
          })
        : 'N/A';
      
      acc[key].dates[dateKey] = {
        forecast: record.forecast,
        commercial_input: record.commercial_input,
        commercial_confidence: record.commercial_confidence,
        collaboration_status: record.collaboration_status
      };
      
      return acc;
    }, {} as any);

    return Object.values(grouped);
  };

  // Get unique dates for column headers (most recent 10)
  const getUniqueDates = () => {
    const dateMap = new Map<string, Date>();
    records.forEach(record => {
      if (record.commercial_reviewed_at) {
        const fullDate = new Date(record.commercial_reviewed_at);
        const dateKey = fullDate.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit'
        });
        if (!dateMap.has(dateKey) || fullDate > dateMap.get(dateKey)!) {
          dateMap.set(dateKey, fullDate);
        }
      }
    });
    
    return Array.from(dateMap.entries())
      .sort(([, dateA], [, dateB]) => dateB.getTime() - dateA.getTime())
      .slice(0, 10)
      .map(([dateKey]) => dateKey);
  };

  // Calculate this week's date range
  const getThisWeekDateRange = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 365); // Saturday
    
    
    return {
      start: startOfWeek.toISOString(),
      end: endOfWeek.toISOString()
    };
  };

  const fetchCommercialReviewedRecords = async () => {
    try {
      setLoading(true);
      const { start, end } = getThisWeekDateRange();

      const { data, error } = await supabase
        .from('forecast_data')
        .select(`
          id,
          postdate,
          product_id,
          location_id,
          customer_id,
          forecast,
          actual,
          sales_plan,
          demand_planner,
          commercial_input,
          commercial_confidence,
          commercial_notes,
          commercial_reviewed_by,
          commercial_reviewed_at,
          collaboration_status
        `)
        .not('commercial_reviewed_at', 'is', null)
        .gte('commercial_reviewed_at', start)
        .lte('commercial_reviewed_at', end)
        .order('commercial_reviewed_at', { ascending: false });

      if (error) throw error;

      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching commercial reviewed records:', error);
      toast.error('Error al cargar registros revisados comercialmente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommercialReviewedRecords();
  }, []);

  // Calculate metrics
  const totalRecords = records.length;
  const recordsWithInput = records.filter(r => r.commercial_input !== null).length;
  const recordsWithNotes = records.filter(r => r.commercial_notes).length;
  const highConfidenceRecords = records.filter(r => r.commercial_confidence === 'high').length;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceBadgeVariant = (confidence: string | null) => {
    switch (confidence) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Cargando registros revisados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Revisiones Comerciales</h1>
          <p className="text-muted-foreground">
            Registros revisados comercialmente esta semana
          </p>
        </div>
        <Button onClick={fetchCommercialReviewedRecords} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revisados</p>
                <p className="text-2xl font-bold">{totalRecords}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <CalendarDays className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Con Input Comercial</p>
                <p className="text-2xl font-bold">{recordsWithInput}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Con Notas</p>
                <p className="text-2xl font-bold">{recordsWithNotes}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
                <MessageSquare className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alta Confianza</p>
                <p className="text-2xl font-bold">{highConfidenceRecords}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registros Revisados Esta Semana</CardTitle>
          <p className="text-sm text-muted-foreground">
            Detalles de todos los registros revisados comercialmente
          </p>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin revisiones esta semana</h3>
              <p className="text-muted-foreground">
                No hay registros revisados comercialmente en esta semana.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ubicación</TableHead>
                    {getUniqueDates().map((date) => (
                      <TableHead key={date} className="text-center min-w-[150px]">
                        Fecha: {date}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getPivotData().map((pivotRow: any, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {pivotRow.product_id}
                      </TableCell>
                      <TableCell>
                        {pivotRow.customer_id || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {pivotRow.location_id || 'N/A'}
                      </TableCell>
                      {getUniqueDates().map((date) => (
                        <TableCell key={date} className="text-center">
                          {pivotRow.dates[date] ? (
                            <div className="space-y-1">
                              <div className="text-xs font-semibold">
                                Pronóstico: {pivotRow.dates[date].forecast?.toLocaleString() || 'N/A'}
                              </div>
                              <div className="text-xs">
                                Input: {pivotRow.dates[date].commercial_input?.toLocaleString() || 'N/A'}
                              </div>
                              <div className="flex flex-col space-y-1">
                                <Badge 
                                  variant={getConfidenceBadgeVariant(pivotRow.dates[date].commercial_confidence)}
                                  className="text-xs"
                                >
                                  {pivotRow.dates[date].commercial_confidence || 'N/A'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {pivotRow.dates[date].collaboration_status || 'pending'}
                                </Badge>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}