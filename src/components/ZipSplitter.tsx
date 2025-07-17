import { useState } from 'react';
import { Upload, Archive, Split, FileText, Download, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import JSZip from 'jszip';

interface CSVFile {
  name: string;
  content: string;
  size: number;
}

type SplitMethod = 'size' | 'files';
type CompressionLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const ZipSplitter = () => {
  const { toast } = useToast();
  const [zipFiles, setZipFiles] = useState<File[]>([]);
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('size');
  const [sizeLimit, setSizeLimit] = useState<number>(20); // MB
  const [filesLimit, setFilesLimit] = useState<number>(5);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>(6);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const zipFilesArray = Array.from(files);
    
    // Validate all files are ZIP files
    const invalidFiles = zipFilesArray.filter(file => !file.name.toLowerCase().endsWith('.zip'));
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload only ZIP files",
        variant: "destructive"
      });
      return;
    }

    setZipFiles(zipFilesArray);
    setIsProcessing(true);
    setProgress(10);

    try {
      const allCsvData: CSVFile[] = [];
      const totalFiles = zipFilesArray.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = zipFilesArray[i];
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        
        setProgress(10 + (i / totalFiles) * 80);

        for (const [filename, zipEntry] of Object.entries(zipContent.files)) {
          if (!zipEntry.dir && filename.toLowerCase().endsWith('.csv')) {
            const content = await zipEntry.async('text');
            const size = new Blob([content]).size;
            // Add source zip name to CSV name to avoid conflicts
            const uniqueName = `${file.name.replace('.zip', '')}_${filename}`;
            allCsvData.push({
              name: uniqueName,
              content,
              size
            });
          }
        }
      }

      setCsvFiles(allCsvData);
      setProgress(100);
      
      toast({
        title: "ZIP files processed",
        description: `Found ${allCsvData.length} CSV files in ${totalFiles} ZIP files`,
      });
    } catch (error) {
      console.error('Error processing ZIP files:', error);
      toast({
        title: "Processing error",
        description: "Failed to process ZIP files. Please try again.",
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
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: compressionLevel
      }
    });
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
          Upload multiple ZIP files containing CSV files and split them into smaller ZIP files based on size or file count limits
        </p>
      </div>

      <div className="grid gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload ZIP Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="zip-upload">Select ZIP Files</Label>
                <Input
                  id="zip-upload"
                  type="file"
                  accept=".zip"
                  multiple
                  onChange={handleZipUpload}
                  disabled={isProcessing}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can select multiple ZIP files at once
                </p>
              </div>
              
              {isProcessing && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Processing ZIP files...</div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {zipFiles.length > 0 && csvFiles.length > 0 && (
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">Files Found</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>ZIP Files: {zipFiles.length}</div>
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

                <div>
                  <Label htmlFor="compression-level">Compression Level</Label>
                  <Select value={compressionLevel.toString()} onValueChange={(value) => setCompressionLevel(Number(value) as CompressionLevel)}>
                    <SelectTrigger className="mt-2 w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Fastest (Low compression)</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6 - Balanced (Default)</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="9">9 - Best compression (Slowest)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher levels provide better compression but take longer to process
                  </p>
                </div>
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