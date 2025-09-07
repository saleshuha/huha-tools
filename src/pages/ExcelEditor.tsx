import { ExcelEditor } from "@/components/ExcelEditor";
import { FileSpreadsheet } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

export default function ExcelEditorPage() {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<FileSpreadsheet className="w-5 h-5 text-primary-foreground" />}
        title="Excel Editor"
        subtitle="Edit and manage Excel spreadsheets with advanced tools"
      />
      <div className="glass-container p-8">
        <ExcelEditor />
      </div>
    </PageLayout>
  );
}