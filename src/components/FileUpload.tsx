import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
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
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  title,
  description,
  accept,
  isTarget = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [pendingWorkbook, setPendingWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { toast } = useToast();

  const processExcelFile = useCallback(async (file: File, selectedSheet?: string, headerRow: number = 1) => {
    return new Promise<ExcelData>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const fileData = e.target?.result;
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
            reject(new Error('Excel file is empty'));
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
        } catch (error) {
          reject(new Error('Failed to parse Excel file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  }, [isTarget]);

  const handleSheetSelection = async (sheetName: string, headerRow: number) => {
    if (!pendingWorkbook || !pendingFile) return;
    
    setShowSheetSelector(false);
    setUploading(true);
    setUploadProgress(90);
    
    try {
      const excelData = await processExcelFile(pendingFile, sheetName, headerRow);
      
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
        description: error instanceof Error ? error.message : "Failed to process Excel file",
        variant: "destructive"
      });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
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
      
      const excelData = await processExcelFile(file);
      
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
        description: error instanceof Error ? error.message : "Failed to process Excel file",
        variant: "destructive"
      });
    }
  }, [onFileUpload, processExcelFile, toast]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
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
              <p className="font-medium">Processing Excel file...</p>
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
                      ? 'Drop your Excel file here...' 
                      : 'Drag & drop an Excel file here, or click to browse'}
                  </p>
                  <p>Supports .xlsx and .xls files (max 10MB)</p>
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
