import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useMarketItemCosts } from "@/hooks/useMarketItemCosts";
import Papa from "papaparse";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkCostUploadDialog({ open, onOpenChange }: Props) {
  const { bulkUpsertCosts } = useMarketItemCosts();
  const [parsed, setParsed] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data
          .map((row: any) => {
            const asin = row.ASIN || row.asin || row.Asin || "";
            const sku = row.SKU || row.sku || row.Sku || "";
            const cost = parseFloat(row["Unit Cost"] || row.unit_cost || row.UnitCost || row.cost || row.Cost || "0");
            const title = row.Title || row.title || "";
            if (!asin || isNaN(cost)) return null;
            return { asin, sku, title, unit_cost: cost };
          })
          .filter(Boolean);
        setParsed(rows);
      },
    });
  }, []);

  const handleUpload = () => {
    if (parsed.length === 0) return;
    bulkUpsertCosts.mutate(parsed as any, {
      onSuccess: () => {
        onOpenChange(false);
        setParsed([]);
        setFileName("");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Cost CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            CSV should have columns: <strong>ASIN</strong>, <strong>SKU</strong> (optional), <strong>Unit Cost</strong>
          </p>
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <input type="file" accept=".csv" onChange={handleFile} className="block mx-auto text-sm" />
            {fileName && <p className="mt-2 text-sm font-medium">{fileName} — {parsed.length} items parsed</p>}
          </div>
          {parsed.length > 0 && (
            <div className="border rounded-lg max-h-40 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-2 py-1 text-left">ASIN</th>
                    <th className="px-2 py-1 text-left">SKU</th>
                    <th className="px-2 py-1 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 10).map((r: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-1 font-mono">{r.asin}</td>
                      <td className="px-2 py-1">{r.sku}</td>
                      <td className="px-2 py-1 text-right">{r.unit_cost}</td>
                    </tr>
                  ))}
                  {parsed.length > 10 && (
                    <tr><td colSpan={3} className="px-2 py-1 text-center text-muted-foreground">...and {parsed.length - 10} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={parsed.length === 0 || bulkUpsertCosts.isPending}>
            {bulkUpsertCosts.isPending ? "Uploading..." : `Upload ${parsed.length} Costs`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
