import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, CheckCircle, XCircle, MessageSquare, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '../../i18n';

interface Approval {
  id: string;
  launch_id: string;
  approver_role: 'supply_planning' | 'marketing' | 'finance' | 'commercial' | 'regulatory';
  approver_email: string;
  approver_name: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  approved_at?: string;
  created_at: string;
}

interface ApproversSectionProps {
  launchId: string;
  canApprove?: boolean;
  currentUserEmail?: string;
}

export function ApproversSection({ launchId, canApprove = false, currentUserEmail }: ApproversSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [approvalNotes, setApprovalNotes] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);

  // Fetch approvals for this launch
  const { data: approvals, isLoading } = useQuery({
    queryKey: ['launch-approvals', launchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('launch_approvals')
        .select('*')
        .eq('launch_id', launchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Approval[];
    },
    enabled: !!launchId,
  });

  // Mutation to update approval status
  const updateApprovalMutation = useMutation({
    mutationFn: async ({ approvalId, status, notes }: { approvalId: string; status: 'approved' | 'rejected'; notes?: string }) => {
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('launch_approvals')
        .update({
          status,
          notes,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
        })
        .eq('id', approvalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['launch-approvals', launchId] });
      toast({
        title: data.status === 'approved' ? 'Launch Approved' : 'Launch Rejected',
        description: `You have ${data.status} this launch as ${data.approver_role.replace('_', ' ')} approver.`,
      });
      setSelectedApproval(null);
      setApprovalNotes('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update approval status',
        variant: 'destructive',
      });
    },
  });

  const handleApproval = (approval: Approval, status: 'approved' | 'rejected') => {
    updateApprovalMutation.mutate({
      approvalId: approval.id,
      status,
      notes: approvalNotes,
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatRoleName = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const pendingApprovals = approvals?.filter(a => a.status === 'pending') || [];
  const completedApprovals = approvals?.filter(a => a.status !== 'pending') || [];
  const allApproved = approvals?.every(a => a.status === 'approved') || false;
  const hasRejections = approvals?.some(a => a.status === 'rejected') || false;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('review.approvers')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('review.approvers')}
        </CardTitle>
        <CardDescription>
          Required approvals for this launch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="p-3 border rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Status:</span>
            <Badge variant={allApproved ? 'default' : hasRejections ? 'destructive' : 'outline'}>
              {allApproved ? 'All Approved' : hasRejections ? 'Has Rejections' : `${pendingApprovals.length} Pending`}
            </Badge>
          </div>
        </div>

        {/* Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Pending Approvals</h4>
            {pendingApprovals.map((approval) => {
              const isCurrentUserApprover = canApprove && approval.approver_email === currentUserEmail;
              
              return (
                <div key={approval.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(approval.status)}
                    <div>
                      <span className="text-sm font-medium">{formatRoleName(approval.approver_role)}</span>
                      <div className="text-xs text-muted-foreground">{approval.approver_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(approval.status)}>
                      {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                    </Badge>
                    {isCurrentUserApprover && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedApproval(approval)}
                          >
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Review Launch as {formatRoleName(approval.approver_role)}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Notes (Optional)</label>
                              <Textarea
                                placeholder="Add your comments or feedback..."
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                rows={3}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleApproval(approval, 'rejected')}
                                disabled={updateApprovalMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                              <Button
                                onClick={() => handleApproval(approval, 'approved')}
                                disabled={updateApprovalMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed Approvals */}
        {completedApprovals.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Completed Approvals</h4>
            {completedApprovals.map((approval) => (
              <div key={approval.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {getStatusIcon(approval.status)}
                  <div>
                    <span className="text-sm font-medium">{formatRoleName(approval.approver_role)}</span>
                    <div className="text-xs text-muted-foreground">
                      {approval.approver_name}
                      {approval.approved_at && (
                        <span className="ml-2">
                          • {new Date(approval.approved_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(approval.status)}>
                    {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                  </Badge>
                  {approval.notes && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{formatRoleName(approval.approver_role)} Feedback</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            {approval.approver_name} • {new Date(approval.approved_at || approval.created_at).toLocaleDateString()}
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            {approval.notes}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!approvals || approvals.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No approvers configured for this launch</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}