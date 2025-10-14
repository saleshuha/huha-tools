import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Database, 
  Upload, 
  Download,
  Trash2, 
  FileSpreadsheet,
  Eye,
  Edit,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";

interface LabelDataset {
  id: string;
  name: string;
  description?: string;
  data: any;
  headers: any;
  row_count: number;
  created_at: string;
  updated_at: string;
}

interface BulkDataManagerProps {
  onDatasetSelect: (datasetId: string | null) => void;
  activeDataset: string | null;
}

export function BulkDataManager({ onDatasetSelect, activeDataset }: BulkDataManagerProps) {
  const [datasets, setDatasets] = useState<LabelDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<{ headers: string[], data: any[] } | null>(null);
  const [newDataset, setNewDataset] = useState({
    name: '',
    description: '',
    data: [] as any[],
    headers: [] as string[]
  });
  const { user } = useUserProfile();

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('label_datasets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDatasets((data as any) || []);
    } catch (error) {
      console.error('Error loading datasets:', error);
      toast.error("Failed to load datasets");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      Papa.parse(file, {
        complete: (results) => {
          const headers = results.data[0] as string[];
          const data = results.data.slice(1) as any[][];
          
          setNewDataset(prev => ({
            ...prev,
            name: prev.name || file.name.replace(/\.[^/.]+$/, ""),
            headers,
            data: data.filter(row => row.some(cell => cell !== ''))
          }));
          toast.success("CSV file parsed successfully!");
        },
        header: false,
        skipEmptyLines: true
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''));
        
        setNewDataset(prev => ({
          ...prev,
          name: prev.name || file.name.replace(/\.[^/.]+$/, ""),
          headers,
          data: rows
        }));
        toast.success("Excel file parsed successfully!");
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Please upload a CSV or Excel file");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const createDataset = async () => {
    if (!user || !newDataset.name.trim() || newDataset.data.length === 0) {
      toast.error("Please provide dataset name and upload data");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('label_datasets')
        .insert([
          {
            user_id: user.id,
            name: newDataset.name.trim(),
            description: newDataset.description.trim() || null,
            headers: newDataset.headers,
            data: newDataset.data,
            row_count: newDataset.data.length
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setDatasets(prev => [data, ...prev]);
      setShowCreateDialog(false);
      setNewDataset({ name: '', description: '', data: [], headers: [] });
      toast.success("Dataset created successfully!");
    } catch (error) {
      console.error('Error creating dataset:', error);
      toast.error("Failed to create dataset");
    }
  };

  const deleteDataset = async (datasetId: string) => {
    try {
      const { error } = await supabase
        .from('label_datasets')
        .delete()
        .eq('id' as any, datasetId as any);

      if (error) throw error;

      setDatasets(prev => prev.filter(d => d.id !== datasetId));
      if (activeDataset === datasetId) {
        onDatasetSelect(null);
      }
      toast.success("Dataset deleted successfully!");
    } catch (error) {
      console.error('Error deleting dataset:', error);
      toast.error("Failed to delete dataset");
    }
  };

  const previewDataset = (dataset: LabelDataset) => {
    setPreviewData({
      headers: dataset.headers,
      data: dataset.data.slice(0, 10) // Show first 10 rows
    });
    setShowPreviewDialog(true);
  };

  const exportDataset = (dataset: LabelDataset) => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      dataset.headers,
      ...dataset.data
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${dataset.name}.xlsx`);
    toast.success("Dataset exported successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Data Management</h2>
          <p className="text-muted-foreground">
            Upload CSV/Excel files for bulk label generation
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Import Data
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Import Bulk Data</DialogTitle>
              <DialogDescription>
                Upload a CSV or Excel file to create a new dataset for bulk label generation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dataset-name">Dataset Name</Label>
                <Input
                  id="dataset-name"
                  value={newDataset.name}
                  onChange={(e) => setNewDataset(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter dataset name..."
                />
              </div>
              <div>
                <Label htmlFor="dataset-description">Description (Optional)</Label>
                <Textarea
                  id="dataset-description"
                  value={newDataset.description}
                  onChange={(e) => setNewDataset(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter dataset description..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Upload File</Label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-primary'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p>Drop the file here...</p>
                  ) : (
                    <div>
                      <p className="text-sm font-medium mb-1">
                        Drag & drop a file here, or click to select
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports CSV, XLS, XLSX files
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {newDataset.data.length > 0 && (
                <div>
                  <Label>Data Preview</Label>
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="text-sm text-muted-foreground mb-2">
                      {newDataset.data.length} rows, {newDataset.headers.length} columns
                    </div>
                    <div className="overflow-x-auto max-h-48">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {newDataset.headers.map((header, index) => (
                              <TableHead key={index} className="text-xs">
                                {header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {newDataset.data.slice(0, 5).map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {row.map((cell: any, cellIndex: number) => (
                                <TableCell key={cellIndex} className="text-xs">
                                  {cell?.toString() || ''}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewDataset({ name: '', description: '', data: [], headers: [] });
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createDataset}
                  disabled={!newDataset.name.trim() || newDataset.data.length === 0}
                >
                  Create Dataset
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Datasets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : datasets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Datasets Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Import your first CSV or Excel file to start creating labels in bulk
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Import First Dataset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((dataset) => (
            <Card 
              key={dataset.id} 
              className={`cursor-pointer transition-all hover:shadow-md animate-fade-in hover-scale ${
                activeDataset === dataset.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onDatasetSelect(dataset.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      {dataset.name}
                    </CardTitle>
                    {dataset.description && (
                      <CardDescription className="mt-1">
                        {dataset.description}
                      </CardDescription>
                    )}
                  </div>
                  {activeDataset === dataset.id && (
                    <Badge variant="default" className="ml-2">Active</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(dataset.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rows:</span>
                    <Badge variant="outline">{dataset.row_count.toLocaleString()}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Columns:</span>
                    <Badge variant="outline">{dataset.headers.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dataset.headers.slice(0, 3).map((header, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {header}
                      </Badge>
                    ))}
                    {dataset.headers.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{dataset.headers.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex justify-between gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => previewDataset(dataset)}
                    className="flex-1"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportDataset(dataset)}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteDataset(dataset.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-5xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Dataset Preview</DialogTitle>
            <DialogDescription>
              Showing first 10 rows of the dataset
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewData.headers.map((header, index) => (
                      <TableHead key={index} className="text-xs font-medium">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.data.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell: any, cellIndex: number) => (
                        <TableCell key={cellIndex} className="text-xs">
                          {cell?.toString() || ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}