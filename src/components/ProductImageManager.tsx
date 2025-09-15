import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, ExternalLink, Image as ImageIcon, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProductImages } from '@/hooks/useProductImages';

interface ProductImageFormData {
  asin: string;
  imageUrl: string;
  imageName: string;
}

export const ProductImageManager = () => {
  const { 
    productImages, 
    isLoading, 
    addProductImage, 
    updateProductImage, 
    deleteProductImage 
  } = useProductImages();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [showAll, setShowAll] = useState(false);
  const [formData, setFormData] = useState<ProductImageFormData>({
    asin: '',
    imageUrl: '',
    imageName: ''
  });

  const filteredImages = productImages.filter(image =>
    image.asin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (image.image_name && image.image_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginatedImages = useMemo(() => {
    if (showAll) {
      return filteredImages;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredImages.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredImages, currentPage, itemsPerPage, showAll]);

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleAddImage = async () => {
    if (!formData.asin.trim() || !formData.imageUrl.trim()) {
      return;
    }

    await addProductImage.mutateAsync({
      asin: formData.asin,
      imageUrl: formData.imageUrl,
      imageName: formData.imageName
    });

    setFormData({ asin: '', imageUrl: '', imageName: '' });
    setIsAddDialogOpen(false);
  };

  const handleUpdateImage = async () => {
    if (!selectedImage || !formData.asin.trim() || !formData.imageUrl.trim()) {
      return;
    }

    await updateProductImage.mutateAsync({
      id: selectedImage.id,
      asin: formData.asin,
      imageUrl: formData.imageUrl,
      imageName: formData.imageName
    });

    setFormData({ asin: '', imageUrl: '', imageName: '' });
    setSelectedImage(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteImage = async (id: string) => {
    if (confirm('Are you sure you want to delete this image?')) {
      await deleteProductImage.mutateAsync(id);
    }
  };

  const openEditDialog = (image: any) => {
    setSelectedImage(image);
    setFormData({
      asin: image.asin,
      imageUrl: image.image_url,
      imageName: image.image_name || ''
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ asin: '', imageUrl: '', imageName: '' });
    setSelectedImage(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Product Image Management
          </CardTitle>
          <p className="text-muted-foreground">
            Upload and manage product images with ASIN mapping for display in your purchase orders.
            <span className="block text-sm mt-1 font-medium">
              Total Images: {productImages.length} | No Supabase limits - all images are fetched and displayed
            </span>
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by ASIN or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-6 w-6 p-0 -translate-y-1/2"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {showAll ? `All ${filteredImages.length}` : `${paginatedImages.length} of ${filteredImages.length}`} image{filteredImages.length !== 1 ? 's' : ''}
                </Badge>
                
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                  setShowAll(false);
                }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showAll ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowAll(true);
                  setCurrentPage(1);
                }}
              >
                Show All
              </Button>
              <Button
                variant={!showAll ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowAll(false);
                  setCurrentPage(1);
                }}
              >
                Paginate
              </Button>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Image
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Product Image</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="asin">ASIN *</Label>
                      <Input
                        id="asin"
                        placeholder="e.g., B08N5WRWNW"
                        value={formData.asin}
                        onChange={(e) => setFormData(prev => ({ ...prev, asin: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="imageUrl">Image URL *</Label>
                      <Input
                        id="imageUrl"
                        placeholder="https://example.com/image.jpg"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="imageName">Image Name (Optional)</Label>
                      <Input
                        id="imageName"
                        placeholder="Product name or description"
                        value={formData.imageName}
                        onChange={(e) => setFormData(prev => ({ ...prev, imageName: e.target.value }))}
                      />
                    </div>
                    {formData.imageUrl && (
                      <div className="border rounded-lg p-4">
                        <Label className="text-sm font-medium mb-2 block">Preview:</Label>
                        <img
                          src={formData.imageUrl}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => { resetForm(); setIsAddDialogOpen(false); }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddImage}
                        disabled={!formData.asin.trim() || !formData.imageUrl.trim() || addProductImage.isPending}
                      >
                        {addProductImage.isPending ? 'Adding...' : 'Add Image'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading images...</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Product Images</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No images match your search criteria.' : 'Start by adding product images with ASIN mapping.'}
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Image
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>ASIN</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedImages.map((image) => (
                    <TableRow key={image.id}>
                      <TableCell>
                        <img
                          src={image.image_url}
                          alt={image.image_name || image.asin}
                          className="w-12 h-12 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{image.asin}</TableCell>
                      <TableCell>{image.image_name || '-'}</TableCell>
                      <TableCell>
                        <a
                          href={image.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 max-w-[200px] truncate"
                        >
                          <span className="truncate">{image.image_url}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell>
                        {new Date(image.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(image)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteImage(image.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {!showAll && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredImages.length)} of {filteredImages.length} images
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1 mx-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (totalPages <= 7) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                          return false;
                        })
                        .map((page, index, array) => {
                          const showEllipsis = index > 0 && page - array[index - 1] > 1;
                          return (
                            <React.Fragment key={page}>
                              {showEllipsis && (
                                <span className="px-2 text-muted-foreground">...</span>
                              )}
                              <Button
                                variant={page === currentPage ? "default" : "ghost"}
                                size="sm"
                                onClick={() => handlePageChange(page)}
                                className="min-w-[32px] h-8"
                              >
                                {page}
                              </Button>
                            </React.Fragment>
                          );
                        })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-asin">ASIN *</Label>
              <Input
                id="edit-asin"
                placeholder="e.g., B08N5WRWNW"
                value={formData.asin}
                onChange={(e) => setFormData(prev => ({ ...prev, asin: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-imageUrl">Image URL *</Label>
              <Input
                id="edit-imageUrl"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-imageName">Image Name (Optional)</Label>
              <Input
                id="edit-imageName"
                placeholder="Product name or description"
                value={formData.imageName}
                onChange={(e) => setFormData(prev => ({ ...prev, imageName: e.target.value }))}
              />
            </div>
            {formData.imageUrl && (
              <div className="border rounded-lg p-4">
                <Label className="text-sm font-medium mb-2 block">Preview:</Label>
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { resetForm(); setIsEditDialogOpen(false); }}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateImage}
                disabled={!formData.asin.trim() || !formData.imageUrl.trim() || updateProductImage.isPending}
              >
                {updateProductImage.isPending ? 'Updating...' : 'Update Image'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};