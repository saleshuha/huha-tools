import { useState } from "react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { FileDown, X, Package, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MarketItemCost } from "@/hooks/useMarketItemCosts";

interface ItemCostsPdfPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costs: MarketItemCost[];
  dateFrom?: Date;
  dateTo?: Date;
}

const SOURCE_COLORS: Record<string, { bg: string; text: string; pdfBg: [number, number, number]; pdfText: [number, number, number]; label: string }> = {
  manual: { bg: "bg-sky-100 text-sky-700", text: "text-sky-700", pdfBg: [219, 234, 254], pdfText: [29, 78, 216], label: "Manual" },
  link: { bg: "bg-purple-100 text-purple-700", text: "text-purple-700", pdfBg: [243, 232, 255], pdfText: [126, 34, 206], label: "Link" },
  purchase: { bg: "bg-emerald-100 text-emerald-700", text: "text-emerald-700", pdfBg: [209, 250, 229], pdfText: [21, 128, 61], label: "Purchase" },
};

function getSourceConfig(source: string) {
  return SOURCE_COLORS[source] || SOURCE_COLORS.manual;
}

export function ItemCostsPdfPreview({ open, onOpenChange, costs, dateFrom, dateTo }: ItemCostsPdfPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const now = new Date();
  const avgCost = costs.length > 0 ? costs.reduce((s, c) => s + c.unit_cost, 0) / costs.length : 0;

  const downloadPdf = () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;

      // --- Header ---
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Item Costs Report", margin, 13);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${format(now, "dd MMM yyyy, HH:mm")}`, margin, 20);
      if (dateFrom || dateTo) {
        doc.text(
          `Date Range: ${dateFrom ? format(dateFrom, "dd MMM yyyy") : "Start"} — ${dateTo ? format(dateTo, "dd MMM yyyy") : "Present"}`,
          margin,
          25
        );
      }

      // --- Summary bar ---
      const summaryY = 34;
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(margin, summaryY, pageW - margin * 2, 12, 2, 2, "F");
      doc.setTextColor(71, 85, 105); // slate-500
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Items: ${costs.length}`, margin + 6, summaryY + 7.5);
      doc.text(`Avg Cost: AED ${avgCost.toFixed(2)}`, margin + 60, summaryY + 7.5);
      if (dateFrom || dateTo) {
        doc.text(
          `Period: ${dateFrom ? format(dateFrom, "dd MMM yyyy") : "—"} to ${dateTo ? format(dateTo, "dd MMM yyyy") : "—"}`,
          margin + 120,
          summaryY + 7.5
        );
      }

      // --- Table ---
      const headers = ["#", "ASIN / SKU", "Title", "Supplier", "Cost (AED)", "Updated", "Source"];
      const colWidths = [10, 45, 85, 45, 22, 24, 20];
      const tableStartY = summaryY + 18;

      const drawHeaders = (y: number) => {
        doc.setFillColor(30, 41, 59); // slate-800
        doc.rect(margin, y, pageW - margin * 2, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        let x = margin + 2;
        headers.forEach((h, i) => {
          doc.text(h, x, y + 5.5);
          x += colWidths[i];
        });
        return y + 8;
      };

      const drawFooter = (pageNum: number, totalPages: number) => {
        doc.setDrawColor(203, 213, 225);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "normal");
        doc.text(`Item Costs Report — Generated ${format(now, "dd MMM yyyy HH:mm")}`, margin, pageH - 7);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageW - margin - 20, pageH - 7);
      };

      let y = drawHeaders(tableStartY);
      const baseRowHeight = 9;
      const lineHeight = 3.2;

      costs.forEach((c, idx) => {
        // Calculate title lines to determine row height
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const titleText = c.title || "—";
        const titleLines = doc.splitTextToSize(titleText, colWidths[2] - 2);
        const titleH = titleLines.length * lineHeight;
        const rowHeight = Math.max(baseRowHeight, titleH + 4);

        if (y + rowHeight > pageH - 18) {
          doc.addPage();
          y = 14;
          y = drawHeaders(y);
        }

        // Alternating row fill
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252); // slate-50
          doc.rect(margin, y, pageW - margin * 2, rowHeight, "F");
        }

        // Row border
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.line(margin, y + rowHeight, pageW - margin, y + rowHeight);

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);
        const midY = y + rowHeight / 2 + 1.5;
        let x = margin + 2;

        // #
        doc.text(String(idx + 1), x, midY);
        x += colWidths[0];

        // ASIN / SKU
        doc.setFont("helvetica", "bold");
        doc.text(c.asin, x, y + 4);
        if (c.sku) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6);
          doc.setTextColor(100, 116, 139);
          doc.text(c.sku, x, y + 7.5);
          doc.setFontSize(7);
          doc.setTextColor(30, 41, 59);
        }
        x += colWidths[1];

        // Title (multi-line)
        doc.setFont("helvetica", "normal");
        doc.text(titleLines, x, y + 3.5);
        x += colWidths[2];

        // Supplier
        doc.text((c.supplier_name || "—").substring(0, 22), x, midY);
        x += colWidths[3];

        // Cost
        doc.setFont("helvetica", "bold");
        doc.text(c.unit_cost.toFixed(2), x, midY);
        x += colWidths[4];

        // Updated
        doc.setFont("helvetica", "normal");
        doc.text(format(new Date(c.updated_at), "dd MMM yy"), x, midY);
        x += colWidths[5];

        // Source badge
        const src = getSourceConfig(c.source);
        const badgeW = doc.getTextWidth(src.label) + 4;
        doc.setFillColor(...src.pdfBg);
        doc.roundedRect(x - 1, midY - 3.3, badgeW, 4.5, 1, 1, "F");
        doc.setTextColor(...src.pdfText);
        doc.setFontSize(6);
        doc.text(src.label, x + 1, midY - 0.5);

        y += rowHeight;
      });

      // Draw footers on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
      }

      doc.save(`item-costs-${format(now, "yyyy-MM-dd")}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">PDF Export Preview</DialogTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={downloadPdf} disabled={downloading} className="gap-1.5">
                <FileDown className="h-4 w-4" />
                {downloading ? "Generating…" : "Download PDF"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="p-6">
            {/* Preview: Header */}
            <div className="bg-slate-900 text-white rounded-t-lg px-6 py-4">
              <h2 className="text-xl font-bold tracking-tight">Item Costs Report</h2>
              <p className="text-slate-400 text-xs mt-1">Generated: {format(now, "dd MMM yyyy, HH:mm")}</p>
              {(dateFrom || dateTo) && (
                <p className="text-slate-400 text-xs mt-0.5">
                  Date Range: {dateFrom ? format(dateFrom, "dd MMM yyyy") : "Start"} — {dateTo ? format(dateTo, "dd MMM yyyy") : "Present"}
                </p>
              )}
            </div>

            {/* Preview: Summary */}
            <div className="bg-slate-100 dark:bg-slate-800 border-x border-border px-6 py-3 flex items-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total Items:</span>
                <span className="font-bold text-foreground">{costs.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Avg Cost:</span>
                <span className="font-bold text-foreground">AED {avgCost.toFixed(2)}</span>
              </div>
              {(dateFrom || dateTo) && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Period:</span>
                  <span className="font-semibold text-foreground">
                    {dateFrom ? format(dateFrom, "dd MMM yyyy") : "—"} to {dateTo ? format(dateTo, "dd MMM yyyy") : "—"}
                  </span>
                </div>
              )}
            </div>

            {/* Preview: Table */}
            <div className="border border-border rounded-b-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white">
                     <th className="text-left px-3 py-2.5 font-semibold">#</th>
                     <th className="text-left px-3 py-2.5 font-semibold">ASIN / SKU</th>
                     <th className="text-left px-3 py-2.5 font-semibold">Title</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Title</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Supplier</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Cost (AED)</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Updated</th>
                    <th className="text-center px-3 py-2.5 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map((c, idx) => {
                    const src = getSourceConfig(c.source);
                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-slate-50 dark:bg-slate-900/30" : "bg-white dark:bg-background"}`}
                      >
                         <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                         <td className="px-3 py-2">
                           <div className="font-mono font-bold text-foreground">{c.asin}</div>
                           {c.sku && <div className="text-[10px] text-muted-foreground mt-0.5">{c.sku}</div>}
                         </td>
                         <td className="px-3 py-2 text-foreground max-w-[240px] truncate">{c.title || "—"}</td>
                        <td className="px-3 py-2 text-foreground max-w-[240px] truncate">{c.title || "—"}</td>
                        <td className="px-3 py-2 text-foreground">{c.supplier_name || "—"}</td>
                        <td className="px-3 py-2 text-right font-bold text-foreground">{c.unit_cost.toFixed(2)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{format(new Date(c.updated_at), "dd MMM yy")}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${src.bg}`}>
                            {src.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Preview: Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground">
              <span>Item Costs Report — Generated {format(now, "dd MMM yyyy HH:mm")}</span>
              <span>{costs.length} items</span>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
