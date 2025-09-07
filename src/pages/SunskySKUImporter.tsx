import { SunskySKUImporter } from "@/components/po/SunskySKUImporter";
import { Download } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export default function SunskySKUImporterPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<Download className="w-5 h-5 text-primary-foreground" />}
          title="Sunsky SKU Importer"
          subtitle="Import and manage SKU data from Sunsky supplier"
          className="mb-8"
        />
        <div className="glass-container mx-6 p-8">
          <SunskySKUImporter />
        </div>
      </div>
    </div>
  );
}