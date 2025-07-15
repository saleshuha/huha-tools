import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import type { ExcelData } from '@/types/excel';
import { SheetSelector } from './SheetSelector';

interface FileUploadProps {
  onFileUpload: (data: ExcelData) => void;
  title: string;
  description: string;
  accept: string;
  isTarget?: boolean;
  multiple?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUpload, 
  title, 
  description, 
  accept, 
  isTarget = false,
  multiple = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [pendingWorkbook, setPendingWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { toast } = useToast();

  const processFile = useCallback(async (file: File, selectedSheet?: string, headerRow: number = 1) => {
    return new Promise<ExcelData>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const fileData = e.target?.result;
          const fileExtension = file.name.toLowerCase().split('.').pop();
          
          if (fileExtension === 'csv') {
            // Process CSV file
            const csvText = typeof fileData === 'string' ? fileData : new TextDecoder().decode(new Uint8Array(fileData as ArrayBuffer));
            
            // Parse CSV manually (simple parser)
            const lines = csvText.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
              reject(new Error('CSV file is empty'));
              return;
            }
            
            const parseCSVLine = (line: string) => {
              const result = [];
              let current = '';
              let inQuotes = false;
              
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  result.push(current.trim());
                  current = '';
                } else {
                  current += char;
                }
              }
              result.push(current.trim());
              return result;
            };
            
            const jsonData = lines.map(line => parseCSVLine(line));
            
            if (headerRow > jsonData.length) {
              reject(new Error(`Header row ${headerRow} does not exist in the file`));
              return;
            }
            
            const headers = jsonData[headerRow - 1].map((header: any) => 
              header ? String(header).replace(/^"(.*)"$/, '$1').trim() : `Column_${jsonData[headerRow - 1].indexOf(header) + 1}`
            );
            
            const rowData = jsonData.slice(headerRow).map(row => 
              row.map(cell => typeof cell === 'string' ? cell.replace(/^"(.*)"$/, '$1') : cell)
            );
            
            resolve({
              headers,
              data: rowData,
              fileName: file.name,
              sheetNames: ['Sheet1'],
              selectedSheet: 'Sheet1'
            });
          } else {
            // Process Excel file
            const workbook = XLSX.read(fileData, { 
              type: 'binary', 
              cellStyles: true,
              cellFormula: true,
              cellHTML: false,
              cellNF: true
            });
            
            // If it's a target file and has multiple sheets, show sheet selector
            if (isTarget && workbook.SheetNames.length > 1 && !selectedSheet) {
              setPendingWorkbook(workbook);
              setPendingFile(file);
              setShowSheetSelector(true);
              setUploading(false);
              setUploadProgress(0);
              return;
            }
            
            const sheetName = selectedSheet || workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to array of arrays
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            if (jsonData.length === 0) {
              reject(new Error('File is empty'));
              return;
            }

            if (headerRow > jsonData.length) {
              reject(new Error(`Header row ${headerRow} does not exist in the sheet`));
              return;
            }

            // Header row contains headers (adjust for 0-based index)
            const headers = jsonData[headerRow - 1].map((header: any) => 
              header ? String(header).trim() : `Column_${jsonData[headerRow - 1].indexOf(header) + 1}`
            );
            
            // Rest of the rows contain data (starting from the row after headers)
            const rowData = jsonData.slice(headerRow);
            
            resolve({
              headers,
              data: rowData,
              fileName: file.name,
              sheetNames: workbook.SheetNames,
              selectedSheet: sheetName,
              originalWorkbook: isTarget ? workbook : undefined // Store original workbook for target files
            });
          }
        } catch (error) {
          reject(new Error(`Failed to parse ${file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'Excel'} file`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  }, [isTarget]);

  const handleSheetSelection = async (sheetName: string, headerRow: number) => {
    if (!pendingWorkbook || !pendingFile) return;
    
    setShowSheetSelector(false);
    setUploading(true);
    setUploadProgress(90);
    
    try {
      const excelData = await processFile(pendingFile, sheetName, headerRow);
      
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploadedFile(pendingFile.name);
        onFileUpload(excelData);
        setUploading(false);
        setUploadProgress(0);
        setPendingWorkbook(null);
        setPendingFile(null);
      }, 500);
      
    } catch (error) {
      setUploading(false);
      setUploadProgress(0);
      setPendingWorkbook(null);
      setPendingFile(null);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsUploading(true);
    
    for (const file of acceptedFiles) {
      setUploading(true);
      setUploadProgress(0);
      
      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);
        
        const excelData = await processFile(file);
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        setTimeout(() => {
          setUploadedFile(file.name);
          onFileUpload(excelData);
          setUploading(false);
          setUploadProgress(0);
        }, 500);
        
      } catch (error) {
        setUploading(false);
        setUploadProgress(0);
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Failed to process file",
          variant: "destructive"
        });
      }
    }
    
    setIsUploading(false);
  }, [onFileUpload, processFile, toast, setIsUploading]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: multiple ? undefined : 1,
    multiple,
    disabled: isUploading,
    maxSize: 1024 * 1024 * 1024 // 1GB
  });

  const hasError = fileRejections.length > 0;

  return (
    <>
      <SheetSelector
        isOpen={showSheetSelector}
        onClose={() => {
          setShowSheetSelector(false);
          setPendingWorkbook(null);
          setPendingFile(null);
        }}
        onSelectSheet={handleSheetSelection}
        sheetNames={pendingWorkbook?.SheetNames || []}
        fileName={pendingFile?.name || ''}
      />
    <Card className="p-6">
      <div
        {...getRootProps()}
        className={`upload-zone cursor-pointer text-center ${
          isDragActive ? 'drag-over' : ''
        } ${hasError ? 'border-destructive bg-destructive/5' : ''}`}
      >
        <input {...getInputProps()} data-target={isTarget} />
        
        {uploading ? (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary animate-bounce" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">Processing file...</p>
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
              <p className="text-sm text-muted-foreground">{uploadProgress}% complete</p>
            </div>
          </div>
        ) : uploadedFile ? (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="font-medium text-success">File uploaded successfully!</p>
              <p className="text-sm text-muted-foreground mt-1">{uploadedFile}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setUploadedFile(null);
              }}
            >
              Upload Different File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
              hasError 
                ? 'bg-destructive/10 text-destructive' 
                : isDragActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-muted text-muted-foreground'
            }`}>
              {hasError ? (
                <AlertCircle className="w-6 h-6" />
              ) : accept.includes('csv') ? (
                <FileText className="w-6 h-6" />
              ) : (
                <FileSpreadsheet className="w-6 h-6" />
              )}
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-muted-foreground mb-4">{description}</p>
              
              {hasError ? (
                <div className="text-destructive text-sm space-y-1">
                  {fileRejections.map(({ file, errors }) => (
                    <div key={file.name}>
                      <p className="font-medium">{file.name}</p>
                      {errors.map(error => (
                        <p key={error.code}>{error.message}</p>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    {isDragActive 
                      ? `Drop your file${multiple ? 's' : ''} here...` 
                      : `Drag & drop file${multiple ? 's' : ''} here, or click to browse`}
                  </p>
                  <p>Supports .xlsx, .xls, and .csv files (max 1GB){multiple ? ' - Multiple files allowed' : ''}</p>
                </div>
              )}
            </div>
            
            {!hasError && (
              <Button className="btn-gradient">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
    </>
  );
};
