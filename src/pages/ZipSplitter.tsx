import { ZipSplitter } from '@/components/ZipSplitter';
import { Archive } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export default function ZipSplitterPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<Archive className="w-5 h-5 text-primary-foreground" />}
          title="ZIP File Splitter"
          subtitle="Split large ZIP files by size or file count limits for easier management"
          className="mb-8"
        />
        <div className="glass-container mx-6 p-8">
          <ZipSplitter />
        </div>
      </div>
    </div>
  );
}