import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePurchaseLink } from '@/hooks/usePurchaseLink';
import { toast } from 'sonner';
import { Copy, ExternalLink, Loader2 } from 'lucide-react';

interface GeneratePurchaseLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poNumbers: string[];
}

export const GeneratePurchaseLinkDialog = ({
  open,
  onOpenChange,
  poNumbers
}: GeneratePurchaseLinkDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('30');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  
  const { generateLink, loading } = usePurchaseLink();

  const handleGenerate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to generate links');
        return;
      }

      const result = await generateLink({
        poNumbers,
        title: title || `Purchase Link for ${poNumbers.length} PO(s)`,
        description,
        expiresInDays: expiresInDays === 'never' ? undefined : parseInt(expiresInDays),
        userId: user.id
      });

      if (result) {
        const fullLink = `${window.location.origin}/purchase/${result.link_token}`;
        setGeneratedLink(fullLink);
        toast.success('Purchase link generated successfully!');
      }
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Failed to generate link');
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleOpenLink = () => {
    if (generatedLink) {
      window.open(generatedLink, '_blank');
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setExpiresInDays('30');
    setGeneratedLink(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Purchase Link</DialogTitle>
          <DialogDescription>
            Create a shareable link for your purchasing team to track and update quantities for {poNumbers.length} PO(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!generatedLink ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Link Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., October Supplier A Orders"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add any notes or instructions for your purchasing team..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry">Link Expiration</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Included POs:</p>
                <div className="flex flex-wrap gap-2">
                  {poNumbers.map((po) => (
                    <span key={po} className="text-xs bg-background px-2 py-1 rounded">
                      {po}
                    </span>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate Link
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 p-6 rounded-lg border border-green-500/20">
                <p className="text-sm font-medium mb-3">Your purchase link is ready!</p>
                <div className="flex items-center gap-2 bg-background p-3 rounded">
                  <Input 
                    value={generatedLink} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleOpenLink}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-sm space-y-2 text-muted-foreground">
                <p>✓ Share this link with your purchasing team</p>
                <p>✓ They can update quantities without logging in</p>
                <p>✓ All changes are tracked automatically</p>
                <p>✓ You'll see updates in real-time</p>
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { supabase } from '@/integrations/supabase/client';
