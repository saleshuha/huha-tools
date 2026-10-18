import { ShoppingBag } from "lucide-react";
import { TrendyolWorkspace } from "@/components/trendyol/TrendyolWorkspace";

export default function TrendyolSAPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Trendyol SA</h1>
      </div>
      <TrendyolWorkspace />
    </div>
  );
}