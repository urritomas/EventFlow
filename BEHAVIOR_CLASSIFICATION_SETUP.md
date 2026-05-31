# Behavior Classification Module - Setup & Integration Guide

## Quick Start

### Prerequisites
- EventFlow application running with Supabase integration
- Supabase project with existing tables: `participants`, `attendance`, `events`
- Familiarity with Next.js, React, and Supabase

### Installation Steps

#### 1. **Copy Core Files** ✓ (Already Done)

The following files have been created in your project:

```
utils/
  └── behaviorClassification.ts          (Core logic)
app/
  ├── api/
  │   └── behavior-classification/
  │       └── route.js                  (API endpoint)
  └── components/
      └── BehaviorAnalyticsCard.js       (Dashboard component)
```

#### 2. **Set Up Database Tables** (Recommended)

Run the SQL setup script in your Supabase SQL editor:

```sql
-- Copy and paste the entire contents of BEHAVIOR_CLASSIFICATION_DB_SETUP.sql
-- into your Supabase SQL editor and execute
```

**This creates:**
- `participant_behavior` table for caching metrics
- Database indexes for performance optimization
- Trigger functions for real-time logging
- Views for analytics and trending
- Audit logs table for monitoring

#### 3. **Verify Integration** ✓ (Already Done)

The Personal Dashboard has been updated to include:
- Import of `BehaviorAnalyticsCard` component
- State management for `participantId`
- Sidebar navigation for "Behavior Analytics"
- Real-time subscription setup

## How It Works

### Data Flow

```
Attendance Event Occurs
         ↓
Attendance Record Inserted/Updated in Supabase
         ↓
Real-time Trigger (if DB setup done)
         ↓
API Request: /api/behavior-classification?participantId=xxx
         ↓
Calculate Metrics (attendanceRate, lateCheckIns, etc.)
         ↓
Apply Classification Logic (Regular/Late/Irregular/High-Risk)
         ↓
Return Classification with Recommendations
         ↓
Dashboard Updates BehaviorAnalyticsCard
```

### Architecture Diagram

```
┌─────────────────────────────────────┐
│  Personal Dashboard                 │
│  (personalDashboard/page.js)        │
└────────────────┬────────────────────┘
                 │ renders
                 ↓
    ┌────────────────────────────┐
    │ BehaviorAnalyticsCard      │
    │ (components)               │
    └────────────┬───────────────┘
                 │ fetches from
                 ↓
    ┌────────────────────────────────────────┐
    │ API: /api/behavior-classification     │
    └────────────┬───────────────────────────┘
                 │ uses
                 ↓
    ┌────────────────────────────────────────┐
    │ Behavior Classification Utility        │
    │ (utils/behaviorClassification.ts)     │
    │                                        │
    │ - calculateMetrics()                  │
    │ - classifyBehavior()                  │
    │ - getBehaviorClassification()         │
    └────────────┬───────────────────────────┘
                 │ queries
                 ↓
    ┌────────────────────────────┐
    │  Supabase Database         │
    │                            │
    │ - participants             │
    │ - attendance               │
    │ - events                   │
    │ - event_participants       │
    │ - participant_behavior     │
    └────────────────────────────┘
```

## Configuration

### API Endpoint Configuration

The API endpoint is pre-configured at `/api/behavior-classification` and supports:

**GET Requests:**
```bash
# Get participant classification
curl "http://localhost:3000/api/behavior-classification?participantId=550e8400-e29b-41d4-a716-446655440000"

# Get event summary
curl "http://localhost:3000/api/behavior-classification?eventId=550e8400-e29b-41d4-a716-446655440000&action=summary"
```

**POST Requests:**
```bash
# Get participant classification
curl -X POST "http://localhost:3000/api/behavior-classification" \
  -H "Content-Type: application/json" \
  -d '{"participantId":"550e8400-e29b-41d4-a716-446655440000"}'

# Get event summary
curl -X POST "http://localhost:3000/api/behavior-classification" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"550e8400-e29b-41d4-a716-446655440000","action":"summary"}'
```

### Component Configuration

The `BehaviorAnalyticsCard` component is already integrated into the Personal Dashboard. To use it separately:

