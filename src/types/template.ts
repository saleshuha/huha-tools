export interface FileTemplate {
  id: string;
  name: string;
  headers: string[];
  description?: string;
  created_at: string;
  file_type: string;
}

export interface TemplateMappingRule {
  sourcePattern: string;
  targetColumn: string;
  confidence: number;
}