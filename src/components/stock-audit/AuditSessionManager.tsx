import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Clock, CheckCircle2, XCircle, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import type { AuditSession } from '@/hooks/useStockAudit';

interface AuditSessionManagerProps {
  sessions: AuditSession[];
  loading: boolean;
  onCreateSession: (name: string) => Promise<any>;
  onResumeSession: (id: string) => Promise<void>;
  onFetchSessions: () => Promise<void>;
}

export function AuditSessionManager({
  sessions,
  loading,
  onCreateSession,
  onResumeSession,
  onFetchSessions,
}: AuditSessionManagerProps) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    onFetchSessions();
  }, [onFetchSessions]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await onCreateSession(newName.trim());
    setNewName('');
    setCreating(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge variant="default" className="bg-amber-500/20 text-amber-700 border-amber-500/30"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="default" className="bg-rose-500/20 text-rose-700 border-rose-500/30"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Create New Session */}
      <Card className="border-dashed border-2 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Start New Audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="e.g. March 2026 Full Audit"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              disabled={creating}
            />
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? 'Creating...' : 'Start Audit'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Past Sessions */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Past Audit Sessions
        </h3>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No audit sessions yet. Start your first one above!</div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium">{session.name}</span>
                      {statusBadge(session.status)}
                      <Badge variant="outline" className="text-xs">{session.country}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-4">
                      <span>Started: {format(new Date(session.started_at), 'MMM d, yyyy h:mm a')}</span>
                      <span>System: {session.total_system_items}</span>
                      <span>Scanned: {session.total_scanned}</span>
                      {session.status === 'completed' && <span>Missing: {session.total_missing}</span>}
                    </div>
                  </div>
                  {session.status === 'in_progress' && (
                    <Button size="sm" onClick={() => onResumeSession(session.id)}>
                      <Play className="h-4 w-4 mr-1" />
                      Resume
                    </Button>
                  )}
                  {session.status === 'completed' && (
                    <Button size="sm" variant="outline" onClick={() => onResumeSession(session.id)}>
                      View
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