```javascript
import BehaviorAnalyticsCard from "@/app/components/BehaviorAnalyticsCard";

export default function MyComponent() {
  // Get participantId from your auth system
  const participantId = useAuth().user.id;
  
  return (
    <div className="p-6">
      <BehaviorAnalyticsCard participantId={participantId} />
    </div>
  );
}
```

### Customization

#### Modify Classification Rules

Edit `utils/behaviorClassification.ts` in the `classifyBehavior()` function:

```typescript
// Example: Change attendance threshold for Regular classification
if (attendanceRate >= 85 && latePercentage < 15) {  // Changed from 90% and 10%
  category = "Regular";
  // ...
}
```

#### Update UI Styling

The `BehaviorAnalyticsCard` uses CSS variables for theming. Modify colors in the component:

```javascript
// Example: Change "Regular" badge color from green to blue
case "Regular":
  badgeColor = {
    bg: "rgba(59, 130, 246, 0.1)",        // Blue background
    text: "#3b82f6",                       // Blue text
    border: "#3b82f6",                     // Blue border
    icon: CheckCircle2,
  };
  break;
```

#### Adjust Auto-Refresh Interval

Change the refresh interval in `BehaviorAnalyticsCard.js`:

```javascript
// Change from 5 minutes to 10 minutes
const interval = setInterval(fetchBehaviorClassification, 10 * 60 * 1000);
```

## Testing

### Manual Testing Checklist

#### 1. **Verify Data Exists**
```sql
-- Check participants
SELECT COUNT(*) FROM participants;

-- Check attendance records
SELECT COUNT(*) FROM attendance;

-- Check events
SELECT COUNT(*) FROM events;
```

#### 2. **Test API Endpoint**

Open your browser and test:
```
http://localhost:3000/api/behavior-classification?participantId=<actual-uuid>
```

Expected response:
```json
{
  "category": "Regular",
  "metrics": { ... },
  "explanation": "...",
  "riskLevel": "Low",
  "recommendations": [ ... ],
  "lastUpdated": "2024-05-31T10:30:00Z"
}
```

#### 3. **Test Dashboard Display**

1. Navigate to Personal Dashboard
2. Log in with a personal account
3. Verify "Behavior Analytics" section appears below "Overview"
4. Check that classification badge displays with correct color
5. Verify metrics are calculated correctly
6. Click info icons to see tooltips

#### 4. **Test Real-Time Updates**

1. Open Personal Dashboard
2. In another tab, insert a new attendance record in Supabase
3. Wait up to 5 minutes (or manually refresh)
4. Verify classification updates accordingly

### Troubleshooting Tests

#### Test 1: Component Not Rendering
**Problem**: BehaviorAnalyticsCard doesn't appear

**Debug Steps**:
```javascript
// Add console logging in BehaviorAnalyticsCard.js
useEffect(() => {
  console.log("participantId:", participantId);
  console.log("Component mounted");
}, [participantId]);
```

**Check**:
- `participantId` is being passed correctly
- Browser console shows no errors
- participantId matches actual database records

#### Test 2: API Returns 400 Error
**Problem**: `/api/behavior-classification` returns 400 error

**Debug Steps**:
```bash
# Verify the UUID format
curl "http://localhost:3000/api/behavior-classification?participantId=550e8400-e29b-41d4-a716-446655440000"

# Check server logs for detailed error
```

**Check**:
- participantId is a valid UUID
- participantId exists in database
- Supabase connection is working

#### Test 3: Slow Calculations
**Problem**: API takes too long to respond

**Debug Steps**:
```sql
-- Check index exists
SELECT * FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND tablename = 'attendance';

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM attendance 
WHERE participant_id = '550e8400-e29b-41d4-a716-446655440000';
```

**Solution**:
- Run database setup script to create indexes
- Consider using `participant_behavior` cache table

## Performance Optimization

### For Large Datasets

#### 1. **Enable Caching**

Once `participant_behavior` table is created, modify the API to use cached data:

```javascript
// In app/api/behavior-classification/route.js
const classification = await supabase
  .from("participant_behavior")
  .select("*")
  .eq("participant_id", participantId)
  .single();

if (classification && isRecent(classification.last_updated)) {
  return Response.json(classification);
}
```

