# EventFlow Behavior Classification - Quick Reference

## 📋 Quick Setup (5 minutes)

### Step 1: Database Setup (Optional but Recommended)
```bash
# 1. Go to Supabase SQL Editor
# 2. Copy entire contents of BEHAVIOR_CLASSIFICATION_DB_SETUP.sql
# 3. Paste and execute
# ⏱️ Takes ~30 seconds
```

### Step 2: Verify Installation ✓
All code files already installed:
- ✅ `utils/behaviorClassification.ts` - Core logic
- ✅ `app/api/behavior-classification/route.js` - API
- ✅ `app/components/BehaviorAnalyticsCard.js` - Component
- ✅ `app/personalDashboard/page.js` - Integration

### Step 3: Test It
```bash
# Start your app
npm run dev

# Log in to Personal Dashboard
# Click "Behavior Analytics" in sidebar
# Should see analytics card
```

---

## 🎯 Key Features at a Glance

### Classification Categories
| Category | Criteria | Badge | Risk |
|----------|----------|-------|------|
| Regular | 90%+ attendance, <10% late | 🟢 | Low |
| Late | 75%+ attendance, 30%+ late | 🟡 | Medium |
| Irregular | 50-74% attendance | 🟠 | High |
| High-Risk | <50% attendance OR 3+ consecutive misses | 🔴 | Critical |

### Metrics Displayed
- Attendance Rate (%)
- Events Attended / Registered
- Events Missed
- Late Check-ins
- Max Consecutive Misses
- Average Lateness (minutes)
- Last Attendance Date

### Recommendations
Each classification includes 4 personalized recommendations for improvement

---

## 🚀 API Usage

### Get Single Participant Classification

**Request:**
```bash
GET /api/behavior-classification?participantId={UUID}
POST /api/behavior-classification
# Body: {"participantId": "{UUID}"}
```

**Response:**
```json
{
  "category": "Regular",
  "metrics": {
    "attendanceRate": 92,
    "totalEventsAttended": 23,
    "totalEventsRegistered": 25,
    "lateCheckIns": 2,
    "absences": 2
  },
  "riskLevel": "Low",
  "explanation": "Excellent attendance...",
  "recommendations": ["Recognize consistently...", ...]
}
```

### Get Event Summary

**Request:**
```bash
GET /api/behavior-classification?eventId={UUID}&action=summary
POST /api/behavior-classification
# Body: {"eventId": "{UUID}", "action": "summary"}
```

**Response:**
```json
{
  "total": 150,
  "regular": 120,
  "late": 20,
  "irregular": 8,
  "highRisk": 2,
  "averageAttendanceRate": 87,
  "criticalRisk": ["participant-id-1", "participant-id-2"],
  "highRisk": ["participant-id-3", ...]
}
```

---

## 🔧 Common Customizations

### Change Color Scheme
**File:** `app/components/BehaviorAnalyticsCard.js`

```javascript
// Find the switch statement for category colors
case "Regular":
  badgeColor = {
    bg: "rgba(16, 185, 129, 0.1)",   // Customize
    text: "#10b981",                  // Customize
    icon: CheckCircle2,
  };
```

### Modify Classification Rules
**File:** `utils/behaviorClassification.ts`

```javascript
// In classifyBehavior() function
// Change attendance threshold
if (attendanceRate >= 85 && latePercentage < 15) {  // Adjust these
  category = "Regular";
}
```

### Adjust Auto-Refresh Interval
**File:** `app/components/BehaviorAnalyticsCard.js`

```javascript
// Change from 5 minutes to desired interval
const interval = setInterval(fetchBehaviorClassification, 10 * 60 * 1000);  // 10 minutes
```

---

## 🐛 Troubleshooting

### Issue: Component doesn't appear
**Solution:**
1. Check `participantId` is being passed
2. Verify `localStorage.getItem("userId")` returns a value
3. Check browser console for errors

### Issue: API returns 400 error
**Solution:**
1. Verify participantId is a valid UUID
2. Check participantId exists in database
3. Verify Supabase connection

### Issue: Slow loading times
**Solution:**
1. Run database setup script (creates indexes)
2. Check Supabase query performance
3. Consider using cached `participant_behavior` table

### Issue: Data not updating
**Solution:**
1. Verify `attendance` records are being inserted
2. Check real-time subscriptions in browser DevTools
3. Manually refresh page (component auto-refreshes every 5 min)

---

## 📊 Database Queries for Debugging

### Check participant data exists
```sql
SELECT COUNT(*) as total, 
       COUNT(CASE WHEN verified THEN 1 END) as attended
FROM attendance 
WHERE participant_id = '550e8400-e29b-41d4-a716-446655440000';
```

### View all high-risk participants
```sql
SELECT p.name, pb.behavior_category, pb.attendance_rate
FROM participants p
LEFT JOIN participant_behavior pb ON p.participant_id = pb.participant_id
WHERE pb.behavior_category = 'High-Risk'
ORDER BY pb.last_updated DESC;
```

