import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import type { 
  TaxonomyEvent, 
  PageViewEvent, 
  TabChangeEvent, 
  DialogEvent, 
  ActionEvent 
} from '@/types/taxonomy';

interface TaxonomyContextValue {
  trackPageView: (event: PageViewEvent) => void;
  trackTabChange: (event: TabChangeEvent) => void;
  trackDialog: (event: DialogEvent) => void;
  trackAction: (event: ActionEvent) => void;
  sessionId: string;
  flushEvents: () => Promise<void>;
}

export const TaxonomyContext = createContext<TaxonomyContextValue | null>(null);

const BATCH_SIZE = 10;
const BATCH_INTERVAL = 5000; // 5 seconds
const SESSION_STORAGE_KEY = 'taxonomy_session_id';
const EVENTS_QUEUE_KEY = 'taxonomy_events_queue';

export const TaxonomyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId] = useState(() => {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) return stored;
    const newId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
    return newId;
  });

  const eventsQueue = useRef<TaxonomyEvent[]>([]);
  const batchTimer = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const lastRoute = useRef<string>('');
  const pageStartTime = useRef<number>(Date.now());
  const currentTab = useRef<string>('');
  const tabStartTime = useRef<number>(Date.now());

  const flushEvents = useCallback(async () => {
    if (eventsQueue.current.length === 0) return;

    const events = [...eventsQueue.current];
    eventsQueue.current = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const eventsWithUser = events.map(event => ({
        ...event,
        user_id: user?.id,
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('taxonomy_events')
        .insert(eventsWithUser);

      if (error) {
        console.error('📊 Taxonomy: Failed to insert events', error);
        // Store failed events in localStorage for retry
        const stored = localStorage.getItem(EVENTS_QUEUE_KEY);
        const queue = stored ? JSON.parse(stored) : [];
        localStorage.setItem(EVENTS_QUEUE_KEY, JSON.stringify([...queue, ...eventsWithUser]));
      } else {
        console.log(`📊 Taxonomy: Flushed ${events.length} events`);
        // Clear any stored events on successful flush
        localStorage.removeItem(EVENTS_QUEUE_KEY);
      }
    } catch (error) {
      console.error('📊 Taxonomy: Error flushing events', error);
    }
  }, []);

  const queueEvent = useCallback((event: TaxonomyEvent) => {
    eventsQueue.current.push(event);
    console.log(`📊 Taxonomy: Queued ${event.event_type} - ${event.category}/${event.subcategory}`);

    // Flush if batch size reached
    if (eventsQueue.current.length >= BATCH_SIZE) {
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
        batchTimer.current = null;
      }
      flushEvents();
    } else {
      // Set timer for batch flush if not already set
      if (!batchTimer.current) {
        batchTimer.current = setTimeout(() => {
          flushEvents();
          batchTimer.current = null;
        }, BATCH_INTERVAL);
      }
    }
  }, [flushEvents]);

  const trackPageView = useCallback((event: PageViewEvent) => {
    const duration = Date.now() - pageStartTime.current;
    pageStartTime.current = Date.now();

    queueEvent({
      session_id: sessionId,
      event_type: 'page_view',
      category: event.category,
      subcategory: event.subcategory,
      page_route: event.pageRoute,
      page_title: event.pageTitle,
      metadata: {
        ...event.metadata,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        previous_duration_ms: lastRoute.current ? duration : undefined,
      },
    });

    lastRoute.current = event.pageRoute;
  }, [sessionId, queueEvent]);

  const trackTabChange = useCallback((event: TabChangeEvent) => {
    const duration = event.duration || (Date.now() - tabStartTime.current);
    tabStartTime.current = Date.now();

    queueEvent({
      session_id: sessionId,
      event_type: 'tab_change',
      category: event.category,
      subcategory: event.subcategory,
      page_route: location.pathname,
      tab_id: event.toTab,
      tab_title: event.tabTitle,
      duration_ms: duration,
      metadata: {
        ...event.metadata,
        from_tab: event.fromTab,
      },
    });

    currentTab.current = event.toTab;
  }, [sessionId, location.pathname, queueEvent]);

  const trackDialog = useCallback((event: DialogEvent) => {
    queueEvent({
      session_id: sessionId,
      event_type: event.action === 'open' ? 'dialog_open' : 'dialog_close',
      category: event.category,
      subcategory: event.subcategory,
      page_route: location.pathname,
      component_name: event.dialogName,
      duration_ms: event.duration,
      metadata: {
        ...event.metadata,
        dialog_type: event.dialogType,
        completed: event.completed,
      },
    });
  }, [sessionId, location.pathname, queueEvent]);

  const trackAction = useCallback((event: ActionEvent) => {
    queueEvent({
      session_id: sessionId,
      event_type: event.success === false ? 'action_error' : 'action_complete',
      category: event.category,
      subcategory: event.subcategory,
      page_route: location.pathname,
      action_name: event.actionName,
      duration_ms: event.duration,
      metadata: {
        ...event.metadata,
        action_type: event.actionType,
        success: event.success,
        error_message: event.errorMessage,
      },
    });
  }, [sessionId, location.pathname, queueEvent]);

  // Flush events on unmount
  useEffect(() => {
    return () => {
      if (eventsQueue.current.length > 0) {
        flushEvents();
      }
    };
  }, [flushEvents]);

  // Try to retry failed events from localStorage on mount
  useEffect(() => {
    const retryStoredEvents = async () => {
      const stored = localStorage.getItem(EVENTS_QUEUE_KEY);
      if (stored) {
        try {
          const events = JSON.parse(stored);
          if (events.length > 0) {
            const { error } = await supabase
              .from('taxonomy_events')
              .insert(events);
            
            if (!error) {
              localStorage.removeItem(EVENTS_QUEUE_KEY);
              console.log(`📊 Taxonomy: Retried ${events.length} stored events`);
            }
          }
        } catch (error) {
          console.error('📊 Taxonomy: Error retrying stored events', error);
        }
      }
    };

    retryStoredEvents();
  }, []);

  const value: TaxonomyContextValue = {
    trackPageView,
    trackTabChange,
    trackDialog,
    trackAction,
    sessionId,
    flushEvents,
  };

  return (
    <TaxonomyContext.Provider value={value}>
      {children}
    </TaxonomyContext.Provider>
  );
};
