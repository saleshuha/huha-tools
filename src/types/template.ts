export interface FileTemplate {
  id: string;
  name: string;
  headers: string[];
  description?: string;
  created_at: string;
  file_type: string;
  defaultValues?: Record<string, string>;
  store_name?: string;
}

export interface TemplateMappingRule {
  sourcePattern: string;
  targetColumn: string;
  confidence: number;
}