### Check calculation logs
```sql
SELECT * FROM behavior_calculation_log 
WHERE participant_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC 
LIMIT 10;
```

### Get event attendance summary
```sql
SELECT 
  e.event_name,
  COUNT(DISTINCT ep.participant_id) as registered,
  COUNT(DISTINCT CASE WHEN a.verified THEN a.participant_id END) as attended
FROM events e
LEFT JOIN event_participants ep ON e.event_id = ep.event_id
LEFT JOIN attendance a ON ep.event_id = a.event_id 
                       AND ep.participant_id = a.participant_id
WHERE e.event_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY e.event_name;
```

---

## 📁 File Structure

```
EventFlow/
├── utils/
│   └── behaviorClassification.ts          ← Core logic
├── app/
│   ├── api/
│   │   └── behavior-classification/
│   │       └── route.js                  ← API endpoint
│   ├── components/
│   │   └── BehaviorAnalyticsCard.js       ← Component
│   └── personalDashboard/
│       └── page.js                       ← Already integrated
├── BEHAVIOR_CLASSIFICATION.md             ← Full documentation
├── BEHAVIOR_CLASSIFICATION_SETUP.md       ← Setup guide
└── BEHAVIOR_CLASSIFICATION_DB_SETUP.sql   ← Database setup
```

---

## ✅ Testing Checklist

- [ ] Attended Personal Dashboard
- [ ] Verified "Behavior Analytics" section appears
- [ ] Classification badge displays correctly
- [ ] Metrics are calculated
- [ ] Tooltip shows explanation
- [ ] Recommendations appear
- [ ] Sidebar navigation works
- [ ] Component updates on attendance changes
- [ ] API responds correctly to requests
- [ ] No console errors

---

## 🔑 Important Notes

### Authentication
- ParticipantId fetched from `localStorage.getItem("userId")` or `localStorage.getItem("participantId")`
- Ensure user is logged in as "personal" role
- Component requires valid participantId

### Real-Time Updates
- Component auto-refreshes every 5 minutes
- Database triggers log attendance changes
- Supabase subscriptions handle real-time notifications

### Performance
- Large datasets benefit from database caching table
- Indexes significantly improve query speed
- API response time typically < 500ms

### Security
- Row-level security can be enabled on `participant_behavior` table
- Ensure participants can only see their own data
- API validates participantId before querying

---

## 📚 Documentation Files

1. **BEHAVIOR_CLASSIFICATION.md** - Complete feature documentation
2. **BEHAVIOR_CLASSIFICATION_SETUP.md** - Detailed setup and integration guide
3. **BEHAVIOR_CLASSIFICATION_DB_SETUP.sql** - Database schema and triggers

---

## 🎨 Component Props

```javascript
<BehaviorAnalyticsCard 
  participantId={string}  // Required: UUID of participant
/>
```

---

## 🚀 Next Steps

1. ✅ Review this quick reference
2. ⬜ Run database setup (optional but recommended)
3. ⬜ Test in your Personal Dashboard
4. ⬜ Customize colors/rules if needed
5. ⬜ Deploy to production
6. ⬜ Monitor performance metrics

---

## 💡 Tips & Tricks

### Manually trigger refresh
```javascript
// In BehaviorAnalyticsCard, click the info icon to see it update
// Or just wait 5 minutes for automatic refresh
```

### Integration with other components
```javascript
import BehaviorAnalyticsCard from "@/app/components/BehaviorAnalyticsCard";

// Use anywhere you have a participantId
<BehaviorAnalyticsCard participantId={userId} />
```

### View cached behavior data
```sql
-- Check what's cached
SELECT * FROM participant_behavior 
WHERE participant_id = '{UUID}';

-- See when it was last calculated
SELECT behavior_category, last_updated FROM participant_behavior
ORDER BY last_updated DESC;
```

---

## ❓ FAQ

**Q: Does this require the database setup?**
A: No, the API works without it. But setup creates performance optimizations and enables database triggers.

**Q: How often is the data updated?**
A: Component refreshes every 5 minutes automatically. Database triggers update immediately if setup is done.

**Q: Can I customize the classification rules?**
A: Yes! Edit the `classifyBehavior()` function in `utils/behaviorClassification.ts`

**Q: What if a participant has no attendance data?**
A: The component displays 0% attendance rate and High-Risk classification

**Q: Can admins see all participants' classifications?**
A: Yes, modify `event_participants` table integration to support event-level views

---

## 📞 Support Resources

- **Behavior Classification Docs**: See BEHAVIOR_CLASSIFICATION.md
- **Setup Guide**: See BEHAVIOR_CLASSIFICATION_SETUP.md
- **Supabase**: https://supabase.com/docs
- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev

---

**Last Updated:** May 31, 2024
**Version:** 1.0
