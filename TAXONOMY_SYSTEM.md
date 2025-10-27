# Taxonomy & Tracking System Documentation

## Overview
The Taxonomy System is a comprehensive tracking solution that monitors user interactions across the entire application. It captures page views, tab changes, dialog interactions, and user actions to provide insights into user behavior, feature usage, and application performance.

## Architecture

### Core Components

1. **Database Table: `taxonomy_events`**
   - Stores all tracking events
   - Indexed for fast queries
   - Row-level security enabled
   - Auto-cleanup after 90 days (configurable)

2. **React Context: `TaxonomyProvider`**
   - Manages event queuing and batching
   - Handles session management
   - Provides tracking methods to components
   - Implements offline support with localStorage fallback

3. **Custom Hook: `useTaxonomy`**
   - Main interface for tracking in components
   - Provides type-safe tracking methods
   - Access to current session ID

4. **TypeScript Types: `src/types/taxonomy.ts`**
   - Type definitions for all tracking events
   - Ensures consistency across the application

## Event Types

### 1. Page View Events
Tracked automatically when users navigate to a new page.

```typescript
trackPageView({
  category: 'Amazon',              // Main category
  subcategory: 'PO Tracker',       // Specific feature
  pageRoute: '/po-tracker',        // URL path
  pageTitle: 'Purchase Orders',    // Display title
  metadata: {                      // Optional context
    features: ['import', 'export'],
    viewport_width: 1920,
    viewport_height: 1080
  }
});
```

### 2. Tab Change Events
Tracked when users switch between tabs within a page.

```typescript
trackTabChange({
  category: 'Amazon',
  subcategory: 'PO Tracker',
  fromTab: 'overview',
  toTab: 'upload',
  tabTitle: 'Upload PO Files',
  duration: 15234,                 // Time spent on previous tab (ms)
  metadata: {
    interaction_count: 5
  }
});
```

### 3. Dialog Events
Tracked when dialogs/popups are opened or closed.

```typescript
// On dialog open
trackDialog({
  action: 'open',
  category: 'Amazon',
  subcategory: 'PO Tracker',
  dialogName: 'Export Options',
  dialogType: 'configuration'
});

// On dialog close
trackDialog({
  action: 'close',
  category: 'Amazon',
  subcategory: 'PO Tracker',
  dialogName: 'Export Options',
  duration: 5000,                  // Time dialog was open (ms)
  completed: true,                 // Did user complete the action?
  metadata: {
    selected_format: 'excel',
    item_count: 150
  }
});
```

### 4. Action Events
Tracked when users perform specific actions.

```typescript
trackAction({
  category: 'Amazon',
  subcategory: 'PO Tracker',
  actionName: 'export_data',
  actionType: 'data_export',
  success: true,                   // Action outcome
  duration: 3450,                  // Time to complete (ms)
  metadata: {
    format: 'excel',
    item_count: 150,
    file_size_kb: 245
  }
});
```

## Category Structure

### Predefined Categories
- **Amazon**: Purchase orders, fulfillment, vendor central, returns
- **Noon**: Orders, stores, sales, fees, analytics
- **Inventory**: Stock management, replenishment, velocity
- **Tools**: Excel mapper, batch processor, file utilities
- **Suppliers**: Sunsky, Global Sources
- **Label Designer**: Templates, canvas, print manager
- **Admin**: User management, settings, analytics

### Subcategory Examples
- Amazon → PO Tracker, Order Processing, Image Uploader
- Noon → Order Tracking, Sales Dashboard, Fee Reports
- Inventory → Stock Management, Replenishment Planning
- Tools → Excel Editor, Batch Processor, Zip Splitter

## Implementation Guide

### Adding Tracking to a New Page

```typescript
import { useTaxonomy } from '@/hooks/useTaxonomy';

export default function MyPage() {
  const { trackPageView } = useTaxonomy();
  
  useEffect(() => {
    trackPageView({
      category: 'Amazon',
      subcategory: 'My Feature',
      pageRoute: '/my-page',
      pageTitle: 'My Page Title',
      metadata: {
        // Add relevant context
        feature_flags: ['export', 'import']
      }
    });
  }, [trackPageView]);
  
  // Rest of component...
}
```

### Adding Tab Tracking

```typescript
const { trackTabChange } = useTaxonomy();
const [activeTab, setActiveTab] = useState('overview');

<Tabs 
  value={activeTab} 
  onValueChange={(newTab) => {
    trackTabChange({
      category: 'Amazon',
      subcategory: 'PO Tracker',
      fromTab: activeTab,
      toTab: newTab,
      tabTitle: getTabTitle(newTab)
    });
    setActiveTab(newTab);
  }}
>
  {/* Tab content */}
</Tabs>
```

### Adding Dialog Tracking

