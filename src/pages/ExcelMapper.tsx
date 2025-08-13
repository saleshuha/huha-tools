import { ExcelMapper } from '@/components/ExcelMapper';

const ExcelMapperPage = () => {
  return (
    <div className="app-page">
      <div className="app-container">
        <div className="page-header">
          <h1 className="page-title">
            📊 Excel File Mapper
          </h1>
          <p className="page-subtitle">
            Map one source file to one target file with intelligent column matching
          </p>
        </div>
        <div className="glass-container p-8">
          <ExcelMapper />
        </div>
      </div>
    </div>
  );
};

export default ExcelMapperPage;