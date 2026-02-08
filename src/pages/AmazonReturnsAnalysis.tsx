import React, { useState } from 'react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { TrendingDown, Upload, Download, Trash2, Brain } from 'lucide-react';
import { useAmazonReturns } from '@/hooks/useAmazonReturns';
import { useCountry } from '@/contexts/CountryContext';
import { ReturnsMetricsDashboard } from '@/components/amazon/ReturnsMetricsDashboard';
import { ReturnsFilterPanel } from '@/components/amazon/ReturnsFilterPanel';
import { ReturnsDataTable } from '@/components/amazon/ReturnsDataTable';
import { ReturnsUploadDialog } from '@/components/amazon/ReturnsUploadDialog';
import { ReturnsAIInsightsPanel } from '@/components/amazon/ReturnsAIInsightsPanel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const AmazonReturnsAnalysis = () => {
  const { selectedCountry } = useCountry();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);

  const {
    returns,
    metrics,
    loading,
    filters,
    setFilters,
    uploadReturnsData,
    deleteReturn,
    bulkDelete,
    deleteAllReturns,
    exportToExcel,
    aiInsights,
    loadingInsights,
    fetchAIInsights,
    fileNames,
  } = useAmazonReturns(selectedCountry);

  const handleDeleteAll = async () => {
    await deleteAllReturns();
    setDeleteDialogOpen(false);
  };

  const handleAIInsightsClick = () => {
    setShowAIInsights(true);
    if (!aiInsights && !loadingInsights) {
      fetchAIInsights();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <HuhaHeader01
        icon={<TrendingDown className="w-6 h-6 text-primary-foreground" />}
        title="Amazon Returns Analysis"
        subtitle="Track and analyze product return rates"
        actions={[
          {
            label: 'AI Insights',
            icon: <Brain className="w-4 h-4" />,
            onClick: handleAIInsightsClick,
            variant: 'default',
          },
          {
            label: 'Upload Data',
            icon: <Upload className="w-4 h-4" />,
            onClick: () => setUploadDialogOpen(true),
            variant: 'default',
          },
          {
            label: 'Delete All',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => setDeleteDialogOpen(true),
            variant: 'secondary',
          },
          {
            label: 'Export',
            icon: <Download className="w-4 h-4" />,
            onClick: exportToExcel,
            variant: 'outline',
          },
        ]}
      />

      <div className="container mx-auto px-6 py-6 space-y-5">
        {/* Metrics Dashboard */}
        <ReturnsMetricsDashboard
          metrics={metrics}
          loading={loading}
          returns={returns}
          onAIInsightsClick={handleAIInsightsClick}
        />

        {/* AI Insights Panel */}
        {showAIInsights && (
          <ReturnsAIInsightsPanel
            insights={aiInsights}
            loading={loadingInsights}
            onRefresh={fetchAIInsights}
          />
        )}

        {/* Filters Panel */}
        <ReturnsFilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          fileNames={fileNames}
        />

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Returns Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all returns data for {selectedCountry}.
              This action cannot be undone. You can then upload fresh data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AmazonReturnsAnalysis;