```typescript
const { trackDialog } = useTaxonomy();
const [open, setOpen] = useState(false);
const [dialogOpenTime, setDialogOpenTime] = useState(0);

<Dialog 
  open={open}
  onOpenChange={(isOpen) => {
    if (isOpen) {
      setDialogOpenTime(Date.now());
      trackDialog({
        action: 'open',
        category: 'Amazon',
        subcategory: 'PO Tracker',
        dialogName: 'Export Options',
        dialogType: 'configuration'
      });
    } else {
      trackDialog({
        action: 'close',
        category: 'Amazon',
        subcategory: 'PO Tracker',
        dialogName: 'Export Options',
        duration: Date.now() - dialogOpenTime
      });
    }
    setOpen(isOpen);
  }}
>
  {/* Dialog content */}
</Dialog>
```

### Adding Action Tracking

```typescript
const { trackAction } = useTaxonomy();

const handleExport = async () => {
  const startTime = Date.now();
  
  try {
    // Perform export
    await exportData();
    
    trackAction({
      category: 'Amazon',
      subcategory: 'PO Tracker',
      actionName: 'export_data',
      actionType: 'data_export',
      success: true,
      duration: Date.now() - startTime,
      metadata: {
        format: selectedFormat,
        item_count: items.length
      }
    });
  } catch (error) {
    trackAction({
      category: 'Amazon',
      subcategory: 'PO Tracker',
      actionName: 'export_data',
      actionType: 'data_export',
      success: false,
      duration: Date.now() - startTime,
      errorMessage: error.message
    });
  }
};
```

## Event Batching

Events are batched for performance:
- **Batch Size**: 10 events
- **Batch Interval**: 5 seconds
- Whichever comes first triggers a flush to the database

### Manual Flush
```typescript
const { flushEvents } = useTaxonomy();

// Force immediate flush
await flushEvents();
```

## Offline Support

If database insertion fails:
- Events are stored in localStorage
- Retry attempted on next successful connection
- Prevents data loss during network issues

## Querying Events

### SQL Examples

**Most visited pages in last 30 days:**
```sql
SELECT 
  category,
  subcategory,
  page_route,
  COUNT(*) as visit_count,
  AVG(duration_ms) as avg_duration_ms
FROM taxonomy_events
WHERE 
  event_type = 'page_view' 
  AND created_at > NOW() - INTERVAL '30 days'
  AND user_id = 'your-user-id'
GROUP BY category, subcategory, page_route
ORDER BY visit_count DESC
LIMIT 10;
```

**Tab usage analysis:**
```sql
SELECT 
  category,
  subcategory,
  tab_id,
  tab_title,
  COUNT(*) as tab_changes,
  AVG(duration_ms) as avg_time_spent_ms
FROM taxonomy_events
WHERE 
  event_type = 'tab_change'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY category, subcategory, tab_id, tab_title
ORDER BY tab_changes DESC;
```

**Failed actions:**
```sql
SELECT 
  category,
  subcategory,
  action_name,
  metadata->>'error_message' as error,
  COUNT(*) as failure_count
FROM taxonomy_events
WHERE 
  event_type = 'action_error'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY category, subcategory, action_name, error
ORDER BY failure_count DESC;
```

**User session analysis:**
```sql
SELECT 
  session_id,
  MIN(created_at) as session_start,
  MAX(created_at) as session_end,
  COUNT(*) as total_events,
  COUNT(DISTINCT page_route) as pages_visited
FROM taxonomy_events
WHERE user_id = 'your-user-id'
GROUP BY session_id
ORDER BY session_start DESC
LIMIT 20;
```

## Privacy & Compliance

- All events tied to authenticated users
- No PII (Personally Identifiable Information) tracked
- User-specific RLS policies enforce data isolation
- Events auto-deleted after 90 days
- Users can request data deletion

## Performance Considerations

- Indexed columns for fast queries
- Event batching reduces database load
- JSONB metadata allows flexible queries
- GIN index on metadata for fast JSONB searches
- Minimal impact on user experience

## Best Practices

1. **Be Specific**: Use clear category and subcategory names
2. **Add Context**: Use metadata for valuable context
3. **Track Outcomes**: Always include success/failure for actions
4. **Measure Duration**: Track time for performance insights
5. **Don't Over-Track**: Focus on meaningful interactions
6. **Test Tracking**: Verify events are being recorded correctly

## Debugging

### Check if tracking is working:
```typescript
// In browser console
localStorage.getItem('taxonomy_session_id')  // Current session ID
localStorage.getItem('taxonomy_events_queue') // Failed events queue
```

### View console logs:
Events are logged to console with `📊 Taxonomy:` prefix
- Event queuing
- Batch flushing
- Retry attempts

### Common Issues

**Events not appearing:**
- Check RLS policies are correct
- Verify user is authenticated
- Check browser console for errors
- Ensure TaxonomyProvider wraps your app

**Duplicate events:**
- Check for multiple TaxonomyProvider wrappers
- Verify effect dependencies are correct
- Use React DevTools to check renders

## Future Enhancements

- [ ] Analytics Dashboard (Phase 5)
- [ ] User journey visualization
- [ ] Funnel analysis
- [ ] A/B testing support
- [ ] Session replay
- [ ] Anomaly detection
- [ ] Export to analytics platforms
- [ ] Real-time monitoring

## Support

For issues or questions:
1. Check this documentation
2. Review implementation examples in POTracker
3. Check browser console for tracking logs
4. Verify database migrations completed successfully
