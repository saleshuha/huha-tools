import { ExcelMapper } from '@/components/ExcelMapper';
import { FileSpreadsheet } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

const ExcelMapperPage = () => {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<FileSpreadsheet className="w-5 h-5 text-primary-foreground" />}
        title="Excel File Mapper"
        subtitle="Map one source file to one target file with intelligent column matching"
      />
      <div className="glass-container p-8">
        <ExcelMapper />
      </div>
    </PageLayout>
  );
};

export default ExcelMapperPage;