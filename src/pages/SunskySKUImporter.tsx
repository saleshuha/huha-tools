import { SunskySKUImporter } from "@/components/po/SunskySKUImporter";
import { Download } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

export default function SunskySKUImporterPage() {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<Download className="w-5 h-5 text-primary-foreground" />}
        title="Sunsky SKU Importer"
        subtitle="Import and manage SKU data from Sunsky supplier"
      />
      <div className="glass-container p-8">
        <SunskySKUImporter />
      </div>
    </PageLayout>
  );
}