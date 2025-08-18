import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUploadZone } from '@/components/noon-cleaner/FileUploadZone';
import { ProcessingStatus } from '@/components/noon-cleaner/ProcessingStatus';
import { ResultsDisplay } from '@/components/noon-cleaner/ResultsDisplay';
import { HistoryView } from '@/components/noon-cleaner/HistoryView';
import { Upload, FileText, Settings, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ProcessingJob {
  id: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  baseFiles: File[];
  errorFiles: File[];
  results?: {
    cleanedFiles: Array<{ name: string; blob: Blob; removedCount: number; remainingCount: number }>;
    logFiles: Array<{ name: string; blob: Blob }>;
    consolidatedFile?: { name: string; blob: Blob };
    zipFile?: { name: string; blob: Blob };
  };
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

const NoonFileCleaner: React.FC = () => {
  const { toast } = useToast();
  const [baseFiles, setBaseFiles] = useState<File[]>([]);
  const [errorFiles, setErrorFiles] = useState<File[]>([]);
  const [currentJob, setCurrentJob] = useState<ProcessingJob>({
    id: '',
    status: 'idle',
    progress: 0,
    currentStep: 'Ready',
    baseFiles: [],
    errorFiles: []
  });
  const [jobHistory, setJobHistory] = useState<ProcessingJob[]>([]);

  const handleStartProcessing = async () => {
    if (baseFiles.length === 0 || errorFiles.length === 0) {
      toast({
        title: "Missing Files",
        description: "Please upload both base files and error files before processing.",
        variant: "destructive"
      });
      return;
    }

    const jobId = `job_${Date.now()}`;
    const newJob: ProcessingJob = {
      id: jobId,
      status: 'processing',
      progress: 0,
      currentStep: 'Reading Base Files',
      baseFiles: [...baseFiles],
      errorFiles: [...errorFiles],
      startTime: new Date()
    };

    setCurrentJob(newJob);

    try {
      // Simulate processing steps
      await processFiles(newJob);
    } catch (error) {
      const errorJob = {
        ...newJob,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        endTime: new Date()
      };
      setCurrentJob(errorJob);
      setJobHistory(prev => [...prev, errorJob]);
    }
  };

  const processFiles = async (job: ProcessingJob) => {
    const steps = [
      'Reading Base Files',
      'Reading Error Files', 
      'Cleaning SKUs',
      'Generating Cleaned Files'
    ];

    for (let i = 0; i < steps.length; i++) {
      setCurrentJob(prev => ({
        ...prev,
        currentStep: steps[i],
        progress: ((i + 1) / steps.length) * 100
      }));

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Simulate successful completion
    const completedJob: ProcessingJob = {
      ...job,
      status: 'completed',
      progress: 100,
      currentStep: 'Completed',
      endTime: new Date(),
      results: {
        cleanedFiles: baseFiles.map((file, index) => ({
          name: `cleaned_${file.name}`,
          blob: new Blob(['Mock cleaned file content'], { type: 'text/csv' }),
          removedCount: Math.floor(Math.random() * 100),
          remainingCount: Math.floor(Math.random() * 1000) + 500
        })),
        logFiles: baseFiles.map((file, index) => ({
          name: `log_${file.name.replace(/\.[^/.]+$/, '')}.txt`,
          blob: new Blob(['Mock log file content'], { type: 'text/plain' })
        })),
        consolidatedFile: {
          name: 'consolidated_cleaned_data.xlsx',
          blob: new Blob(['Mock consolidated file content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        },
        zipFile: {
          name: `noon_cleaner_results_${Date.now()}.zip`,
          blob: new Blob(['Mock zip file content'], { type: 'application/zip' })
        }
      }
    };

    setCurrentJob(completedJob);
    setJobHistory(prev => [...prev, completedJob]);

    toast({
      title: "Processing Complete",
      description: `Successfully processed ${baseFiles.length} base files and ${errorFiles.length} error files.`
    });
  };

  const handleReset = () => {
    setBaseFiles([]);
    setErrorFiles([]);
    setCurrentJob({
      id: '',
      status: 'idle',
      progress: 0,
      currentStep: 'Ready',
      baseFiles: [],
      errorFiles: []
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Noon File Cleaner</h1>
        <p className="text-muted-foreground">
          Clean your Noon base files by removing SKUs listed in error files
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload & Process
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {currentJob.status === 'idle' ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FileUploadZone
                  title="Upload Base Files"
                  description="Excel or CSV files containing your product data"
                  files={baseFiles}
                  onFilesChange={setBaseFiles}
                  accept=".xlsx,.xls,.csv"
                  multiple
                />
                
                <FileUploadZone
                  title="Upload Error Files"
                  description="Excel or CSV files containing SKUs to remove"
                  files={errorFiles}
                  onFilesChange={setErrorFiles}
                  accept=".xlsx,.xls,.csv"
                  multiple
                />
              </div>

              <div className="flex justify-center space-x-4">
                <Button 
                  onClick={handleStartProcessing}
                  disabled={baseFiles.length === 0 || errorFiles.length === 0}
                  size="lg"
                  className="px-8"
                >
                  Start Processing
                </Button>
                <Button 
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                >
                  Reset
                </Button>
              </div>
            </>
          ) : (
            <ProcessingStatus job={currentJob} />
          )}
        </TabsContent>

        <TabsContent value="results">
          <ResultsDisplay job={currentJob} onReset={handleReset} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryView jobs={jobHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NoonFileCleaner;