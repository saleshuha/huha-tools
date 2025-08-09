export interface ProcessingError {
  id: string;
  timestamp: string;
  file: string;
  error: string;
  rowsAffected: number;
  type: 'parsing' | 'validation' | 'save' | 'database';
}

export interface ProcessingAnalytics {
  totalFilesProcessed: number;
  totalRowsProcessed: number;
  uniqueSkusFound: number;
  duplicatesFiltered: number;
  savedToDatabase: number;
  averageProcessingTimePerFile: number;
  largestFileProcessed: string;
  processingStartTime: number;
}

export interface BulkProcessingSettings {
  batchSize: number;
  duplicateHandling: 'skip' | 'update' | 'error';
  validationLevel: 'basic' | 'strict';
  autoMapping: boolean;
  threadCount: number; // Number of parallel processing threads
}

export interface FileStatus {
  [fileName: string]: 'pending' | 'processing' | 'completed' | 'error' | 'mapped';
}

export interface FileProgress {
  [fileName: string]: number;
}

export interface FileRowCounts {
  [fileName: string]: { total: number; processed: number };
}

export interface FileMappings {
  [fileName: string]: any;
}

export interface AddSKUPageProps {
  onAddSKUs?: (skus: any[]) => Promise<void>;
  isLoading?: boolean;
}

export type UploadMode = 'single' | 'bulk';