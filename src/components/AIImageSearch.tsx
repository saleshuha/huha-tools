import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useAIImageSearch, AIImageMatch } from '@/hooks/useAIImageSearch';
import { Camera, Search, Loader2, Eye, Package, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIImageSearchProps {
  onItemSelect?: (item: AIImageMatch['item']) => void;
}

export function AIImageSearch({ onItemSelect }: AIImageSearchProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { searchByImage, clearResults, isSearching, searchResult } = useAIImageSearch();

  const handleSearch = async () => {
    if (!imageUrl.trim()) return;
    
    await searchByImage(imageUrl);
  };

  const handleClear = () => {
    setImageUrl('');
    clearResults();
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'bg-green-500';
    if (similarity >= 0.6) return 'bg-yellow-500';
    if (similarity >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getSimilarityText = (similarity: number) => {
    if (similarity >= 0.8) return 'Excellent match';
    if (similarity >= 0.6) return 'Good match';
    if (similarity >= 0.4) return 'Fair match';
    return 'Possible match';
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Camera className="w-4 h-4" />
          AI Image Search
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            AI Image Search
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter image URL to search for matching inventory items..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              disabled={isSearching}
            />
            <Button
              onClick={handleSearch}
              disabled={!imageUrl.trim() || isSearching}
              className="gap-2"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </Button>
            {(imageUrl || searchResult) && (
              <Button variant="outline" onClick={handleClear}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Preview Image */}
          {imageUrl && (
            <div className="flex justify-center">
              <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Search image"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">Invalid Image</div>';
                  }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {searchResult && (
            <div className="flex-1 overflow-auto space-y-4">
              {/* AI Description */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {searchResult.description}
                  </p>
                </CardContent>
              </Card>

              {/* Matches */}
              {searchResult.matches.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      Found {searchResult.matches.length} matching items
                    </h3>
                    {searchResult.totalMatches > searchResult.matches.length && (
                      <Badge variant="secondary">
                        Showing top {searchResult.matches.length} of {searchResult.totalMatches}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid gap-3 max-h-96 overflow-auto">
                    {searchResult.matches.map((match, index) => (
                      <Card
                        key={`${match.item.id}-${index}`}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          onItemSelect && "hover:border-primary"
                        )}
                        onClick={() => onItemSelect?.(match.item)}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            {/* Product Image */}
                            <div className="flex-shrink-0">
                              {match.item.imageUrl ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-border">
                                  <img
                                    src={match.item.imageUrl}
                                    alt={match.item.title || match.item.asin}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                                  <Package className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            {/* Item Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">
                                      {match.item.asin}
                                    </span>
                                    {match.item.sku && (
                                      <Badge variant="outline" className="text-xs">
                                        SKU: {match.item.sku}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {match.item.title && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                      {match.item.title}
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center gap-2 text-xs">
                                    <Badge variant="secondary">
                                      Qty: {match.item.quantity}
                                    </Badge>
                                    <Badge 
                                      variant={match.item.status === 'in-stock' ? 'default' : 'outline'}
                                    >
                                      {match.item.status}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Similarity Score */}
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "w-3 h-3 rounded-full",
                                      getSimilarityColor(match.similarity)
                                    )} />
                                    <span className="text-xs font-medium">
                                      {Math.round(match.similarity * 100)}%
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {getSimilarityText(match.similarity)}
                                  </span>
                                </div>
                              </div>

                              {/* Match Reasons */}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {match.reasons.map((reason, reasonIndex) => (
                                  <Badge
                                    key={reasonIndex}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {reason}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Eye className="w-8 h-8 text-muted-foreground" />
                      <h3 className="font-medium">No matches found</h3>
                      <p className="text-sm text-muted-foreground">  
                        The AI couldn't find any matching items in your inventory for this image.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}