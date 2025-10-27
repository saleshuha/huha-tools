import { useContext } from 'react';
import { TaxonomyContext } from '@/contexts/TaxonomyContext';
import type { PageViewEvent, TabChangeEvent, DialogEvent, ActionEvent } from '@/types/taxonomy';

export const useTaxonomy = () => {
  const context = useContext(TaxonomyContext);
  
  if (!context) {
    throw new Error('useTaxonomy must be used within TaxonomyProvider');
  }

  return {
    trackPageView: (event: PageViewEvent) => context.trackPageView(event),
    trackTabChange: (event: TabChangeEvent) => context.trackTabChange(event),
    trackDialog: (event: DialogEvent) => context.trackDialog(event),
    trackAction: (event: ActionEvent) => context.trackAction(event),
    sessionId: context.sessionId,
    flushEvents: () => context.flushEvents(),
  };
};
