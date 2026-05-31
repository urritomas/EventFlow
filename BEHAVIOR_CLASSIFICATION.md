# EventFlow Behavior Classification Module

## Overview

The Behavior Classification module automatically analyzes participant attendance records and assigns behavior categories based on historical attendance performance. The system continuously monitors attendance patterns and updates classifications in real-time.

## Features

### Behavior Categories

| Category | Criteria | Risk Level | Badge Color |
|----------|----------|-----------|------------|
| **Regular** | Attendance ≥ 90% AND Late Check-ins < 10% | Low | Green |
| **Late** | Attendance ≥ 75% AND Late Check-ins ≥ 30% | Medium | Yellow |
| **Irregular** | Attendance 50-74% | High | Orange |
| **High-Risk** | Attendance < 50% OR Consecutive Absences ≥ 3 | Critical | Red |

### Calculated Metrics

- **Attendance Rate**: Percentage of registered events attended
- **Total Events Registered**: Sum of events the participant registered for
- **Total Events Attended**: Sum of events with verified check-ins
- **Late Check-ins**: Number of times checked in after event start time
- **Absences**: Number of registered events not attended
- **Consecutive Missed Events**: Longest streak of consecutive absences
- **Average Lateness**: Average minutes late per check-in
- **Last Attendance Date**: Most recent verified attendance

### Dashboard Display

The Personal Dashboard features a comprehensive **Behavior Analytics Card** showing:

1. **Current Classification** - With color-coded badge
2. **Explanation** - Why the participant received this classification
3. **Risk Level Indicator** - Color-coded risk assessment
4. **Key Metrics** - Detailed attendance statistics
5. **Recommendations** - Personalized suggestions based on classification
6. **Last Updated** - Timestamp of last calculation

## Architecture

### Components

#### 1. Behavior Classification Utility (`utils/behaviorClassification.ts`)

Core backend logic that handles:
- Metrics calculation from Supabase data
- Classification logic implementation
- Batch processing for multiple participants
- Event-level summaries

**Key Functions:**
- `getBehaviorClassification(participantId)` - Get single participant classification
- `getBehaviorClassificationsForEvent(eventId)` - Get all participants' classifications for an event
- `getBehaviorSummary(eventId)` - Get summary statistics for an event

#### 2. API Endpoint (`app/api/behavior-classification/route.js`)

RESTful endpoint for behavior classification queries:

**GET Endpoint:**
```
GET /api/behavior-classification?participantId=<id>
GET /api/behavior-classification?eventId=<id>&action=summary
```

**POST Endpoint:**
```
POST /api/behavior-classification
Body: { participantId: string } | { eventId: string, action: "summary" }
```

**Response Format:**
```json
{
  "category": "Regular|Late|Irregular|High-Risk",
  "metrics": {
    "totalEventsRegistered": number,
    "totalEventsAttended": number,
    "attendanceRate": number,
    "lateCheckIns": number,
    "absences": number,
    "consecutiveMissedEvents": number,
    "averageLateness": number,
    "lastAttendanceDate": "YYYY-MM-DD" | null
  },
  "explanation": string,
  "riskLevel": "Low|Medium|High|Critical",
  "recommendations": string[],
  "lastUpdated": "ISO 8601 timestamp"
}
```

#### 3. BehaviorAnalyticsCard Component (`app/components/BehaviorAnalyticsCard.js`)

React component for dashboard display featuring:
- Real-time fetching from API
- Color-coded status badges
- Interactive tooltips
- Metrics display with icons
- Recommendation list
- Auto-refresh every 5 minutes

#### 4. Personal Dashboard Integration (`app/personalDashboard/page.js`)

- Displays Behavior Analytics Card
- Provides sidebar navigation
- Sets up real-time subscriptions
- Manages participant authentication

## Data Requirements

### Required Supabase Tables

#### `participants`
- `participant_id` (UUID, Primary Key)
- `name` (text)
- `student_id` (text)
- `email` (text)

#### `attendance`
- `attendance_id` (UUID, Primary Key)
- `participant_id` (UUID, Foreign Key)
- `event_id` (UUID, Foreign Key)
- `verified` (boolean)
- `verified_at` (timestamp with timezone)
- `similarity` (numeric)

#### `events`
- `event_id` (UUID, Primary Key)
- `event_name` (text)
- `event_date` (date)
- `start_time` (time)

#### `event_participants` (Optional but Recommended)
- `id` (UUID, Primary Key)
- `event_id` (UUID, Foreign Key)
- `participant_id` (UUID, Foreign Key)
- `registration_status` (text)
- `check_in_time` (timestamp)

### Optional: Behavior Tracking Table

For improved performance with large datasets, create a cached behavior metrics table:

```sql
CREATE TABLE participant_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  behavior_category TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  attendance_rate INTEGER,
  total_events_registered INTEGER,
  total_events_attended INTEGER,
  late_check_ins INTEGER,
  absences INTEGER,
  consecutive_missed_events INTEGER,
  average_lateness INTEGER,
  last_attendance_date DATE,
  explanation TEXT,
  recommendations TEXT[],
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(participant_id)
);

CREATE INDEX idx_participant_behavior_category ON participant_behavior(behavior_category);
CREATE INDEX idx_participant_behavior_risk ON participant_behavior(risk_level);
CREATE INDEX idx_participant_behavior_updated ON participant_behavior(last_updated);
```

## Real-Time Synchronization

The system uses Supabase's real-time capabilities to automatically update classifications when attendance records change.

### Setup

The Personal Dashboard component subscribes to real-time changes on:
- `attendance` table - Triggers recalculation when new records are added
- `event_participants` table - Triggers recalculation on registration changes

