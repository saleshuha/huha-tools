import { ExcelEditor } from "@/components/ExcelEditor";
import { FileSpreadsheet } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export default function ExcelEditorPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<FileSpreadsheet className="w-5 h-5 text-primary-foreground" />}
          title="Excel Editor"
          subtitle="Edit and manage Excel spreadsheets with advanced tools"
          className="mb-8"
        />
        <div className="glass-container mx-6 p-8">
          <ExcelEditor />
        </div>
      </div>
    </div>
  );
}