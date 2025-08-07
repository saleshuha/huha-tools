import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AddSKUDialogProps {
  onAddSKUs?: (skus: any[]) => Promise<void>;
  isLoading?: boolean;
}

export function AddSKUDialog({ onAddSKUs, isLoading }: AddSKUDialogProps) {
  const navigate = useNavigate();

  const handleNavigateToAddSKU = () => {
    navigate('/add-sku');
  };

  return (
    <Button onClick={handleNavigateToAddSKU}>
      <Plus className="h-4 w-4 mr-2" />
      Add SKUs
    </Button>
  );
}