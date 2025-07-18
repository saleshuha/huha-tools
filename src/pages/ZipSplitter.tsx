import { ZipSplitter } from '@/components/ZipSplitter';

export default function ZipSplitterPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            📁 ZIP File Splitter
          </h1>
          <p className="text-muted-foreground text-lg">
            Split large ZIP files by size or file count limits for easier management
          </p>
        </div>
        <ZipSplitter />
      </div>
    </div>
  );
}