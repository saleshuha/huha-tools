import { FileMerger } from "@/components/FileMerger";
import { Merge } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

export default function FileMergerPage() {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<Merge className="w-5 h-5 text-primary-foreground" />}
        title="File Merger"
        subtitle="Merge multiple files into a single unified document"
      />
      <div className="glass-container p-8">
        <FileMerger />
      </div>
    </PageLayout>
  );
}