import { ExcelMapper } from '@/components/ExcelMapper';

const ExcelMapperPage = () => {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            📋 Excel File Mapper
          </h1>
          <p className="text-muted-foreground text-lg">
            Map one source file to one target file with intelligent column matching
          </p>
        </div>
        <ExcelMapper />
      </div>
    </div>
  );
};

export default ExcelMapperPage;