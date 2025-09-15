import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { ProductImageManager } from '@/components/ProductImageManager';
import { UnifiedAsinManager } from '@/components/UnifiedAsinManager';
import { useProductImages } from '@/hooks/useProductImages';
import { useToast } from '@/hooks/use-toast';
import { Upload, Copy, Image as ImageIcon, Plus, FileUp, Package } from 'lucide-react';

export default function AmazonImageUploader() {
  const [bulkData, setBulkData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({
    total: 0,
    processed: 0,
    errors: 0,
    currentItem: ''
  });
  const { addProductImage } = useProductImages();
  const { toast } = useToast();

  const handleBulkPaste = async () => {
    if (!bulkData.trim()) {
      toast({
        title: "No Data",
        description: "Please paste your data first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    const lines = bulkData.trim().split('\n').filter(line => line.trim());
    
    // Initialize progress
    setProgress({
      total: lines.length,
      processed: 0,
      errors: 0,
      currentItem: ''
    });

    try {
      let processed = 0;
      let errors = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          errors++;
          setProgress(prev => ({ 
            ...prev, 
            processed: processed + errors,
            errors
          }));
          continue;
        }

        // Support multiple formats:
        // Format 1: ASIN,URL
        // Format 2: ASIN|URL  
        // Format 3: ASIN URL (space separated)
        // Format 4: ASIN\tURL (tab separated)
        let asin = '';
        let imageUrl = '';

        if (trimmedLine.includes(',')) {
          [asin, imageUrl] = trimmedLine.split(',').map(s => s.trim());
        } else if (trimmedLine.includes('|')) {
          [asin, imageUrl] = trimmedLine.split('|').map(s => s.trim());
        } else if (trimmedLine.includes('\t')) {
          [asin, imageUrl] = trimmedLine.split('\t').map(s => s.trim());
        } else if (trimmedLine.includes(' ')) {
          const parts = trimmedLine.split(' ');
          asin = parts[0].trim();
          imageUrl = parts.slice(1).join(' ').trim();
        } else {
          errors++;
          setProgress(prev => ({ 
            ...prev, 
            processed: processed + errors,
            errors,
            currentItem: `Invalid format: ${trimmedLine.substring(0, 20)}...`
          }));
          continue;
        }

        if (!asin || !imageUrl) {
          errors++;
          setProgress(prev => ({ 
            ...prev, 
            processed: processed + errors,
            errors,
            currentItem: `Missing data: ${trimmedLine.substring(0, 20)}...`
          }));
          continue;
        }

        // Validate URL format
        try {
          new URL(imageUrl);
        } catch {
          errors++;
          setProgress(prev => ({ 
            ...prev, 
            processed: processed + errors,
            errors,
            currentItem: `Invalid URL: ${asin}`
          }));
          continue;
        }

        // Update progress with current item
        setProgress(prev => ({ 
          ...prev, 
          currentItem: `Processing: ${asin}`
        }));

        try {
          await addProductImage.mutateAsync({
            asin,
            imageUrl: imageUrl,
            imageName: `Image for ${asin}`
          });
          processed++;
          
          // Update progress after successful processing
          setProgress(prev => ({ 
            ...prev, 
            processed: processed + errors,
            currentItem: `Saved: ${asin}`
          }));

          // Small delay to make progress visible
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          errors++;
          setProgress(prev => ({ 
            ...prev, 
            processed: processed + errors,
            errors,
            currentItem: `Failed: ${asin}`
          }));
        }
      }

      toast({
        title: "Bulk Upload Complete",
        description: `Processed: ${processed} images, Errors: ${errors}`,
        variant: processed > 0 ? "default" : "destructive"
      });

      if (processed > 0) {
        setBulkData('');
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to process bulk data",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      // Reset progress after a delay
      setTimeout(() => {
        setProgress({ total: 0, processed: 0, errors: 0, currentItem: '' });
      }, 2000);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && file.type !== 'text/plain') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV or TXT file",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const text = await file.text();
      setBulkData(text);
      toast({
        title: "File Loaded",
        description: `Loaded ${text.split('\n').length} lines from ${file.name}`,
      });
    } catch (error) {
      toast({
        title: "File Error",
        description: "Failed to read file",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<ImageIcon className="w-5 h-5 text-primary-foreground" />}
          title="Amazon Image Uploader"
          subtitle="Manage product images for Amazon ASINs with bulk upload capabilities"
          badges={[
            {
              label: "Image Management",
              variant: "secondary" as const,
              className: "bg-blue-500/20 text-blue-700 dark:text-blue-300"
            }
          ]}
          className="mb-8"
        />

        <div className="container mx-auto">
          <Tabs defaultValue="bulk" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12 bg-gradient-subtle rounded-xl shadow-elegant p-1 border border-border/20">
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Bulk Upload
              </TabsTrigger>
              <TabsTrigger value="asin-manager" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                ASIN Management
              </TabsTrigger>
              <TabsTrigger value="image-manager" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Image Manager
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bulk" className="mt-6">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Bulk Image Upload
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="file-upload" className="text-sm font-medium">
                          Upload CSV/TXT File
                        </Label>
                        <div className="mt-2">
                          <Input
                            id="file-upload"
                            type="file"
                            accept=".csv,.txt"
                            onChange={handleFileUpload}
                            className="cursor-pointer"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Upload a CSV or TXT file with ASIN and image URL pairs
                          </p>
                        </div>
                      </div>

                      <div className="text-center text-muted-foreground">
                        <span className="text-sm">OR</span>
                      </div>

                      <div>
                        <Label htmlFor="bulk-data" className="text-sm font-medium">
                          Paste Data
                        </Label>
                        <Textarea
                          id="bulk-data"
                          placeholder="Paste your data here. Supported formats:
ASIN,ImageURL
ASIN|ImageURL  
ASIN ImageURL
ASIN	ImageURL (tab separated)

Example:
B07XYZ123,https://example.com/image1.jpg
B08ABC456|https://example.com/image2.jpg
B09DEF789 https://example.com/image3.jpg"
                          value={bulkData}
                          onChange={(e) => setBulkData(e.target.value)}
                          className="h-40 resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports comma, pipe, space, or tab separated values
                        </p>
                      </div>

                      <Button 
                        onClick={handleBulkPaste}
                        disabled={!bulkData.trim() || isProcessing}
                        className="w-full"
                      >
                        {isProcessing ? (
                          <>
                            <Upload className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Upload Images
                          </>
                        )}
                      </Button>
                      
                      {/* Progress Bar */}
                      {isProcessing && progress.total > 0 && (
                        <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-blue-800 dark:text-blue-200">
                              Processing Images
                            </span>
                            <span className="text-blue-600 dark:text-blue-300">
                              {progress.processed} / {progress.total} 
                              {progress.errors > 0 && (
                                <span className="text-red-600 dark:text-red-400 ml-2">
                                  ({progress.errors} errors)
                                </span>
                              )}
                            </span>
                          </div>
                          
                          <Progress 
                            value={(progress.processed / progress.total) * 100} 
                            className="h-3 bg-blue-100 dark:bg-blue-900"
                          />
                          
                          {progress.currentItem && (
                            <div className="text-xs text-blue-700 dark:text-blue-300 truncate">
                              {progress.currentItem}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
                            <span>
                              Success: {progress.processed - progress.errors}
                            </span>
                            <span>
                              {Math.round((progress.processed / progress.total) * 100)}% Complete
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h3 className="font-medium text-sm mb-2">Supported Formats:</h3>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• <code>ASIN,ImageURL</code> - Comma separated</li>
                        <li>• <code>ASIN|ImageURL</code> - Pipe separated</li>
                        <li>• <code>ASIN ImageURL</code> - Space separated</li>
                        <li>• <code>ASIN	ImageURL</code> - Tab separated</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="asin-manager" className="mt-6">
              <UnifiedAsinManager />
            </TabsContent>

            <TabsContent value="image-manager" className="mt-6">
              <ProductImageManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}