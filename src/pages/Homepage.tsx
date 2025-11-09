import { QuranHomepage } from '@/components/quran/QuranHomepage';
import { usePageTracking } from '@/hooks/usePageTracking';

export default function Homepage() {
  usePageTracking({
    category: 'Quran',
    subcategory: 'Main',
    pageTitle: 'Quran Homepage'
  });

  return <QuranHomepage />;
}
