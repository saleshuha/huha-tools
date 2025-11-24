import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  getAllSessions, 
  deleteSession, 
  updateSession, 
  type SessionMetadata 
} from '@/utils/sessionStorage';
import { toast } from '@/components/ui/use-toast';
import { 
  Trash2, 
  FolderOpen, 
  Edit2, 
  Check, 
  X, 
  Search,
  Clock,
  File
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SessionManagerProps {
  onLoad: (sessionId: string) => void;
  onClose: () => void;
  currentSessionId: string | null;
}

export function SessionManager({ onLoad, onClose, currentSessionId }: SessionManagerProps) {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const allSessions = await getAllSessions();
      allSessions.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
      setSessions(allSessions);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load sessions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      toast({
        title: "Success",
        description: "Session deleted successfully",
      });
      loadSessions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      });
    }
  };

  const startRename = (session: SessionMetadata) => {
    setEditingId(session.id);
    setEditingName(session.name);
  };

  const saveRename = async (sessionId: string) => {
    if (!editingName.trim()) {
      toast({
        title: "Error",
        description: "Session name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateSession(sessionId, { name: editingName.trim() });
      toast({
        title: "Success",
        description: "Session renamed successfully",
      });
      setEditingId(null);
      loadSessions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename session",
        variant: "destructive",
      });
    }
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const filteredSessions = sessions.filter(session =>
    session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.fileNames.some(fn => fn.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sessions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Session List */}
      <div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <Card className="glass-container p-8 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'No sessions found' : 'No saved sessions yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Upload a file and save your work to create a session
            </p>
          </Card>
        ) : (
          filteredSessions.map((session) => (
            <Card
              key={session.id}
              className={`glass-container p-4 transition-all ${
                currentSessionId === session.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {editingId === session.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(session.id);
                            if (e.key === 'Escape') cancelRename();
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveRename(session.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelRename}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm truncate">
                            {session.name}
                          </h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => startRename(session)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <File className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground truncate">
                            {session.fileNames.length} file{session.fileNames.length !== 1 ? 's' : ''}: {session.fileNames.join(', ')}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 rounded-md bg-background/50">
                    <div className="font-medium">{session.totalRows.toLocaleString()}</div>
                    <div className="text-muted-foreground">Rows</div>
                  </div>
                  <div className="text-center p-2 rounded-md bg-background/50">
                    <div className="font-medium">{session.totalColumns}</div>
                    <div className="text-muted-foreground">Columns</div>
                  </div>
                  <div className="text-center p-2 rounded-md bg-background/50">
                    <div className="font-medium">{session.selectedRowsCount}</div>
                    <div className="text-muted-foreground">Selected</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(session.lastModified)}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => onLoad(session.id)}
                      className="h-8"
                    >
                      <FolderOpen className="h-3 w-3 mr-1" />
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSessionToDelete(session.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="h-8"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this session. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sessionToDelete) {
                  handleDelete(sessionToDelete);
                  setSessionToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
