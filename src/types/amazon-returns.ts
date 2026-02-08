export interface AmazonReturn {
  id: string;
  user_id: string;
  country: string;
  asin: string;
  product_title?: string;
  shipped_units: number;
  returned_units: number;
  return_ratio: number;
  confidence_score: number;
  priority_score: number;
  impact_score: number;
  upload_date: string;
  file_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReturnsMetrics {
  totalAsins: number;
  totalShipped: number;
  totalReturned: number;
  averageReturnRatio: number;
  highestReturnAsin?: {
    asin: string;
    ratio: number;
  };
  lowestReturnAsin?: {
    asin: string;
    ratio: number;
  };
}

export interface ReturnsFilters {
  dateRange?: {
    from: Date;
    to: Date;
  };
  returnRatioRange?: {
    min: number;
    max: number;
  };
  searchQuery?: string;
  country?: string;
  quickFilter?: 'high' | 'medium' | 'low' | null;
  fileName?: string;
}

export interface ColumnMapping {
  [sourceColumn: string]: string;
}

export interface UploadedReturnsData {
  asin: string;
  product_title?: string;
  shipped_units: number;
  returned_units: number;
  notes?: string;
}

export interface AIInsights {
  overall_insights: string;
  high_priority_items: HighPriorityItem[];
  patterns_detected: string[];
  cost_impact: {
    total_returned_value: number;
    estimated_loss: number;
  };
  generated_at: string;
}

export interface HighPriorityItem {
  asin: string;
  product_title?: string;
  return_ratio?: number;
  shipped_units?: number;
  returned_units?: number;
  confidence_score?: number;
  priority_score?: number;
  reason: string;
  recommendation: string;
  urgency: 'critical' | 'high' | 'medium';
}
