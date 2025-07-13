import { ProductScraper } from '@/components/ProductScraper';

export default function ProductScraperPage() {
  return <ProductScraper onBack={() => window.history.back()} />;
}