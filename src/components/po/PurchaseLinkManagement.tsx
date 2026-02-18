import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserPurchaseLinks } from '@/hooks/usePurchaseLink';
import { PurchaseInvoiceGenerator } from '@/components/po/PurchaseInvoiceGenerator';
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
  CheckCircle2,
  AlertCircle,
  XCircle,
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
  const [expandedPOs, setExpandedPOs] = useState<Set<string>>(new Set());

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
          // Fetch ALL orders by paginating past the 1000-row Supabase limit
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

  const togglePOExpand = (linkId: string) => {
    setExpandedPOs(prev => {
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
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
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
    <div className="space-y-4">
      {/* Header with search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search links..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">{links.length} Total</Badge>
          <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20">
            {links.filter(l => l.is_active).length} Active
          </Badge>
        </div>
      </div>

      {/* Links list */}
      <div className="space-y-3">
        {filteredLinks.map((link) => {
          const stats = linkStats[link.id];
          const completionPercent = stats?.total > 0 
            ? Math.round(((stats.purchased + stats.partial * 0.5) / stats.total) * 100)
            : 0;
          const isExpanded = expandedPOs.has(link.id);

          return (
            <Card 
              key={link.id} 
              className={`overflow-hidden transition-all duration-200 ${!link.is_active ? 'opacity-60' : 'hover:shadow-md'}`}
            >
              {/* Color accent strip */}
              <div className={`h-1 ${link.is_active ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
              
              <div className="p-5">
                {/* Header: Title + Actions */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-semibold text-base truncate">{link.title || 'Untitled Link'}</h4>
                      <Badge 
                        variant="outline"
                        className={link.is_active 
                          ? 'bg-green-500/10 text-green-600 border-green-500/30 text-xs' 
                          : 'text-xs'
                        }
                      >
                        {link.is_active ? '● Active' : '○ Inactive'}
                      </Badge>
                    </div>
                    {link.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{link.description}</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleOpenLink(link.link_token)}
                      disabled={!link.is_active}
                      className="h-8"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopyLink(link.link_token)}
                      disabled={!link.is_active}
                      title="Copy link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <PurchaseInvoiceGenerator linkId={link.id} linkTitle={link.title} />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(link)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShowQR(link)}>
                          <QrCode className="h-4 w-4 mr-2" />
                          Show QR Code
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {link.is_active ? (
                          <DropdownMenuItem onClick={() => handleDeactivate(link.id)}>
                            <Power className="h-4 w-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleReactivate(link.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(link.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  <div className="bg-muted/50 rounded-lg px-3 py-2 flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold leading-none">{link.access_count || 0}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Views</p>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-3 py-2 flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold leading-none">{link.total_updates_count || 0}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Updates</p>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-3 py-2 flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold leading-none">{link.po_numbers?.length || 0}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">POs</p>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-3 py-2 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold leading-none">{format(new Date(link.created_at), 'MMM d')}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Created</p>
                    </div>
                  </div>
                </div>

                {/* Progress Section */}
                {stats && (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium text-xs">Progress</span>
                      <span className="font-semibold text-xs">{completionPercent}%</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
                      <div 
                        className="bg-green-500 transition-all duration-500 rounded-l-full"
                        style={{ width: `${(stats.purchased / (stats.total || 1)) * 100}%` }}
                      />
                      <div 
                        className="bg-yellow-500 transition-all duration-500"
                        style={{ width: `${(stats.partial / (stats.total || 1)) * 100}%` }}
                      />
                      <div 
                        className="bg-red-400 transition-all duration-500"
                        style={{ width: `${(stats.notAvailable / (stats.total || 1)) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        {stats.purchased} done
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                        {stats.partial} partial
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                        {stats.notAvailable} N/A
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/30 inline-block" />
                        {stats.pending} pending
                      </span>
                    </div>
                  </div>
                )}

                {/* Meta timestamps */}
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mb-3">
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

                {/* PO Badges - Collapsible */}
                <Collapsible open={isExpanded} onOpenChange={() => togglePOExpand(link.id)}>
                  <div className="flex flex-wrap gap-1 items-center">
                    {link.po_numbers?.slice(0, 3).map((po: string) => (
                      <Badge key={po} variant="outline" className="text-[11px] font-mono">
                        {po}
                      </Badge>
                    ))}
                    {link.po_numbers?.length > 3 && (
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground">
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              +{link.po_numbers.length - 3} more
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </div>
                  <CollapsibleContent>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {link.po_numbers?.slice(3).map((po: string) => (
                        <Badge key={po} variant="outline" className="text-[11px] font-mono">
                          {po}
                        </Badge>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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
            <DialogDescription>
              Update the title and description for this purchase link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Link title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to open the purchase link
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4 space-y-4">
            {qrCodeDataUrl && (
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code" 
                className="w-64 h-64 rounded-lg border"
              />
            )}
            <p className="text-xs text-muted-foreground text-center max-w-[250px] truncate">
              {selectedLink && `${window.location.origin}/purchase/${selectedLink.link_token}`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleDownloadQR}>
              Download QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
