import { useState } from 'react';
import { Upload, Archive, Split, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import JSZip from 'jszip';

interface CSVFile {
  name: string;
  content: string;
  size: number;
}

type SplitMethod = 'size' | 'files';

export const ZipSplitter = () => {
  const { toast } = useToast();
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('size');
  const [sizeLimit, setSizeLimit] = useState<number>(50); // MB
  const [filesLimit, setFilesLimit] = useState<number>(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a ZIP file",
        variant: "destructive"
      });
      return;
    }

    setZipFile(file);
    setIsProcessing(true);
    setProgress(10);

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      const csvData: CSVFile[] = [];

      setProgress(30);

      for (const [filename, zipEntry] of Object.entries(zipContent.files)) {
        if (!zipEntry.dir && filename.toLowerCase().endsWith('.csv')) {
          const content = await zipEntry.async('text');
          const size = new Blob([content]).size;
          csvData.push({
            name: filename,
            content,
            size
          });
        }
      }

      setCsvFiles(csvData);
      setProgress(100);
      
      toast({
        title: "ZIP file processed",
        description: `Found ${csvData.length} CSV files in the ZIP`,
      });
    } catch (error) {
      console.error('Error processing ZIP file:', error);
      toast({
        title: "Processing error",
        description: "Failed to process ZIP file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getFileSizeInMB = (bytes: number): number => {
    return bytes / (1024 * 1024);
  };

  const formatFileSize = (bytes: number): string => {
    const mb = getFileSizeInMB(bytes);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const splitZipsBySize = async () => {
    const zipPromises: Promise<void>[] = [];
    let zipCount = 1;
    let currentZip = new JSZip();
    let currentSize = 0;
    const limitBytes = sizeLimit * 1024 * 1024;

    for (const csvFile of csvFiles) {
      // If adding this file would exceed the limit, create a new zip
      if (currentSize + csvFile.size > limitBytes && Object.keys(currentZip.files).length > 0) {
        zipPromises.push(downloadZip(currentZip, `split_${zipCount}.zip`));
        zipCount++;
        currentZip = new JSZip();
        currentSize = 0;
      }

      currentZip.file(csvFile.name, csvFile.content);
      currentSize += csvFile.size;
    }

    // Download final zip if it has files
    if (Object.keys(currentZip.files).length > 0) {
      zipPromises.push(downloadZip(currentZip, `split_${zipCount}.zip`));
    }

    await Promise.all(zipPromises);
    return zipCount;
  };

  const splitZipsByFiles = async () => {
    const zipPromises: Promise<void>[] = [];
    let zipCount = 1;
    let currentZip = new JSZip();
    let currentFileCount = 0;

    for (const csvFile of csvFiles) {
      // If adding this file would exceed the file limit, create a new zip
      if (currentFileCount >= filesLimit) {
        zipPromises.push(downloadZip(currentZip, `split_${zipCount}.zip`));
        zipCount++;
        currentZip = new JSZip();
        currentFileCount = 0;
      }

      currentZip.file(csvFile.name, csvFile.content);
      currentFileCount++;
    }

    // Download final zip if it has files
    if (Object.keys(currentZip.files).length > 0) {
      zipPromises.push(downloadZip(currentZip, `split_${zipCount}.zip`));
    }

    await Promise.all(zipPromises);
    return zipCount;
  };

  const downloadZip = async (zip: JSZip, fileName: string): Promise<void> => {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(zipBlob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    }
  };

  const handleSplitZip = async () => {
    if (csvFiles.length === 0) {
      toast({
        title: "No files to split",
        description: "Please upload a ZIP file first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      let zipCount = 0;
      
      if (splitMethod === 'size') {
        setProgress(20);
        zipCount = await splitZipsBySize();
      } else {
        setProgress(20);
        zipCount = await splitZipsByFiles();
      }

      setProgress(100);

      toast({
        title: "ZIP splitting completed",
        description: `Created ${zipCount} ZIP files based on ${splitMethod === 'size' ? 'size limit' : 'file count limit'}`,
      });
    } catch (error) {
      console.error('Error splitting ZIP:', error);
      toast({
        title: "Split error",
        description: "Failed to split ZIP file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalSize = csvFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Archive className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Zip Splitter</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Upload a ZIP file containing multiple CSV files and split it into smaller ZIP files based on size or file count limits
        </p>
      </div>

      <div className="grid gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload ZIP File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="zip-upload">Select ZIP File</Label>
                <Input
                  id="zip-upload"
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  disabled={isProcessing}
                  className="mt-2"
                />
              </div>
              
              {isProcessing && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Processing ZIP file...</div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {zipFile && csvFiles.length > 0 && (
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">Files Found</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>ZIP File: {zipFile.name}</div>
                    <div>CSV Files: {csvFiles.length}</div>
                    <div>Total Size: {formatFileSize(totalSize)}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Split Configuration */}
        {csvFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Split className="h-5 w-5" />
                Split Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Split Method</Label>
                  <RadioGroup
                    value={splitMethod}
                    onValueChange={(value) => setSplitMethod(value as SplitMethod)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="size" id="size" />
                      <Label htmlFor="size">Split by Size Limit</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="files" id="files" />
                      <Label htmlFor="files">Split by File Count</Label>
                    </div>
                  </RadioGroup>
                </div>

                {splitMethod === 'size' && (
                  <div>
                    <Label htmlFor="size-limit">Size Limit (MB)</Label>
                    <Input
                      id="size-limit"
                      type="number"
                      value={sizeLimit}
                      onChange={(e) => setSizeLimit(Number(e.target.value))}
                      min={1}
                      max={1000}
                      className="mt-2 w-32"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum size per ZIP file in megabytes
                    </p>
                  </div>
                )}

                {splitMethod === 'files' && (
                  <div>
                    <Label htmlFor="files-limit">Files per ZIP</Label>
                    <Input
                      id="files-limit"
                      type="number"
                      value={filesLimit}
                      onChange={(e) => setFilesLimit(Number(e.target.value))}
                      min={1}
                      max={csvFiles.length}
                      className="mt-2 w-32"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Number of CSV files per ZIP file
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Button */}
        {csvFiles.length > 0 && (
          <div className="flex justify-center">
            <Button
              onClick={handleSplitZip}
              disabled={isProcessing}
              size="lg"
              className="min-w-48"
            >
              <Download className="h-4 w-4 mr-2" />
              {isProcessing ? "Processing..." : "Split & Download"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};