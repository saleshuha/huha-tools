import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserPurchaseLinks } from '@/hooks/usePurchaseLink';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  ExternalLink, 
  Copy, 
  Power, 
  Trash2, 
  Eye, 
  Calendar, 
  MoreVertical, 
  Edit, 
  QrCode, 
  RefreshCw,
  TrendingUp,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  Link2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import QRCode from 'qrcode';

interface LinkStats {
  total: number;
  purchased: number;
  partial: number;
  notAvailable: number;
  pending: number;
}

export const PurchaseLinkManagement = () => {
  const { links, loading, fetchUserLinks, deactivateLink, deleteLink } = useUserPurchaseLinks();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [linkStats, setLinkStats] = useState<Record<string, LinkStats>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Fetch stats for each link
  useEffect(() => {
    const fetchStats = async () => {
      if (links.length === 0) {
        setLoadingStats(false);
        return;
      }

      setLoadingStats(true);
      const statsMap: Record<string, LinkStats> = {};

      for (const link of links) {
        try {
          let allOrders: { id: string; quantity: number }[] = [];
          const pageSize = 1000;
          let offset = 0;
          let hasMore = true;
          while (hasMore) {
            const { data: batch } = await supabase
              .from('po_orders')
              .select('id, quantity')
              .in('po_number', link.po_numbers || [])
              .range(offset, offset + pageSize - 1);
            if (batch && batch.length > 0) {
              allOrders = allOrders.concat(batch);
              offset += pageSize;
              hasMore = batch.length === pageSize;
            } else {
              hasMore = false;
            }
          }
          const orders = allOrders;

          const { data: updates } = await supabase
            .from('purchase_updates')
            .select('po_order_id, purchased_quantity, metadata')
            .eq('link_id', link.id);

          const total = orders?.length || 0;
          let purchased = 0;
          let partial = 0;
          let notAvailable = 0;

          orders?.forEach(order => {
            const update = updates?.find(u => u.po_order_id === order.id);
            if (update?.metadata?.not_available) {
              notAvailable++;
            } else if ((update?.purchased_quantity || 0) >= order.quantity) {
              purchased++;
            } else if ((update?.purchased_quantity || 0) > 0) {
              partial++;
            }
          });

          statsMap[link.id] = {
            total,
            purchased,
            partial,
            notAvailable,
            pending: total - purchased - partial - notAvailable
          };
        } catch (error) {
          console.error('Error fetching stats for link:', link.id, error);
          statsMap[link.id] = { total: 0, purchased: 0, partial: 0, notAvailable: 0, pending: 0 };
        }
      }

      setLinkStats(statsMap);
      setLoadingStats(false);
    };

    fetchStats();
  }, [links]);

  const handleCopyLink = (token: string) => {
    const fullLink = `${window.location.origin}/purchase/${token}`;
    navigator.clipboard.writeText(fullLink);
    toast.success('Link copied to clipboard!');
  };

  const handleOpenLink = (token: string) => {
    navigate(`/purchase/${token}`);
  };

  const handleDeactivate = async (linkId: string) => {
    try {
      await deactivateLink(linkId);
      toast.success('Link deactivated');
    } catch (error) {
      toast.error('Failed to deactivate link');
    }
  };

  const handleReactivate = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('purchase_links')
        .update({ is_active: true })
        .eq('id', linkId);
      
      if (error) throw error;
      await fetchUserLinks();
      toast.success('Link reactivated');
    } catch (error) {
      toast.error('Failed to reactivate link');
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('Are you sure? This will permanently delete the link and all associated data.')) {
      return;
    }
    try {
      await deleteLink(linkId);
      toast.success('Link deleted');
    } catch (error) {
      toast.error('Failed to delete link');
    }
  };

  const handleEditClick = (link: any) => {
    setSelectedLink(link);
    setEditTitle(link.title || '');
    setEditDescription(link.description || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedLink) return;
    
    try {
      const { error } = await supabase
        .from('purchase_links')
        .update({ 
          title: editTitle,
          description: editDescription 
        })
        .eq('id', selectedLink.id);
      
      if (error) throw error;
      
      await fetchUserLinks();
      setEditDialogOpen(false);
      toast.success('Link updated');
    } catch (error) {
      toast.error('Failed to update link');
    }
  };

  const handleShowQR = async (link: any) => {
    setSelectedLink(link);
    const fullLink = `${window.location.origin}/purchase/${link.link_token}`;
    
    try {
      const dataUrl = await QRCode.toDataURL(fullLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeDataUrl(dataUrl);
      setQrDialogOpen(true);
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeDataUrl || !selectedLink) return;
    
    const link = document.createElement('a');
    link.download = `purchase-link-qr-${selectedLink.link_token.slice(0, 8)}.png`;
    link.href = qrCodeDataUrl;
    link.click();
    toast.success('QR code downloaded');
  };

  const toggleCardExpand = (linkId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(linkId)) next.delete(linkId);
      else next.add(linkId);
      return next;
    });
  };

  const filteredLinks = links.filter(link => 
    link.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.po_numbers?.some((po: string) => po.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <Link2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground font-medium">No purchase links created yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Select POs and click "Generate Purchase Link" to create one
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with search */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search links..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-[10px] h-6">{links.length} Total</Badge>
          <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20 text-[10px] h-6">
            {links.filter(l => l.is_active).length} Active
          </Badge>
        </div>
      </div>

      {/* Links list — compact cards */}
      <div className="space-y-2">
        {filteredLinks.map((link) => {
          const stats = linkStats[link.id];
          const completionPercent = stats?.total > 0 
            ? Math.round(((stats.purchased + stats.partial * 0.5) / stats.total) * 100)
            : 0;
          const isExpanded = expandedCards.has(link.id);

          return (
            <Card 
              key={link.id} 
              className={`overflow-hidden transition-all duration-200 ${!link.is_active ? 'opacity-60' : 'hover:shadow-md'}`}
            >
              {/* Color accent strip */}
              <div className={`h-0.5 ${link.is_active ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
              
              <div className="p-3">
                {/* Row 1: Title + status + actions */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <h4 className="font-semibold text-sm truncate">{link.title || 'Untitled Link'}</h4>
                    <Badge 
                      variant="outline"
                      className={`shrink-0 text-[10px] h-5 px-1.5 ${link.is_active 
                        ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                        : ''
                      }`}
                    >
                      {link.is_active ? '● Active' : '○ Inactive'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="default" size="sm" onClick={() => handleOpenLink(link.link_token)} disabled={!link.is_active} className="h-7 text-xs px-2.5">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleCopyLink(link.link_token)} disabled={!link.is_active} title="Copy link">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(link)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShowQR(link)}>
                          <QrCode className="h-4 w-4 mr-2" /> Show QR Code
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {link.is_active ? (
                          <DropdownMenuItem onClick={() => handleDeactivate(link.id)}>
                            <Power className="h-4 w-4 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleReactivate(link.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Reactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(link.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Row 2: Inline pill stats */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 text-[11px]">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{link.access_count || 0}</span>
                    <span className="text-muted-foreground">views</span>
                  </div>
                  <div className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 text-[11px]">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{link.total_updates_count || 0}</span>
                    <span className="text-muted-foreground">updates</span>
                  </div>
                  <div className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 text-[11px]">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{link.po_numbers?.length || 0}</span>
                    <span className="text-muted-foreground">POs</span>
                  </div>
                  <div className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 text-[11px]">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{format(new Date(link.created_at), 'MMM d')}</span>
                  </div>

                  {stats && (
                    <div className="flex items-center gap-1 bg-primary/5 border border-primary/10 rounded-md px-2 py-1 text-[11px]">
                      <span className="font-semibold text-primary">{completionPercent}%</span>
                      <span className="text-muted-foreground">done</span>
                    </div>
                  )}

                  {/* Expand/collapse toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-muted-foreground ml-auto"
                    onClick={() => toggleCardExpand(link.id)}
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                    {isExpanded ? 'Less' : 'Details'}
                  </Button>
                </div>

                {/* Collapsible details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                    {/* Description */}
                    {link.description && (
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    )}

                    {/* Progress bar */}
                    {stats && stats.total > 0 && (
                      <div className="space-y-1.5">
                        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                          <div className="bg-green-500 transition-all" style={{ width: `${(stats.purchased / stats.total) * 100}%` }} />
                          <div className="bg-yellow-500 transition-all" style={{ width: `${(stats.partial / stats.total) * 100}%` }} />
                          <div className="bg-red-400 transition-all" style={{ width: `${(stats.notAvailable / stats.total) * 100}%` }} />
                        </div>
                        <div className="flex gap-3 text-[10px]">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{stats.purchased} done</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />{stats.partial} partial</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />{stats.notAvailable} N/A</span>
                          <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />{stats.pending} pending</span>
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                      {link.last_accessed_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Accessed {formatDistanceToNow(new Date(link.last_accessed_at), { addSuffix: true })}
                        </span>
                      )}
                      {link.expires_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires {format(new Date(link.expires_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>

                    {/* PO Badges */}
                    {link.po_numbers?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {link.po_numbers.map((po: string) => (
                          <Badge key={po} variant="outline" className="text-[10px] font-mono h-5">
                            {po}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Purchase Link</DialogTitle>
            <DialogDescription>Update the title and description for this purchase link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Link title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional description" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>Scan this QR code to open the purchase link</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4 space-y-4">
            {qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64 rounded-lg border" />
            )}
            <p className="text-xs text-muted-foreground text-center max-w-[250px] truncate">
              {selectedLink && `${window.location.origin}/purchase/${selectedLink.link_token}`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>Close</Button>
            <Button onClick={handleDownloadQR}>Download QR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
