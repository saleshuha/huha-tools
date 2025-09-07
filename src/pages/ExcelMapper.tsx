import { ExcelMapper } from '@/components/ExcelMapper';
import { FileSpreadsheet } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

const ExcelMapperPage = () => {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<FileSpreadsheet className="w-5 h-5 text-primary-foreground" />}
          title="Excel File Mapper"
          subtitle="Map one source file to one target file with intelligent column matching"
          className="mb-8"
        />
        <div className="glass-container mx-6 p-8">
          <ExcelMapper />
        </div>
      </div>
    </div>
  );
};

export default ExcelMapperPage;