# Life Assistant App - Unified Architecture

> Merging Voice Notes app with enhanced task management, learning, and productivity features

## Table of Contents
1. [Core Concept](#1-core-concept)
2. [Key Changes from Original](#2-key-changes-from-original)
3. [Updated Database Schema](#3-updated-database-schema)
4. [Enhanced Features](#4-enhanced-features)
5. [New Services](#5-new-services)
6. [Updated UI/UX](#6-updated-uiux)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Core Concept

**Life Assistant** - A voice-first personal assistant that learns implicitly from user behavior and helps manage daily life without feeling like a productivity app.

### Core Principles
- **Voice-first, but not voice-only** - Primary input is voice notes, but manual editing always available
- **Implicit learning** - No explicit preference setting, learns from patterns
- **Helpful, not intrusive** - Enriches tasks without overwhelming
- **Respects boundaries** - Wake/sleep times, notification preferences
- **Privacy-focused** - Only records when user activates

---

## 2. Key Changes from Original

### Architecture Enhancements

#### **A. Note Classification System**
**Original:** All notes treated equally
**New:** Two distinct types
- `journal` - Personal thoughts, no action needed
- `task/reminder` - Action items, auto-enriched

```typescript
// User tags note after recording
type NoteType = 'journal' | 'task' | 'reminder';

// In database
tags: ['journal'] | ['task'] | ['reminder'] | ['task', 'reminder']
```

#### **B. Task Enrichment Layer**
**New Service:** `taskEnrichmentService.ts`
- Auto-researches relevant tasks
- Adds web links (Amazon, stores, services)
- Provides contextual tips
- Only for non-simple tasks

```typescript
interface EnrichedTask {
  links: Array<{ title: string; url: string; source: string }>;
  tips: string[];
  estimatedDuration?: number;
  priority: 'high' | 'medium' | 'low';
}
```

#### **C. Pattern Recognition Engine**
**New Service:** `patternRecognitionService.ts`
- Tracks recurring behaviors (grocery day, workout time)
- Learns preferences (Target vs Walmart)
- Suggests optimizations (better reminder times)
- Surfaces insights in task completion flow

```typescript
interface Pattern {
  type: 'recurring_activity' | 'time_preference' | 'location_preference';
  activity: string;
  frequency: number; // occurrences
  confidence: number; // 0-1
  suggestion?: string;
}
```

#### **D. Productivity Analytics**
**New Service:** `productivityService.ts`
- Daily task completion rate
- Productivity trends (7/30 day)
- Optimal work times
- Motivational bedtime notification logic

#### **E. User Preferences System**
**New Table:** `user_preferences`
- Wake/sleep times
- Notification tone (friendly/neutral/motivational)
- Geofence precision (500ft default)
- Custom geofences

---

## 3. Updated Database Schema

### New Tables

#### `user_preferences`
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Time boundaries
  wake_time TIME DEFAULT '07:00',
  sleep_time TIME DEFAULT '22:00',
  
  -- Notification preferences
  notification_tone TEXT DEFAULT 'friendly', -- 'friendly' | 'neutral' | 'motivational'
  enable_bedtime_reminder BOOLEAN DEFAULT TRUE,
  enable_pattern_suggestions BOOLEAN DEFAULT TRUE,
  
  -- Location settings
  geofence_radius INTEGER DEFAULT 152, -- 500 feet in meters
  enable_location_reminders BOOLEAN DEFAULT TRUE,
  
  -- Privacy
  store_audio_files BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id);
```

#### `tasks` (Enhanced notes table)
```sql
-- Add to existing notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS
  note_type TEXT DEFAULT 'task' CHECK (note_type IN ('journal', 'task', 'reminder'));

ALTER TABLE notes ADD COLUMN IF NOT EXISTS
  enrichment_data JSONB; -- Links, tips, duration

ALTER TABLE notes ADD COLUMN IF NOT EXISTS
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'));

ALTER TABLE notes ADD COLUMN IF NOT EXISTS
  completed_at TIMESTAMPTZ;

-- Index for task queries
CREATE INDEX idx_notes_type_completed ON notes(note_type, completed_at) 
  WHERE note_type IN ('task', 'reminder');
```

#### `patterns`
```sql
CREATE TABLE patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  pattern_type TEXT NOT NULL, -- 'recurring_activity' | 'time_preference' | 'location_preference'
  activity TEXT NOT NULL, -- 'grocery_shopping' | 'workout' | etc.
  
  -- Pattern data
  occurrences INTEGER DEFAULT 1,
  last_occurrence TIMESTAMPTZ,
  typical_day_of_week INTEGER, -- 0-6 for weekly patterns
  typical_time TIME,
  typical_location TEXT,
  
  -- Learning
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  suggestion TEXT, -- What to suggest to user
  suggestion_shown_at TIMESTAMPTZ,
  suggestion_accepted BOOLEAN,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, pattern_type, activity)
);

CREATE INDEX idx_patterns_user_confidence ON patterns(user_id, confidence DESC);
```

#### `productivity_metrics`
```sql
CREATE TABLE productivity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Daily stats
  tasks_created INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  completion_rate NUMERIC(5,2), -- percentage
  
  -- Time analysis
  most_productive_hour INTEGER, -- 0-23
  avg_completion_time INTERVAL, -- How long tasks take
  
  -- Behavioral
  notes_recorded INTEGER DEFAULT 0,
  patterns_detected INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

CREATE INDEX idx_productivity_user_date ON productivity_metrics(user_id, date DESC);
```

---

## 4. Enhanced Features

### Feature Matrix

| Feature | Original | Enhanced | Status |
|---------|----------|----------|--------|
| Voice recording | ✅ Hold-to-record | ✅ Same | Keep |
| Transcription | ✅ Native + Whisper | ✅ Same | Keep |
| Note parsing | ✅ Claude AI | ✅ Enhanced with type detection | Update |
| Reminders | ✅ Time + Location | ✅ Same | Keep |
| Place suggestions | ✅ AI-powered | ✅ Same | Keep |
| **Journal tagging** | ❌ | ✅ User tags after recording | **NEW** |
| **Task enrichment** | ❌ | ✅ Auto-add links/tips | **NEW** |
| **Task prioritization** | ❌ | ✅ Time-sensitive first | **NEW** |
| **Pattern learning** | Partial | ✅ Full implicit tracking | **ENHANCE** |
| **Productivity tracking** | ❌ | ✅ Daily metrics + trends | **NEW** |
| **Custom notification tones** | ❌ | ✅ User-selectable | **NEW** |
| **Wake/sleep boundaries** | ❌ | ✅ Configurable | **NEW** |

---

## 5. New Services

### A. `taskEnrichmentService.ts`

```typescript
/**
 * Enriches tasks with relevant information
 * - Product links (Amazon, Costco, etc.)
 * - Service links (salons, gyms)
 * - Tips and suggestions
 * - Duration estimates
 */

interface EnrichmentConfig {
  enableProductLinks: boolean;
  enableServiceLinks: boolean;
  enableTips: boolean;
  maxLinksPerTask: number; // default: 3
}

async function enrichTask(
  taskText: string, 
  category: string,
  userContext: UserProfile
): Promise<EnrichedTask> {
  // Determine if task needs enrichment
  if (isSimpleTask(taskText)) return null;
  
  // Use Claude to extract enrichment needs
  const enrichmentNeeds = await claudeService.analyzeTaskForEnrichment(taskText);
  
  // Gather resources
  const links = await gatherRelevantLinks(enrichmentNeeds);
  const tips = await generateContextualTips(taskText, userContext);
  
  return {
    links,
    tips,
    estimatedDuration: estimateDuration(taskText),
    priority: calculatePriority(taskText)
  };
}

// Examples of what gets enriched:
// ✅ "Buy protein powder" → Amazon link, nutrition tips
// ✅ "Book salon appointment" → Nearby salon links, timing tips
// ✅ "Post on LinkedIn" → LinkedIn link, growth tips
// ❌ "Call mom" → No enrichment (simple task)
```

### B. `patternRecognitionService.ts`

```typescript
/**
 * Learns user patterns implicitly
 * - Tracks recurring activities
 * - Identifies time/location preferences
 * - Surfaces suggestions in task flow (not notifications)
 */

async function detectPatterns(userId: string): Promise<Pattern[]> {
  // Query recent notes (last 30 days)
  const notes = await notesService.getRecentNotes(userId, 30);
  
  // Analyze for patterns
  const activities = groupByActivity(notes);
  const patterns: Pattern[] = [];
  
  for (const [activity, occurrences] of Object.entries(activities)) {
    if (occurrences.length >= 2) { // Minimum 2 occurrences
      const pattern = analyzeActivityPattern(activity, occurrences);
      
      if (pattern.confidence > 0.6) {
        patterns.push(pattern);
      }
    }
  }
  
  // Save to database
  await savePatterns(userId, patterns);
  
  return patterns;
}

// Pattern detection examples:
// - Groceries on Saturday 3 times → "You usually shop on Saturdays"
// - Workout at 6pm 4 times → "Want 5:30pm workout reminder?"
// - Always mentions "Target" for shopping → Prioritize Target links
```

### C. `productivityService.ts`

```typescript
/**
 * Tracks productivity metrics
 * - Daily task completion rate
 * - Trends and insights
 * - Bedtime notification logic
 */

interface ProductivityMetrics {
  date: Date;
  tasksCreated: number;
  tasksCompleted: number;
  completionRate: number;
  streak: number; // consecutive days with >50% completion
}

async function calculateDailyMetrics(userId: string, date: Date): Promise<ProductivityMetrics> {
  // Get today's tasks
  const tasks = await getTasksForDate(userId, date);
  
  const created = tasks.length;
  const completed = tasks.filter(t => t.completed_at).length;
  const rate = created > 0 ? (completed / created) * 100 : 0;
  
  // Calculate streak
  const streak = await calculateStreak(userId, date);
  
  // Save to database
  await saveMetrics(userId, { date, created, completed, rate, streak });
  
  return { date, tasksCreated: created, tasksCompleted: completed, completionRate: rate, streak };
}

async function shouldSendBedtimeReminder(userId: string): Promise<{ send: boolean; message: string }> {
  const prefs = await getPreferences(userId);
  if (!prefs.enable_bedtime_reminder) return { send: false, message: '' };
  
  const pendingTasks = await getPendingTasksForToday(userId);
  
  if (pendingTasks.length === 0) {
    return { send: false, message: '' };
  }
  
  // Generate motivational message based on tone preference
  const message = generateBedtimeMessage(pendingTasks.length, prefs.notification_tone);
  
  return { send: true, message };
}
```

---

## 6. Updated UI/UX

### Screen Changes

#### **Home Screen (app/(tabs)/index.tsx)**
**Before:** Notes list
**After:** 
- Notes list (all types)
- Quick filters: `All | Tasks | Reminders | Journal`
- Floating action button for voice recording
- Text input bar at bottom (existing)

```typescript
interface HomeScreenState {
  notes: Note[];
  filter: 'all' | 'tasks' | 'reminders' | 'journal';
  selectedNote?: Note;
}

// Filter logic
const filteredNotes = notes.filter(note => {
  if (filter === 'all') return true;
  if (filter === 'journal') return note.tags.includes('journal');
  if (filter === 'tasks') return note.note_type === 'task' && !note.is_reminder;
  if (filter === 'reminders') return note.is_reminder;
});
```

#### **Reminders Screen (app/(tabs)/reminders.tsx)**
**Before:** Basic reminder list
**After:**
- **Today's Tasks** section (top)
  - Auto-sorted by priority (time-sensitive first)
  - Shows enrichment (links, tips) when tapped
  - Swipe to complete
- **Upcoming** section
- **Recurring** section
- Completion triggers pattern detection

```typescript
interface RemindersScreenData {
  today: EnrichedTask[];
  upcoming: EnrichedTask[];
  recurring: EnrichedTask[];
}

// Priority sorting
const sortedTasks = todayTasks.sort((a, b) => {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  
  // Time-sensitive first
  if (a.event_date && b.event_date) {
    return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
  }
  
  // Then by priority
  return priorityOrder[a.priority] - priorityOrder[b.priority];
});
```

#### **New: Insights Screen (app/(tabs)/insights.tsx)**
**Purpose:** Show productivity trends and patterns
- Weekly completion rate chart
- Detected patterns ("You usually...")
- Best work times
- Streaks and achievements

```typescript
interface InsightsData {
  weeklyMetrics: ProductivityMetrics[];
  patterns: Pattern[];
  streak: number;
  totalCompleted: number;
}
```

#### **Settings Enhancements (app/(tabs)/settings.tsx)**
**Add:**
- Wake/sleep time pickers
- Notification tone selector
- Pattern suggestions toggle
- View learned patterns (read-only)
- Clear all voice data button

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal:** Update data models and core services

**Tasks:**
- [ ] Create new database tables (`user_preferences`, `patterns`, `productivity_metrics`)
- [ ] Add columns to `notes` table (`note_type`, `enrichment_data`, `priority`, `completed_at`)
- [ ] Create migrations in `database/migrations/`
- [ ] Update `notesService.ts` to handle note types
- [ ] Create `preferencesService.ts` for user settings
- [ ] Add onboarding screen for wake/sleep/tone preferences

**Deliverables:**
- Updated database schema
- Migration scripts
- Basic preferences management

---

### Phase 2: Note Classification (Week 2)
**Goal:** Implement journal vs task tagging

**Tasks:**
- [ ] Update `TranscriptionReview` component with type selector
- [ ] Add "Tag as Journal" button
- [ ] Update Claude parsing prompt to detect note intent
- [ ] Modify `createNoteWithReminder()` to save note type
- [ ] Update Home screen with filter tabs
- [ ] Test flow: record → tag → save

**Deliverables:**
- Working note classification
- Filtered views on Home screen

---

### Phase 3: Task Enrichment (Week 2-3)
**Goal:** Auto-enrich relevant tasks with links and tips

**Tasks:**
- [ ] Create `taskEnrichmentService.ts`
- [ ] Implement enrichment detection logic (simple vs enrichable)
- [ ] Build link gathering (Amazon, Google Places, generic search)
- [ ] Generate contextual tips using Claude
- [ ] Update `NoteCard` component to display enrichment
- [ ] Add expandable section for links/tips
- [ ] Test with sample tasks

**Sample enrichment prompts:**
```typescript
const enrichmentPrompt = `
Task: "${taskText}"
User profile: ${userContext}

Provide enrichment in this JSON format:
{
  "needsEnrichment": boolean,
  "links": [
    { "title": "Amazon - Product Name", "url": "...", "type": "product" }
  ],
  "tips": ["Tip 1", "Tip 2"],
  "estimatedDuration": "30 minutes"
}

Only enrich if helpful. Simple tasks like "call mom" need no enrichment.
`;
```

**Deliverables:**
- Working task enrichment
- Enriched task display

---

### Phase 4: Task Prioritization (Week 3)
**Goal:** Auto-sort tasks by urgency

**Tasks:**
- [ ] Implement priority calculation logic
- [ ] Time-sensitive tasks → high priority
- [ ] Location-based → medium (unless near location)
- [ ] Others → low
- [ ] Update Reminders screen to sort by priority
- [ ] Add visual priority indicators (colors/badges)
- [ ] Test sorting with mixed task types

**Priority Algorithm:**
```typescript
function calculatePriority(task: Note): 'high' | 'medium' | 'low' {
  const now = new Date();
  
  // Time-sensitive (within 2 hours)
  if (task.event_date) {
    const hoursUntil = (new Date(task.event_date).getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil <= 2) return 'high';
    if (hoursUntil <= 24) return 'medium';
  }
  
  // Location-based (if near trigger location)
  if (task.location_category && isNearLocation(task.location_category)) {
    return 'high';
  }
  
  return 'low';
}
```

**Deliverables:**
- Prioritized task list
- Visual priority system

---

### Phase 5: Pattern Recognition (Week 4)
**Goal:** Learn user patterns implicitly

**Tasks:**
- [ ] Create `patternRecognitionService.ts`
- [ ] Implement pattern detection algorithm
- [ ] Run pattern analysis daily (background job)
- [ ] Save patterns to database
- [ ] Display patterns in task completion flow
- [ ] Add "Insights" tab to show patterns
- [ ] Test with simulated user data

**Pattern Detection Logic:**
```typescript
// Example: Detect weekly grocery shopping
const groceryNotes = notes.filter(n => 
  n.location_category === 'grocery' && 
  n.created_at > thirtyDaysAgo
);

if (groceryNotes.length >= 3) {
  const dayOfWeek = mostCommonDay(groceryNotes);
  const avgTime = averageTime(groceryNotes);
  
  if (confidence > 0.7) {
    savePattern({
      type: 'recurring_activity',
      activity: 'grocery_shopping',
      typical_day_of_week: dayOfWeek,
      typical_time: avgTime,
      suggestion: `You usually shop on ${dayName(dayOfWeek)}s. Want a reminder?`
    });
  }
}
```

**Deliverables:**
- Working pattern detection
- Pattern suggestions in task flow

---

### Phase 6: Productivity Tracking (Week 4-5)
**Goal:** Track and visualize productivity

**Tasks:**
- [ ] Create `productivityService.ts`
- [ ] Calculate daily metrics on task completion
- [ ] Build Insights screen with charts
- [ ] Implement streak tracking
- [ ] Add bedtime notification logic
- [ ] Test notification timing
- [ ] Build weekly/monthly trend views

**Bedtime Notification:**
```typescript
// Scheduled daily at sleep_time - 30 mins
async function sendBedtimeNotification(userId: string) {
  const prefs = await getPreferences(userId);
  const { send, message } = await productivityService.shouldSendBedtimeReminder(userId);
  
  if (send) {
    await notificationService.scheduleNotification({
      title: "Wrap up your day",
      body: message,
      trigger: { type: 'time', time: prefs.sleep_time - 30mins }
    });
  }
}
```

**Deliverables:**
- Productivity metrics
- Insights screen
- Bedtime notifications

---

### Phase 7: Notification Customization (Week 5)
**Goal:** User-selectable notification tones

**Tasks:**
- [ ] Add notification tone templates
- [ ] Update Settings screen with tone selector
- [ ] Modify notification messages based on tone
- [ ] Test all tone variations
- [ ] A/B test with users

**Tone Templates:**
```typescript
const tones = {
  friendly: {
    reminder: "Hey! Time for {task} 🎯",
    completion: "Nice work on {task}! 🎉",
    bedtime: "You've got {count} tasks left - wrapping them up will help you sleep better 😴"
  },
  neutral: {
    reminder: "{task} - {time}",
    completion: "{task} completed",
    bedtime: "{count} tasks remaining"
  },
  motivational: {
    reminder: "Let's crush {task}! 💪",
    completion: "Awesome! {task} done! Keep it going! 🔥",
    bedtime: "Finish strong! {count} tasks to complete before bed 🌙"
  }
};
```

**Deliverables:**
- Tone customization
- Updated notification system

---

### Phase 8: Polish & Testing (Week 6)
**Goal:** Bug fixes, performance, UX refinements

**Tasks:**
- [ ] Performance optimization (lazy loading, caching)
- [ ] Error handling and offline support
- [ ] Accessibility audit
- [ ] User testing sessions
- [ ] Fix bugs from testing
- [ ] Analytics integration
- [ ] App store preparation

---

## Feature Priority Matrix

### Must Have (MVP)
1. ✅ Voice recording + transcription (existing)
2. ✅ Time-based reminders (existing)
3. 🆕 Journal tagging
4. 🆕 Task enrichment (basic)
5. 🆕 Task prioritization
6. 🆕 User preferences (wake/sleep/tone)

### Should Have (v1.1)
7. 🆕 Pattern recognition
8. 🆕 Productivity tracking
9. 🆕 Insights screen
10. ✅ Location reminders (existing, enhance)

### Nice to Have (v1.2+)
11. 🆕 Advanced pattern suggestions
12. 🆕 Collaborative tasks (shared lists)
13. 🆕 Calendar integration
14. 🆕 Voice command shortcuts

---

## Technical Decisions

### A. Offline Support Strategy
- **Voice recording:** Always works offline, syncs when online
- **Transcription:** Queue for when internet available
- **Enrichment:** Cache common enrichments, fetch on-demand
- **Patterns:** Calculated locally, synced to cloud

### B. Background Processing
- **Pattern detection:** Daily at 3am local time (Expo Background Fetch)
- **Metrics calculation:** On app open + daily at midnight
- **Reminder rescheduling:** On app launch (iOS limitation)

### C. Performance Optimization
- **Lazy loading:** Load notes in batches of 50
- **Caching:** Cache enrichments for 7 days
- **Debouncing:** Voice recording state updates
- **Memoization:** Pattern detection results

### D. Privacy & Security
- **Audio storage:** Optional, user can disable
- **Pattern deletion:** Cascade delete on note deletion
- **Data export:** Allow users to download all data
- **Analytics:** Only anonymous usage, no PII

---

## Migration Guide

### For Existing Users
1. **Database migration** runs on first app update
2. **Onboarding prompt** for new preferences (wake/sleep/tone)
3. **Pattern detection** runs in background, user sees results in 24h
4. **Existing notes** auto-classified as 'task' type (user can re-tag)
5. **No data loss** - all existing functionality preserved

### For New Users
1. Standard auth flow
2. Personality questionnaire (existing)
3. **New:** Preferences setup (wake/sleep/tone)
4. Tutorial highlighting new features (journal tagging, enrichment, insights)

---

## Success Metrics

### User Engagement
- Daily active users (DAU)
- Notes recorded per user per day
- Task completion rate
- Time spent in app

### Feature Adoption
- % users using journal tagging
- % tasks that get enriched
- % users viewing Insights tab
- Pattern suggestion acceptance rate

### Quality Metrics
- Transcription accuracy
- Enrichment relevance (user feedback)
- Pattern detection accuracy
- Notification open rate

---

## Next Steps

1. **Review this architecture** - Any questions or changes?
2. **Create implementation tickets** - Break down into specific tasks
3. **Set up development environment** - Ensure all APIs configured
4. **Start Phase 1** - Database migrations and preferences
5. **Weekly check-ins** - Review progress, adjust roadmap

---

## Questions for Discussion

1. **Task enrichment scope** - Should we enrich all tasks or only specific categories?
2. **Pattern threshold** - How many occurrences before suggesting a pattern? (currently 2)
3. **Notification frequency** - Max notifications per day? (currently unlimited)
4. **Privacy controls** - What level of transparency for learned patterns?
5. **Monetization** - Free tier limits? Premium features?

---

**This unified architecture preserves all existing functionality while adding the enhanced features we discussed. Ready to start implementing?**
