import { useState } from 'react';
import { useUserPurchaseLinks } from '@/hooks/usePurchaseLink';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ExternalLink, Copy, Power, Trash2, Eye, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const PurchaseLinkManagement = () => {
  const { links, loading, deactivateLink, deleteLink } = useUserPurchaseLinks();

  const handleCopyLink = (token: string) => {
    const fullLink = `${window.location.origin}/purchase/${token}`;
    navigator.clipboard.writeText(fullLink);
    toast.success('Link copied to clipboard!');
  };

  const handleOpenLink = (token: string) => {
    window.open(`/purchase/${token}`, '_blank');
  };

  const handleDeactivate = async (linkId: string) => {
    try {
      await deactivateLink(linkId);
      toast.success('Link deactivated');
    } catch (error) {
      toast.error('Failed to deactivate link');
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

  if (loading) {
    return <div className="text-center py-8">Loading links...</div>;
  }

  if (links.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No purchase links created yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Select POs and click "Generate Purchase Link" to create one
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Purchase Links</h3>
        <Badge variant="outline">{links.length} Total</Badge>
      </div>

      <div className="space-y-3">
        {links.map((link) => (
          <Card key={link.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{link.title || 'Untitled Link'}</h4>
                  <Badge variant={link.is_active ? 'default' : 'secondary'}>
                    {link.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                {link.description && (
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                )}
                
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {link.access_count || 0} views
                  </span>
                  <span>{link.po_numbers?.length || 0} POs</span>
                  <span>Created {format(new Date(link.created_at), 'MMM d, yyyy')}</span>
                  {link.expires_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expires {format(new Date(link.expires_at), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {link.po_numbers?.slice(0, 5).map((po: string) => (
                    <Badge key={po} variant="outline" className="text-xs">
                      {po}
                    </Badge>
                  ))}
                  {link.po_numbers?.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{link.po_numbers.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenLink(link.link_token)}
                  disabled={!link.is_active}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(link.link_token)}
                  disabled={!link.is_active}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {link.is_active && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivate(link.id)}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(link.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
