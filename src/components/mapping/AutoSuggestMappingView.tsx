import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Check, X, RefreshCw } from 'lucide-react';
import { ExcelData, ColumnMapping } from '@/types/excel';

interface AutoSuggestMappingViewProps {
  sourceData: ExcelData;
  targetData: ExcelData | null;
  mappings: ColumnMapping;
  onCreateMapping: (sourceColumn: string, targetColumn: string) => void;
  onRemoveMapping: (sourceColumn: string) => void;
}

interface SuggestedMapping {
  sourceColumn: string;
  targetColumn: string;
  confidence: number;
  reason: string;
}

const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Exact match
  if (s1 === s2) return 100;
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 80;
  
  // Levenshtein distance similarity
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 0;
  
  const distance = levenshteinDistance(s1, s2);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return Math.max(0, similarity);
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

export const AutoSuggestMappingView: React.FC<AutoSuggestMappingViewProps> = ({
  sourceData,
  targetData,
  mappings,
  onCreateMapping,
  onRemoveMapping
}) => {
  const [suggestions, setSuggestions] = useState<SuggestedMapping[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSuggestions = () => {
    if (!targetData) return;
    
    setIsGenerating(true);
    
    // Simulate processing time for better UX
    setTimeout(() => {
      const newSuggestions: SuggestedMapping[] = [];
      
      sourceData.headers.forEach(sourceColumn => {
        if (mappings[sourceColumn]) return; // Skip already mapped columns
        
        let bestMatch = { column: '', confidence: 0, reason: '' };
        
        targetData.headers.forEach(targetColumn => {
          if (Object.values(mappings).includes(targetColumn)) return; // Skip used targets
          
          const similarity = calculateSimilarity(sourceColumn, targetColumn);
          
          if (similarity > bestMatch.confidence && similarity >= 50) {
            bestMatch = {
              column: targetColumn,
              confidence: similarity,
              reason: similarity === 100 ? 'Exact match' : 
                     similarity >= 80 ? 'Contains match' : 
                     'Similar names'
            };
          }
        });
        
        if (bestMatch.column && bestMatch.confidence >= 50) {
          newSuggestions.push({
            sourceColumn,
            targetColumn: bestMatch.column,
            confidence: bestMatch.confidence,
            reason: bestMatch.reason
          });
        }
      });
      
      // Sort by confidence
      newSuggestions.sort((a, b) => b.confidence - a.confidence);
      setSuggestions(newSuggestions);
      setIsGenerating(false);
    }, 1500);
  };

  useEffect(() => {
    if (targetData && sourceData) {
      generateSuggestions();
    }
  }, [sourceData, targetData, mappings]);

  const acceptSuggestion = (suggestion: SuggestedMapping) => {
    onCreateMapping(suggestion.sourceColumn, suggestion.targetColumn);
  };

  const rejectSuggestion = (sourceColumn: string) => {
    setSuggestions(prev => prev.filter(s => s.sourceColumn !== sourceColumn));
  };

  const acceptAllSuggestions = () => {
    suggestions.forEach(suggestion => {
      onCreateMapping(suggestion.sourceColumn, suggestion.targetColumn);
    });
  };

  if (!targetData) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Please upload a target file to start auto-suggesting mappings
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Auto-Generated Mapping Suggestions</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered column matching based on name similarity
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {suggestions.length > 0 && !isGenerating && (
              <Button onClick={acceptAllSuggestions} className="bg-primary hover:bg-primary/90">
                Accept All ({suggestions.length})
              </Button>
            )}
            <Button variant="outline" onClick={generateSuggestions} disabled={isGenerating}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'Regenerate'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {isGenerating && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <span className="font-medium">Analyzing column similarities...</span>
            </div>
            <Progress value={75} className="h-2" />
            <p className="text-sm text-muted-foreground">
              This may take a moment as we compare column names and patterns
            </p>
          </div>
        </Card>
      )}

      {/* Suggestions */}
      {!isGenerating && suggestions.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Suggested Mappings</h4>
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.sourceColumn}
                className="flex items-center justify-between p-4 border rounded-lg bg-gradient-surface hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="text-primary font-medium">
                    {suggestion.sourceColumn}
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="text-accent font-medium">
                    {suggestion.targetColumn}
                  </div>
                  <Badge 
                    variant={suggestion.confidence >= 90 ? "default" : 
                            suggestion.confidence >= 70 ? "secondary" : "outline"}
                    className="ml-2"
                  >
                    {Math.round(suggestion.confidence)}% {suggestion.reason}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    onClick={() => acceptSuggestion(suggestion)}
                    className="bg-success hover:bg-success/90 text-white"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rejectSuggestion(suggestion.sourceColumn)}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* No Suggestions */}
      {!isGenerating && suggestions.length === 0 && (
        <Card className="p-6 text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="font-semibold mb-2">No Automatic Suggestions Found</h4>
          <p className="text-muted-foreground mb-4">
            The column names don't have enough similarity for automatic matching. 
            Try using a different mapping method.
          </p>
          <Button variant="outline" onClick={generateSuggestions}>
            Try Again
          </Button>
        </Card>
      )}
    </div>
  );
};