#### 2. **Implement Pagination**

For event summaries with many participants:

```javascript
export async function getBehaviorSummaryPaginated(
  eventId: string,
  page: number = 1,
  pageSize: number = 50
) {
  // Implementation with LIMIT and OFFSET
}
```

#### 3. **Add Database Indexes**

```sql
-- Already included in setup script, but verify with:
SELECT * FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND tablename = 'attendance';
```

## Deployment

### Production Checklist

- [ ] Database setup script executed in production Supabase project
- [ ] API endpoint tested with production data
- [ ] Environment variables configured (Supabase URL and keys)
- [ ] Real-time subscriptions working
- [ ] Database indexes created for performance
- [ ] Error logging configured
- [ ] Load testing completed
- [ ] Backup strategy in place

### Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

These are used by both the client and server-side Supabase initialization.

## Advanced Usage

### Batch Processing for Events

Get classifications for all participants in an event:

```javascript
async function processEventBehaviors(eventId) {
  const response = await fetch(
    `/api/behavior-classification?eventId=${eventId}&action=summary`
  );
  const summary = await response.json();
  
  console.log(`Event Behavior Summary:`);
  console.log(`  Total Participants: ${summary.total}`);
  console.log(`  Regular: ${summary.regular}`);
  console.log(`  Late: ${summary.late}`);
  console.log(`  Irregular: ${summary.irregular}`);
  console.log(`  High-Risk: ${summary.highRisk}`);
}
```

### Export Classifications

```javascript
async function exportBehaviorData(eventId) {
  const response = await fetch(
    `/api/behavior-classification?eventId=${eventId}&action=summary`
  );
  const data = await response.json();
  
  // Convert to CSV
  const csv = convertToCSV(data);
  downloadCSV(csv, `behavior-report-${eventId}.csv`);
}
```

### Integrate with Admin Dashboard

```javascript
// In admin dashboard
import BehaviorAnalyticsCard from "@/app/components/BehaviorAnalyticsCard";

export default function AdminEventView({ eventId }) {
  const [participants, setParticipants] = useState([]);
  
  useEffect(() => {
    fetchEventParticipants(eventId).then(setParticipants);
  }, [eventId]);
  
  return (
    <div className="grid gap-4">
      {participants.map(participant => (
        <BehaviorAnalyticsCard 
          key={participant.id}
          participantId={participant.id}
        />
      ))}
    </div>
  );
}
```

## Migration from Existing Systems

If you have existing attendance data:

1. **Verify data structure** matches the expected schema
2. **Run database setup** to create tables and indexes
3. **Test API** with existing participant IDs
4. **Deploy** to production gradually

## Monitoring & Maintenance

### Regular Checks

```sql
-- Check for stale behavior data (not updated in 7 days)
SELECT participant_id, last_updated 
FROM participant_behavior 
WHERE last_updated < NOW() - INTERVAL '7 days'
ORDER BY last_updated ASC;

-- Monitor trigger execution logs
SELECT * FROM behavior_calculation_log 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Check index usage
SELECT * FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

### Performance Metrics

Monitor these metrics:

- API response time: Should be < 500ms
- Database query time: Should be < 200ms  
- Calculation accuracy: 100% match with manual spot checks
- System uptime: Target 99.9%

## Support & Documentation

- **Main Documentation**: See [BEHAVIOR_CLASSIFICATION.md](./BEHAVIOR_CLASSIFICATION.md)
- **Database Setup**: See [BEHAVIOR_CLASSIFICATION_DB_SETUP.sql](./BEHAVIOR_CLASSIFICATION_DB_SETUP.sql)
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

## Changelog

### Version 1.0 (Current)
- ✓ Behavior classification system implemented
- ✓ Personal Dashboard integration
- ✓ API endpoint created
- ✓ Real-time subscription setup
- ✓ Database triggers and views
- ✓ Component with tooltips and recommendations
- ✓ Comprehensive documentation

### Planned Enhancements
- [ ] Mobile app support
- [ ] PDF report generation
- [ ] Bulk email notifications
- [ ] Historical trend analysis
- [ ] Customizable thresholds per organization
- [ ] Machine learning predictions
- [ ] Automated intervention workflows
