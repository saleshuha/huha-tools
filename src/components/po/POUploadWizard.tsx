import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { POColumnMapping } from "@/components/po/POColumnMapping";
import { usePOUploadJobs, type POUploadJob } from "@/hooks/usePOUploadJobs";
import { usePOOrders } from "@/hooks/usePOOrders";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";

interface ParsedFile {
  file: File;
  headers: string[];
  data: any[];
  preview: any[];
}

interface POUploadWizardProps {
  onUploadComplete?: () => void;
}

export const POUploadWizard = ({ onUploadComplete }: POUploadWizardProps) => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'mapping' | 'processing'>('upload');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const { createJob, currentJob, subscribeToJob } = usePOUploadJobs();
  const { processPOFiles } = usePOOrders();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setIsValidating(true);
      
      const result = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: resolve,
          error: reject,
        });
      });

      if (result.errors.length > 0) {
        setValidationErrors(result.errors.map(err => err.message));
        return;
      }

      const parsed: ParsedFile = {
        file,
        headers: result.meta.fields || [],
        data: result.data,
        preview: result.data.slice(0, 5) // First 5 rows for preview
      };

      setParsedFile(parsed);
      setCurrentStep('preview');
      setValidationErrors([]);
    } catch (error) {
      console.error('Parse error:', error);
      setValidationErrors(['Failed to parse file. Please check the format.']);
    } finally {
      setIsValidating(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: isValidating
  });

  const handleMappingComplete = useCallback(async (mapped: any[]) => {
    if (!parsedFile) return;

    setMappedData(mapped);
    setCurrentStep('processing');

    // Create upload job
    const job = await createJob(
      parsedFile.file.name,
      parsedFile.file.size,
      mapped.length
    );

    if (!job) return;

    // Subscribe to job updates
    const unsubscribe = subscribeToJob(job.id, (updatedJob: POUploadJob) => {
      if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
        unsubscribe();
        if (updatedJob.status === 'completed' && onUploadComplete) {
          onUploadComplete();
        }
      }
    });

    // Process the files with background processing
    try {
      // Start background processing
      const { error: functionError } = await supabase.functions.invoke('process-po-upload', {
        body: {
          jobId: job.id,
          mappedData: mapped
        }
      });

      if (functionError) {
        console.error('Function invocation error:', functionError);
        throw functionError;
      }

      console.log('Background processing started successfully');
    } catch (error) {
      console.error('Processing error:', error);
      // Fallback to client-side processing if edge function fails
      await processPOFiles(mapped, [], job.id);
    }
  }, [parsedFile, createJob, subscribeToJob, processPOFiles, onUploadComplete]);

  const resetWizard = useCallback(() => {
    setCurrentStep('upload');
    setParsedFile(null);
    setMappedData([]);
    setValidationErrors([]);
  }, []);

  const renderUploadStep = () => (
    <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
      <CardContent className="pt-8">
        <div {...getRootProps()} className="cursor-pointer">
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            {isValidating ? (
              <>
                <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                <p className="text-lg font-medium">Validating file...</p>
              </>
            ) : (
              <>
                <Upload className={`h-12 w-12 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">
                    {isDragActive ? 'Drop your PO file here' : 'Upload PO File'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop or click to browse (.csv, .xlsx, .xls)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderPreviewStep = () => {
    if (!parsedFile) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              File Preview: {parsedFile.file.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">File Size</p>
                <p className="font-medium">{(parsedFile.file.size / 1024).toFixed(1)} KB</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Rows</p>
                <p className="font-medium">{parsedFile.data.length}</p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2">
                <p className="text-sm font-medium">Preview (First 5 rows)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      {parsedFile.headers.map((header, idx) => (
                        <th key={idx} className="px-4 py-2 text-left text-sm font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedFile.preview.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {parsedFile.headers.map((header, colIdx) => (
                          <td key={colIdx} className="px-4 py-2 text-sm">
                            {row[header]?.toString().substring(0, 50)}
                            {row[header]?.toString().length > 50 ? '...' : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={resetWizard}>
                Upload Different File
              </Button>
              <Button onClick={() => setCurrentStep('mapping')}>
                Continue to Mapping
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMappingStep = () => {
    if (!parsedFile) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
          </CardHeader>
          <CardContent>
            <POColumnMapping
              files={[{
                file: parsedFile.file,
                headers: parsedFile.headers,
                data: [parsedFile.headers, ...parsedFile.data.map(row => 
                  parsedFile.headers.map(header => String(row[header] || ''))
                )]
              }]}
              onMappingComplete={handleMappingComplete}
              onBack={() => setCurrentStep('preview')}
              isLoading={false}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderProcessingStep = () => {
    if (!currentJob) return null;

    const getStatusBadge = () => {
      switch (currentJob.status) {
        case 'pending':
          return <Badge variant="secondary">Pending</Badge>;
        case 'processing':
          return <Badge variant="default">Processing</Badge>;
        case 'completed':
          return <Badge variant="outline" className="border-green-500 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>;
        case 'failed':
          return <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>;
        default:
          return <Badge variant="secondary">{currentJob.status}</Badge>;
      }
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Processing Upload
              {getStatusBadge()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{currentJob.progress_percentage}%</span>
              </div>
              <Progress value={currentJob.progress_percentage} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{currentJob.success_rows}</p>
                <p className="text-sm text-muted-foreground">Success</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{currentJob.error_rows}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{currentJob.processed_rows}</p>
                <p className="text-sm text-muted-foreground">Total Processed</p>
              </div>
            </div>

            {currentJob.error_message && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{currentJob.error_message}</AlertDescription>
              </Alert>
            )}

            {currentJob.status === 'completed' && (
              <div className="flex justify-center">
                <Button onClick={resetWizard}>
                  Upload Another File
                </Button>
              </div>
            )}

            {currentJob.status === 'failed' && (
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={resetWizard}>
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={currentStep} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" disabled={currentStep !== 'upload'}>
            1. Upload
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={currentStep === 'upload'}>
            2. Preview
          </TabsTrigger>
          <TabsTrigger value="mapping" disabled={!['mapping', 'processing'].includes(currentStep)}>
            3. Mapping
          </TabsTrigger>
          <TabsTrigger value="processing" disabled={currentStep !== 'processing'}>
            4. Processing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">{renderUploadStep()}</TabsContent>
        <TabsContent value="preview">{renderPreviewStep()}</TabsContent>
        <TabsContent value="mapping">{renderMappingStep()}</TabsContent>
        <TabsContent value="processing">{renderProcessingStep()}</TabsContent>
      </Tabs>
    </div>
  );
};