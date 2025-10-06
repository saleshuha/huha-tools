import React, { useState } from 'react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { TrendingDown, Upload, Download } from 'lucide-react';
import { useAmazonReturns } from '@/hooks/useAmazonReturns';
import { useCountry } from '@/contexts/CountryContext';
import { ReturnsMetricsDashboard } from '@/components/amazon/ReturnsMetricsDashboard';
import { ReturnsFilterPanel } from '@/components/amazon/ReturnsFilterPanel';
import { ReturnsDataTable } from '@/components/amazon/ReturnsDataTable';
import { ReturnsUploadDialog } from '@/components/amazon/ReturnsUploadDialog';

const AmazonReturnsAnalysis = () => {
  const { selectedCountry } = useCountry();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const {
    returns,
    metrics,
    loading,
    filters,
    setFilters,
    uploadReturnsData,
    deleteReturn,
    bulkDelete,
    exportToExcel,
  } = useAmazonReturns(selectedCountry);

  return (
    <div className="min-h-screen bg-background">
      <HuhaHeader01
        icon={<TrendingDown className="w-6 h-6 text-primary-foreground" />}
        title="Amazon Returns Analysis"
        subtitle="Track and analyze product return rates"
        actions={[
          {
            label: 'Upload Data',
            icon: <Upload className="w-4 h-4" />,
            onClick: () => setUploadDialogOpen(true),
            variant: 'default',
          },
          {
            label: 'Export',
            icon: <Download className="w-4 h-4" />,
            onClick: exportToExcel,
            variant: 'outline',
          },
        ]}
      />

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Metrics Dashboard */}
        <ReturnsMetricsDashboard metrics={metrics} loading={loading} />

        {/* Filters Panel */}
        <ReturnsFilterPanel filters={filters} onFiltersChange={setFilters} />

        {/* Data Table */}
        <ReturnsDataTable
          returns={returns}
          loading={loading}
          onDelete={deleteReturn}
          onBulkDelete={bulkDelete}
        />
      </div>

      {/* Upload Dialog */}
      <ReturnsUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={uploadReturnsData}
      />
    </div>
  );
};

export default AmazonReturnsAnalysis;
