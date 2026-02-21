import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, ExternalLink } from "lucide-react";
import { useMarketPurchaseLinks, MarketLinkItem } from "@/hooks/useMarketPurchaseLinks";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MarketLinkItem[];
}

export function GenerateMarketLinkDialog({ open, onOpenChange, items }: Props) {
  const { createLink } = useMarketPurchaseLinks();
  const [title, setTitle] = useState(`Market Purchase ${new Date().toLocaleDateString()}`);
  const [generatedUrl, setGeneratedUrl] = useState("");

  useEffect(() => {
    if (!open) setGeneratedUrl("");
  }, [open]);

  const handleGenerate = () => {
    createLink.mutate(
      { title, items },
      {
        onSuccess: (data) => {
          const url = `${window.location.origin}/market-purchase/${data.link_token}`;
          setGeneratedUrl(url);
        },
      }
    );
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedUrl);
    toast.success("Link copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Purchase Link</DialogTitle>
        </DialogHeader>

        {!generatedUrl ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Link Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <p className="text-sm text-muted-foreground">{items.length} items will be included in this link.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={createLink.isPending || items.length === 0}>
                {createLink.isPending ? "Generating..." : "Generate Link"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Share this link with your supplier:</p>
              <div className="flex items-center gap-2">
                <Input readOnly value={generatedUrl} className="text-xs font-mono" />
                <Button size="icon" variant="outline" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button variant="outline" onClick={() => window.open(generatedUrl, "_blank")}>
                <ExternalLink className="h-4 w-4 mr-1" /> Open Link
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
