import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import { useForecastCollaboration } from '@/hooks/useForecastCollaboration';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ForecastPivotTableProps {
  data: any[];
  comments: any[];
}
export const ForecastPivotTable: React.FC<ForecastPivotTableProps> = ({
  data,
  comments
}) => {
  const {
    updateForecastCollaboration
  } = useForecastCollaboration();
  const [editingCells, setEditingCells] = useState<{
    [key: string]: string;
  }>({});
  const [pendingUpdates, setPendingUpdates] = useState<{
    [key: string]: number;
  }>({});
  const [showInputDialog, setShowInputDialog] = useState<string | null>(null);
  const [dialogData, setDialogData] = useState<{
    date: string;
    commercial_input?: string;
    commercial_confidence?: string;
    commercial_notes?: string;
    commercial_reviewed_by?: string;
    commercial_reviewed_at?: string;
    market_intelligence?: string;
    promotional_activity?: string;
    competitive_impact?: string;
  } | null>(null);

  const handleInputDialogOpen = (date: string, value: string) => {
    const dayData = getDataForDate(date);
    setDialogData({
      date,
      commercial_input: value,
      commercial_confidence: dayData.commercial_confidence || '',
      commercial_notes: dayData.commercial_notes || '',
      commercial_reviewed_by: dayData.commercial_reviewed_by || '',
      commercial_reviewed_at: dayData.commercial_reviewed_at || '',
      market_intelligence: dayData.market_intelligence || '',
      promotional_activity: dayData.promotional_activity || '',
      competitive_impact: dayData.competitive_impact || '',
    });
    setShowInputDialog(date);
  };

  const handleInputDialogSave = async () => {
    if (!dialogData) return;

    const { date, ...updatedValues } = dialogData;
    const dayData = getDataForDate(date);

    if (dayData.id) {
      const success = await updateForecastCollaboration(dayData.id, {
        ...updatedValues,
        commercial_input: parseFloat(updatedValues.commercial_input) || 0,
        collaboration_status: 'reviewed',
      });
      if (success) {
        setPendingUpdates(prev => ({
          ...prev,
          [`input-${date}`]: parseFloat(updatedValues.commercial_input) || 0,
        }));
        setShowInputDialog(null);
        setDialogData(null);
      }
    }
  };

  const handleInputDialogCancel = () => {
    setShowInputDialog(null);
    setDialogData(null);
  };

  // Filter dates for last 2 months and next 5 months
  const getFilteredDates = () => {
    const today = new Date();
    const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const fiveMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + 5, 31);
    return data.filter(item => {
      const itemDate = new Date(item.postdate);
      return itemDate >= twoMonthsAgo && itemDate <= fiveMonthsFromNow;
    }).map(item => item.postdate);
  };

  // Get unique dates and sort them (filtered)
  const uniqueDates = [...new Set(getFilteredDates())].sort();

  // Helper function to get data for a specific date
  const getDataForDate = (date: string) => {
    return data.find(item => item.postdate === date) || {};
  };

  // Helper function to format date for display
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Handle cell edit
  const handleCellEdit = (date: string, value: string) => {
    const cellKey = `input-${date}`;
    setEditingCells(prev => ({
      ...prev,
      [cellKey]: value
    }));
  };

  // Handle cell save
  const handleCellSave = async (date: string) => {
    const cellKey = `input-${date}`;
    const value = editingCells[cellKey];
    const dayData = getDataForDate(date);
    if (dayData.id && value !== undefined) {
      const success = await updateForecastCollaboration(dayData.id, {
        commercial_input: parseFloat(value) || 0,
        collaboration_status: 'reviewed'
      });
      if (success) {
        setPendingUpdates(prev => ({
          ...prev,
          [cellKey]: parseFloat(value) || 0
        }));
        setEditingCells(prev => {
          const newState = {
            ...prev
          };
          delete newState[cellKey];
          return newState;
        });
      }
    }
  };

  // Handle cell cancel
  const handleCellCancel = (date: string) => {
    const cellKey = `input-${date}`;
    setEditingCells(prev => {
      const newState = {
        ...prev
      };
      delete newState[cellKey];
      return newState;
    });
  };

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'aprobado':
        return 'default';
      case 'pending':
      case 'pendiente':
        return 'secondary';
      case 'rejected':
      case 'rechazado':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Helper function to get confidence badge
  const getConfidenceBadge = (confidence: string) => {
    switch (confidence?.toLowerCase()) {
      case 'high':
      case 'alta':
        return 'default';
      case 'medium':
      case 'media':
        return 'secondary';
      case 'low':
      case 'baja':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  if (!data || data.length === 0) {
    return <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No hay datos disponibles para mostrar en la tabla pivote.
          </p>
        </CardContent>
      </Card>;
  }
  return <Card>
      <CardHeader>
        <CardTitle>Tabla Pivote - Colaboración de Pronósticos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48 font-semibold sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 border-r">
                  Métrica
                </TableHead>
                {uniqueDates.map(date => (
                  <TableHead key={date} className="text-center min-w-32">
                    {formatDate(date)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Pronóstico IA Row */}
              <TableRow>
                <TableCell className="font-medium bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 border-r">
                  Pronóstico IA
                </TableCell>
                {uniqueDates.map(date => {
                const dayData = getDataForDate(date);
                return <TableCell key={date} className="text-center">
                      {dayData.forecast || '-'}
                    </TableCell>;
              })}
              </TableRow>

              {/* Plan Comercial Row */}
              <TableRow>
                <TableCell className="font-medium bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 border-r">
                  Plan Comercial
                </TableCell>
                {uniqueDates.map(date => {
                const dayData = getDataForDate(date);
                return <TableCell key={date} className="text-center">
                      {dayData.sales_plan || '-'}
                    </TableCell>;
              })}
              </TableRow>

              {/* Mi Input Row - Editable */}
              <TableRow>
                <TableCell className="font-medium bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 border-r">
                  Mi Input
                </TableCell>
                {uniqueDates.map(date => {
                const dayData = getDataForDate(date);
                const currentValue = pendingUpdates[`input-${date}`] !== undefined ? pendingUpdates[`input-${date}`] : dayData.commercial_input;
                return <TableCell key={date} className="text-center p-1 bg-orange-100">
                      <div className="cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={() => handleInputDialogOpen(date, currentValue?.toString() || '')}>
                          {currentValue || '-'}
                        </div>
                    </TableCell>;
              })}
              </TableRow>

            </TableBody>
          </Table>
        </div>
      </CardContent>
      {showInputDialog && dialogData && (
        <Dialog open onOpenChange={() => setShowInputDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Mi Input</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Input Comercial</label>
                <Input
                  value={dialogData.commercial_input || ''}
                  onChange={e => setDialogData(prev => prev ? { ...prev, commercial_input: e.target.value } : prev)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confianza Comercial</label>
                <select
                  value={dialogData.commercial_confidence || ''}
                  onChange={e => setDialogData(prev => prev ? { ...prev, commercial_confidence: e.target.value } : prev)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Seleccionar</option>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notas Comerciales</label>
                <Textarea
                  value={dialogData.commercial_notes || ''}
                  onChange={e => setDialogData(prev => prev ? { ...prev, commercial_notes: e.target.value } : prev)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Inteligencia de Mercado</label>
                <Input
                  value={dialogData.market_intelligence || ''}
                  onChange={e => setDialogData(prev => prev ? { ...prev, market_intelligence: e.target.value } : prev)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Actividad Promocional</label>
                <Input
                  value={dialogData.promotional_activity || ''}
                  onChange={e => setDialogData(prev => prev ? { ...prev, promotional_activity: e.target.value } : prev)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Impacto Competitivo</label>
                <Input
                  value={dialogData.competitive_impact || ''}
                  onChange={e => setDialogData(prev => prev ? { ...prev, competitive_impact: e.target.value } : prev)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleInputDialogCancel}>
                  Cancelar
                </Button>
                <Button onClick={handleInputDialogSave}>
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>;
};