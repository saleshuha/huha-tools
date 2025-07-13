import { ExcelMapper } from '@/components/ExcelMapper';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { FileStack } from 'lucide-react';

const Index = () => {
  return (
    <div className="relative">
      {/* Navigation to Batch Processor */}
      <div className="absolute top-4 right-4 z-10">
        <Link to="/batch">
          <Button variant="outline" className="flex items-center gap-2">
            <FileStack className="w-4 h-4" />
            Batch Processor
          </Button>
        </Link>
      </div>
      
      <ExcelMapper />
    </div>
  );
};

export default Index;
