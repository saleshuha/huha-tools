import { TemplateDataMapper } from '@/components/TemplateDataMapper';

const TemplateDataMapperPage = () => {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            📋 Template Data Mapper
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload base files and map data to saved templates for instant export
          </p>
        </div>
        <TemplateDataMapper />
      </div>
    </div>
  );
};

export default TemplateDataMapperPage;