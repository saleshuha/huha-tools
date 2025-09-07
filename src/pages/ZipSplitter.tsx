import { ZipSplitter } from '@/components/ZipSplitter';
import { Archive } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

export default function ZipSplitterPage() {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<Archive className="w-5 h-5 text-primary-foreground" />}
        title="ZIP File Splitter"
        subtitle="Split large ZIP files by size or file count limits for easier management"
      />
      <div className="glass-container p-8">
        <ZipSplitter />
      </div>
    </PageLayout>
  );
}