```typescript
const subscription = supabase
  .channel("behavior-updates")
  .on(
    "postgres_changes",
    {
      event: "INSERT|UPDATE",
      schema: "public",
      table: "attendance",
    },
    () => {
      // Recalculate behavior classification
    }
  )
  .subscribe();
```

### Optional: Database Triggers

For automatic metric updates on the server side, create database triggers:

```sql
-- Function to update participant behavior
CREATE OR REPLACE FUNCTION update_participant_behavior()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate metrics for the affected participant
  -- This would call your calculation logic
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on attendance insert
CREATE TRIGGER trigger_attendance_inserted
AFTER INSERT ON attendance
FOR EACH ROW
EXECUTE FUNCTION update_participant_behavior();

-- Trigger on attendance update
CREATE TRIGGER trigger_attendance_updated
AFTER UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION update_participant_behavior();
```

## Usage Examples

### Fetch Classification for a Participant

```javascript
const response = await fetch(
  `/api/behavior-classification?participantId=${participantId}`
);
const classification = await response.json();

console.log(`Status: ${classification.category}`);
console.log(`Attendance Rate: ${classification.metrics.attendanceRate}%`);
console.log(`Risk Level: ${classification.riskLevel}`);
```

### Get Event Summary

```javascript
const response = await fetch(
  `/api/behavior-classification?eventId=${eventId}&action=summary`
);
const summary = await response.json();

console.log(`Total Participants: ${summary.total}`);
console.log(`Regular: ${summary.regular}`);
console.log(`High-Risk: ${summary.highRisk}`);
```

### Use in Components

```javascript
import BehaviorAnalyticsCard from "@/app/components/BehaviorAnalyticsCard";

export default function Dashboard() {
  const participantId = getUserId(); // Your auth logic
  
  return (
    <BehaviorAnalyticsCard participantId={participantId} />
  );
}
```

## Classification Logic

### Regular Classification
- **Condition**: `attendance_rate >= 90 AND late_percentage < 10`
- **Risk**: Low
- **Action**: Recognize and reward consistent attendance
- **Recommendations**:
  - Recognize and reward consistent attendance
  - Consider as peer mentor for other participants
  - Invite to leadership or advanced opportunities
  - Maintain regular communication

### Late Classification
- **Condition**: `attendance_rate >= 75 AND late_percentage >= 30`
- **Risk**: Medium
- **Action**: Address punctuality issues
- **Recommendations**:
  - Send time reminders 15 minutes before event start
  - Discuss time management or scheduling conflicts
  - Offer early check-in options if available
  - Recognize improvements in punctuality

### Irregular Classification
- **Condition**: `50 <= attendance_rate <= 74`
- **Risk**: High
- **Action**: Encourage consistent participation
- **Recommendations**:
  - Encourage regular attendance through reminders
  - Identify obstacles to consistent participation
  - Provide flexible scheduling options if possible
  - Set attendance goals for next quarter

### High-Risk Classification
- **Condition**: `attendance_rate < 50 OR consecutive_absences >= 3`
- **Risk**: Critical
- **Action**: Immediate intervention required
- **Recommendations**:
  - Contact participant immediately
  - Inquire about barriers to attendance
  - Offer alternative participation options
  - Consider mentorship or support program

## Performance Considerations

### Optimization Tips

1. **Caching**: Use the `participant_behavior` table for quick lookups
2. **Batch Processing**: Calculate for multiple participants at once
3. **Indexing**: Ensure proper indexes on `attendance.participant_id`, `attendance.event_id`, and dates
4. **Pagination**: For large datasets, implement pagination in event summaries

### Query Optimization

```sql
-- Add these indexes for better performance
CREATE INDEX idx_attendance_participant_verified 
  ON attendance(participant_id, verified, verified_at);

CREATE INDEX idx_attendance_event_date 
  ON attendance(event_id) 
  INCLUDE (verified_at);

CREATE INDEX idx_event_participants_participant 
  ON event_participants(participant_id, registration_status);
```

## Monitoring & Troubleshooting

### Common Issues

1. **Slow Calculations**: Check if attendance table has proper indexes
2. **Outdated Classifications**: Verify real-time subscriptions are active
3. **Missing Metrics**: Ensure attendance records have `verified_at` timestamps
4. **Late Check-in Detection**: Verify `events.start_time` is in correct format

### Debug Logging

The system includes console logging for debugging:

```javascript
// Enable in development
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log("Calculating metrics for participant:", participantId);
  console.log("Attendance records:", attendanceData.length);
  console.log("Classification result:", classification);
}
```

## Future Enhancements

1. **Predictive Analytics**: Use ML to predict at-risk participants
2. **Trend Analysis**: Track behavior changes over time
3. **Export Reports**: Generate PDF reports for administrators
4. **Notifications**: Alert admins of high-risk participants
5. **Custom Thresholds**: Allow organizations to customize classification rules
6. **Historical Comparison**: Compare participant trends across quarters/semesters
7. **Bulk Actions**: Apply actions to groups of participants with similar behavior patterns

## API Reference

### GET /api/behavior-classification

Retrieve behavior classification for a participant.

**Parameters:**
- `participantId` (required): UUID of the participant
- `eventId` (optional): UUID of the event (for filtering)
- `action` (optional): "summary" to get event-level summary

**Response:**
- 200: Classification data (see response format above)
- 400: Missing required parameters
- 500: Server error

### POST /api/behavior-classification

Batch retrieve classifications.

**Body:**
```json
{
  "participantId": "uuid",
  "eventId": "uuid",
  "action": "summary"
}
```

**Response:**
- 200: Classification or summary data
- 400: Invalid request
- 500: Server error

## Support & Documentation

For additional support or feature requests, please refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [EventFlow Backend Integration](./BACKEND_INTEGRATION.md)
- [EventFlow Database Setup](./SUPABASE_SETUP.md)
