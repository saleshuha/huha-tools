import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePOAsinImages } from '@/hooks/usePOAsinImages';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Package, 
  ImageIcon, 
  AlertCircle, 
  CheckCircle2,
  Loader2
} from 'lucide-react';

export const POAsinManager: React.FC = () => {
  const {
    poAsinItems,
    missingAsinItems,
    coveredAsinItems,
    isLoading,
    exportMissingAsins
  } = usePOAsinImages();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading PO ASINs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total PO ASINs</p>
                <p className="text-2xl font-bold">{poAsinItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Missing Images</p>
                <p className="text-2xl font-bold text-destructive">{missingAsinItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">With Images</p>
                <p className="text-2xl font-bold text-green-600">{coveredAsinItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={exportMissingAsins}
          disabled={missingAsinItems.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Missing ASINs
        </Button>
      </div>

      {/* Missing ASINs Table */}
      {missingAsinItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Missing Images ({missingAsinItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ASIN</TableHead>
                    <TableHead>Image URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingAsinItems.map((item) => (
                    <TableRow key={item.asin}>
                      <TableCell className="font-mono text-sm">{item.asin}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        No image available
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Covered ASINs Table */}
      {coveredAsinItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              ASINs with Images ({coveredAsinItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ASIN</TableHead>
                    <TableHead>Image Preview</TableHead>
                    <TableHead>Image URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coveredAsinItems.map((item) => (
                    <TableRow key={item.asin}>
                      <TableCell className="font-mono text-sm">{item.asin}</TableCell>
                      <TableCell>
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.title}
                            className="w-10 h-10 object-cover rounded border"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-sm" title={item.imageUrl}>
                        {item.imageUrl || 'No URL'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};