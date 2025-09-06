import { FileMerger } from "@/components/FileMerger";
import { Merge } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export default function FileMergerPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<Merge className="w-5 h-5 text-primary-foreground" />}
          title="File Merger"
          subtitle="Merge multiple files into a single unified document"
          className="mb-8"
        />
        <div className="glass-container mx-6 p-8">
          <FileMerger />
        </div>
      </div>
    </div>
  );
}