import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle, Type, Copy } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface BulkSkuUploadProps {
  inventory: any[];
  onSkuUpdate: (asinSkuPairs: { asin: string; sku: string }[]) => Promise<void>;
}

export function BulkSkuUpload({ inventory, onSkuUpdate }: BulkSkuUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [uploadedData, setUploadedData] = useState<{ asin: string; sku: string }[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [matchResults, setMatchResults] = useState<{
    matched: { asin: string; sku: string; currentSku?: string }[];
    unmatched: { asin: string; sku: string }[];
  }>({ matched: [], unmatched: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [fillOnlyMissing, setFillOnlyMissing] = useState(true);

  const { toast } = useToast();

  const processFile = async (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (fileExtension === 'csv') {
        return new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            complete: (results) => {
              resolve(results.data);
            },
            error: (error) => {
              reject(error);
            }
          });
        });
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(worksheet);
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      throw error;
    }
  };

  const validateAndMapData = (data: any[]) => {
    const mapped: { asin: string; sku: string }[] = [];
    
    for (const row of data) {
      // Try to find ASIN and SKU columns (case-insensitive)
      const asinKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('asin') || key.toLowerCase() === 'asin'
      );
      const skuKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('sku') || key.toLowerCase() === 'sku'
      );

      if (asinKey && skuKey && row[asinKey] && row[skuKey]) {
        mapped.push({
          asin: String(row[asinKey]).trim(),
          sku: String(row[skuKey]).trim()
        });
      }
    }

    if (mapped.length === 0) {
      throw new Error('No valid ASIN and SKU columns found. Please ensure your file has columns named "ASIN" and "SKU".');
    }

    return mapped;
  };

  const parsePastedText = (text: string) => {
    const mapped: { asin: string; sku: string }[] = [];
    const lines = text.trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Try comma first, then tab, then any whitespace
      let parts = line.split(',');
      if (parts.length < 2) {
        parts = line.split('\t');
      }
      if (parts.length < 2) {
        parts = line.split(/\s+/);
      }
      
      if (parts.length >= 2) {
        const asin = parts[0].trim();
        const sku = parts[1].trim();
        
        if (asin && sku) {
          mapped.push({ asin, sku });
        }
      }
    }

    if (mapped.length === 0) {
      throw new Error('No valid ASIN and SKU pairs found. Please ensure your data is in the format: ASIN,SKU (one pair per line).');
    }

    return mapped;
  };

  const matchWithInventory = (asinSkuPairs: { asin: string; sku: string }[]) => {
    const matched: { asin: string; sku: string; currentSku?: string }[] = [];
    const unmatched: { asin: string; sku: string }[] = [];

    for (const pair of asinSkuPairs) {
      const inventoryItem = inventory.find(item => 
        item.asin.toLowerCase() === pair.asin.toLowerCase()
      );

      if (inventoryItem) {
        matched.push({
          ...pair,
          currentSku: inventoryItem.sku || 'Not set'
        });
      } else {
        unmatched.push(pair);
      }
    }

    return { matched, unmatched };
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsProcessing(true);

    try {
      const rawData = await processFile(file) as any[];
      const mappedData = validateAndMapData(rawData);
      const results = matchWithInventory(mappedData);

      setUploadedData(mappedData);
      setMatchResults(results);

      toast({
        title: "File processed successfully",
        description: `Found ${results.matched.length} matches and ${results.unmatched.length} unmatched items`
      });
    } catch (error: any) {
      toast({
        title: "Error processing file",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasteProcess = () => {
    if (!pasteText.trim()) {
      toast({
        title: "No data found",
        description: "Please paste some ASIN and SKU data",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const mappedData = parsePastedText(pasteText);
      const results = matchWithInventory(mappedData);

      setUploadedData(mappedData);
      setMatchResults(results);

      toast({
        title: "Data processed successfully",
        description: `Found ${results.matched.length} matches and ${results.unmatched.length} unmatched items`
      });
    } catch (error: any) {
      toast({
        title: "Error processing data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const missingSkuMatches = matchResults.matched.filter(
    (m) => !m.currentSku || m.currentSku === 'Not set'
  );
  const itemsToUpdate = fillOnlyMissing ? missingSkuMatches : matchResults.matched;

  const handleUpdateSkus = async () => {
    if (itemsToUpdate.length === 0) return;

    setIsProcessing(true);
    try {
      await onSkuUpdate(itemsToUpdate);

      const skippedExisting = matchResults.matched.length - itemsToUpdate.length;
      toast({
        title: "SKUs updated successfully",
        description: `Updated ${itemsToUpdate.length} inventory items${skippedExisting > 0 ? ` · skipped ${skippedExisting} that already had a SKU` : ''}`
      });

      // Reset state and close dialog
      setUploadedData([]);
      setMatchResults({ matched: [], unmatched: [] });
      setPasteText('');
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error updating SKUs",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };


  const resetData = () => {
    setUploadedData([]);
    setMatchResults({ matched: [], unmatched: [] });
    setPasteText('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) resetData();
      setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-2 border-primary bg-background hover:bg-green-500 hover:text-white hover:border-green-500 transition-all">
          <Upload className="w-4 h-4 mr-2" />
          Bulk SKU Update
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk SKU Update
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Upload a CSV/Excel file with "ASIN" and "SKU" columns OR paste data directly</li>
              <li>• ASINs will be matched with your existing inventory</li>
              <li>• SKU values will be updated for matched items</li>
              <li>• Unmatched ASINs will be listed but not processed</li>
            </ul>
          </div>

          {/* Tabs for Upload vs Paste */}
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as 'upload' | 'paste');
            resetData();
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="paste" className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Paste Data
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              {/* File Upload Area */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                {isProcessing ? (
                  <div className="space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-gray-600">Processing file...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      {isDragActive
                        ? 'Drop your file here...'
                        : 'Drag & drop your CSV/Excel file here'}
                    </p>
                    <p className="text-sm text-gray-500">or click to browse</p>
                    <p className="text-xs text-gray-400">Supports .csv, .xlsx, .xls files</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="paste" className="space-y-4">
              {/* Paste Data Area */}
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Supported Formats:
                  </h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>Comma-separated:</strong> ASIN123,SKU456</p>
                    <p><strong>Tab-separated:</strong> ASIN123	SKU456</p>
                    <p><strong>Space-separated:</strong> ASIN123 SKU456</p>
                    <p className="text-xs text-gray-500">One ASIN-SKU pair per line</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paste-data">Paste your ASIN and SKU data here:</Label>
                  <Textarea
                    id="paste-data"
                    placeholder={`B08N5WRWNW,MY-SKU-001
B08N5WRWNX,MY-SKU-002
B08N5WRWNY,MY-SKU-003`}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    className="min-h-32 font-mono text-sm"
                  />
                </div>

                <Button 
                  onClick={handlePasteProcess}
                  disabled={!pasteText.trim() || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Type className="w-4 h-4 mr-2" />
                      Process Pasted Data
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Results */}
          {(matchResults.matched.length > 0 || matchResults.unmatched.length > 0) && (
            <div className="space-y-4">
              {/* Matched Items */}
              {matchResults.matched.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Matched Items ({matchResults.matched.length})
                  </h4>
                  <label className="mb-3 flex items-center gap-2 text-sm text-green-900">
                    <input
                      type="checkbox"
                      checked={fillOnlyMissing}
                      onChange={(e) => setFillOnlyMissing(e.target.checked)}
                      className="h-4 w-4 accent-green-600"
                    />
                    Only add SKU where it's missing ({missingSkuMatches.length} of {matchResults.matched.length}) — don't overwrite existing SKUs
                  </label>

                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-green-200">
                          <th className="text-left p-2">ASIN</th>
                          <th className="text-left p-2">Current SKU</th>
                          <th className="text-left p-2">New SKU</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchResults.matched.map((item, index) => (
                          <tr key={index} className="border-b border-green-100">
                            <td className="p-2 font-mono">{item.asin}</td>
                            <td className="p-2 text-gray-600">{item.currentSku || 'Not set'}</td>
                            <td className="p-2 font-mono text-green-700">{item.sku}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unmatched Items */}
              {matchResults.unmatched.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-3">
                    Unmatched ASINs ({matchResults.unmatched.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {matchResults.unmatched.map((item, index) => (
                        <div key={index} className="flex justify-between p-2 bg-yellow-100 rounded">
                          <span className="font-mono">{item.asin}</span>
                          <span className="text-yellow-700">{item.sku}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          {matchResults.matched.length > 0 && (
            <Button
              onClick={handleUpdateSkus}
              disabled={isProcessing}
            >
              {isProcessing ? 'Updating...' : `Update ${matchResults.matched.length} SKUs`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}