import { useState } from 'react';
import { Button } from './ui/button';
import { Download, FileDown, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BackgroundExportDownloadButtonProps {
  taskId: string;
  taskMetadata: any;
  disabled?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function BackgroundExportDownloadButton({ 
  taskId, 
  taskMetadata, 
  disabled = false,
  variant = "outline",
  size = "sm"
}: BackgroundExportDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      console.log('🔽 Initiating download for task:', taskId);

      // Call the edge function to generate and download the file
      const response = await fetch(`https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/generate-export-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ taskId })
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Get the file blob
      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      
      // Extract filename from content-disposition header or use default
      let fileName = `sunsky-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Download completed:', fileName);

      toast({
        title: "Download Started",
        description: `File ${fileName} is being downloaded`,
      });

    } catch (error) {
      console.error('❌ Download failed:', error);
      
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download export file",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const isReady = taskMetadata?.downloadReady || taskMetadata?.fileName;
  const totalProducts = taskMetadata?.downloadableResults?.totalFound || taskMetadata?.totalProducts || 0;

  if (!isReady) {
    return (
      <Button variant="outline" size={size} disabled>
        <FileDown className="w-4 h-4 mr-2" />
        Preparing...
      </Button>
    );
  }

  return (
    <Button 
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={disabled || isDownloading}
      className="flex items-center gap-2"
    >
      {isDownloading ? (
        <>
          <Download className="w-4 h-4 animate-pulse" />
          Downloading...
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4 text-green-600" />
          Download ({totalProducts} products)
        </>
      )}
    </Button>
  );
}