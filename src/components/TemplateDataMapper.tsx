import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SimpleFileUpload } from '@/components/template/SimpleFileUpload';
import { TemplateSelector } from '@/components/template/TemplateSelector';
import { MappingPreview } from '@/components/template/MappingPreview';
import { ExportSizeDialog } from '@/components/template/ExportSizeDialog';
import { ExcelData, ColumnMapping } from '@/types/excel';
import { FileTemplate } from '@/types/template';
import { useExcelExport } from '@/hooks/useExcelExport';
import { useTemplateMapping } from '@/hooks/useTemplateMapping';
import { parseFileSimply } from '@/components/SimpleFileParser';
import { Upload, Download, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const TemplateDataMapper = () => {
  const [baseFiles, setBaseFiles] = useState<ExcelData[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FileTemplate | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  const { toast } = useToast();
  const { exportMappedData } = useExcelExport();
  const { generateMappings } = useTemplateMapping();

  const handleFileUpload = async (files: File[]) => {
    setIsProcessing(true);
    try {
      // Check file sizes (1GB = 1024 * 1024 * 1024 bytes)
      const maxSize = 1024 * 1024 * 1024; // 1GB
      const oversizedFiles = files.filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        toast({
          title: "File size exceeded",
          description: `Files larger than 1GB are not supported: ${oversizedFiles.map(f => f.name).join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      const processedFiles = await Promise.all(
        files.map(async (file) => {
          const data = await parseFileSimply(file);
          const headers = data.length > 0 ? Object.keys(data[0]) : [];
          return {
            headers,
            data: data.map(row => headers.map(header => row[header] || '')),
            fileName: file.name,
          } as ExcelData;
        })
      );
      
      setBaseFiles(processedFiles);
      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) processed successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process uploaded files",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTemplateSelect = (template: FileTemplate) => {
    setSelectedTemplate(template);
    
    // Auto-generate mappings if we have base files
    if (baseFiles.length > 0) {
      const sourceHeaders = baseFiles.flatMap(file => file.headers);
      const uniqueSourceHeaders = [...new Set(sourceHeaders)];
      const autoMappings = generateMappings(uniqueSourceHeaders, template.headers);
      setMappings(autoMappings);
    }
  };

  const handleMappingChange = (sourceColumn: string, targetColumn: string) => {
    setMappings(prev => ({
      ...prev,
      [sourceColumn]: targetColumn
    }));
  };

  const handleExport = async (maxRows?: number) => {
    if (!selectedTemplate || baseFiles.length === 0) {
      toast({
        title: "Cannot export",
        description: "Please upload files and select a template",
        variant: "destructive"
      });
      return;
    }

    console.log("🔍 Export Debug Info:", {
      selectedTemplate: selectedTemplate.name,
      templateHeaders: selectedTemplate.headers,
      defaultValues: selectedTemplate.defaultValues,
      mappings: mappings,
      baseFilesCount: baseFiles.length,
      firstBaseFileHeaders: baseFiles[0]?.headers
    });

    // Combine all base files into one dataset
    const combinedData: ExcelData = {
      headers: selectedTemplate.headers,
      data: [],
      fileName: `${selectedTemplate.name}_export`,
    };

    // Process each base file and merge the data
    baseFiles.forEach((baseFile, fileIndex) => {
      console.log(`🔍 Processing file ${fileIndex + 1}:`, baseFile.fileName);
      
      baseFile.data.forEach((sourceRow, rowIndex) => {
        const targetRow = new Array(selectedTemplate.headers.length).fill('');
        
        // Apply mappings from source to target
        Object.entries(mappings).forEach(([sourceCol, targetCol]) => {
          const sourceIndex = baseFile.headers.indexOf(sourceCol);
          const targetIndex = selectedTemplate.headers.indexOf(targetCol);
          
          if (sourceIndex !== -1 && targetIndex !== -1) {
            const value = sourceRow[sourceIndex];
            targetRow[targetIndex] = value !== undefined ? String(value) : '';
            
            if (rowIndex === 0) {
              console.log(`🔍 Mapping: ${sourceCol} -> ${targetCol}`, {
                sourceIndex,
                targetIndex,
                value: value
              });
            }
          }
        });
        
        // Apply default values for ALL columns that don't have mapped values
        if (selectedTemplate.defaultValues) {
          selectedTemplate.headers.forEach((header, index) => {
            // Only apply default if the field is empty (including empty strings)
            if (!targetRow[index] || targetRow[index] === '') {
              const defaultValue = selectedTemplate.defaultValues?.[header];
              if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
                targetRow[index] = String(defaultValue);
                
                if (rowIndex === 0) {
                  console.log(`🔍 Applied default for ${header}:`, defaultValue);
                }
              }
            }
          });
        }
        
        if (rowIndex === 0) {
          console.log("🔍 First target row:", targetRow);
        }
        
        combinedData.data.push(targetRow);
      });
    });

    // Limit rows if specified
    if (maxRows && maxRows < combinedData.data.length) {
      combinedData.data = combinedData.data.slice(0, maxRows);
      combinedData.fileName += `_${maxRows}rows`;
    }

    console.log("🔍 Final combined data:", {
      headers: combinedData.headers,
      dataRowsCount: combinedData.data.length,
      firstDataRow: combinedData.data[0]
    });

    await exportMappedData(combinedData, { headers: selectedTemplate.headers, data: [], fileName: selectedTemplate.name }, mappings);
  };

  const handleExportClick = () => {
    const totalRows = baseFiles.reduce((sum, file) => sum + file.data.length, 0);
    if (totalRows > 10000) {
      setShowExportDialog(true);
    } else {
      handleExport();
    }
  };

  const mappingCoverage = selectedTemplate 
    ? (Object.keys(mappings).length / selectedTemplate.headers.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Step 1: Upload Base Files */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Step 1: Upload Base Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleFileUpload
            onFilesSelected={handleFileUpload}
            accept=".csv,.xlsx,.xls"
            multiple
            disabled={isProcessing}
          />
          
          {baseFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">Uploaded Files:</h4>
              {baseFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">{file.fileName}</span>
                  <Badge variant="secondary">{file.headers.length} columns</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Select Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Step 2: Select Target Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateSelector
            onTemplateSelect={handleTemplateSelect}
            selectedTemplate={selectedTemplate}
          />
        </CardContent>
      </Card>

      {/* Step 3: Review Mappings & Export */}
      {selectedTemplate && baseFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Step 3: Review Mappings & Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Mapping Coverage: {mappingCoverage.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {Object.keys(mappings).length} of {selectedTemplate.headers.length} columns mapped
                </p>
              </div>
              <Badge variant={mappingCoverage > 80 ? "default" : "secondary"}>
                {mappingCoverage > 80 ? "Good Coverage" : "Needs Review"}
              </Badge>
            </div>

            <MappingPreview
              sourceHeaders={baseFiles.flatMap(file => file.headers)}
              targetHeaders={selectedTemplate.headers}
              mappings={mappings}
              onMappingChange={handleMappingChange}
            />

            <div className="flex gap-4 pt-4">
              <Button 
                onClick={handleExportClick}
                className="flex-1"
                disabled={Object.keys(mappings).length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Mapped Data ({baseFiles.reduce((sum, file) => sum + file.data.length, 0).toLocaleString()} rows)
              </Button>
            </div>
            
            <ExportSizeDialog
              open={showExportDialog}
              onOpenChange={setShowExportDialog}
              totalRows={baseFiles.reduce((sum, file) => sum + file.data.length, 0)}
              onExport={handleExport}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};