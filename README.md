# Nottos

A voice-first personal assistant app that captures voice notes and turns them into organized tasks, reminders, and journal entries with AI-powered parsing.

Built with React Native (Expo) + Supabase + DeepSeek AI.

## Features

### Voice Notes
- Hold-to-record voice input with real-time waveform visualization
- Transcription via OpenAI Whisper API (with native speech recognition support in dev builds)
- Garbage transcription detection (non-English, hallucinations, silence)
- Review and edit transcription before saving
- Text input as alternative to voice

### Smart Note Parsing
- AI-powered parsing extracts note type, reminders, locations, shopping items, and tags
- Local regex-based detection runs first to minimize API calls
- Automatic categorization: task, reminder, journal
- Shopping item extraction from grocery-related notes

### Reminders
- One-time and recurring reminders (daily, weekly, monthly, yearly, every N days)
- Natural language time parsing ("tomorrow at 3pm", "in 45 minutes", "next Monday")
- Configurable reminder-before-event scheduling
- Automatic rollover of pending tasks to today
- Mark complete / undo completion tracking

### Location-Based Reminders
- Save locations (Home, Work, Gym) with geofencing
- Notifications triggered on arrival or departure
- Background location monitoring via Expo TaskManager
- Store chain detection (Walmart, CVS, Costco, etc.)
- Smart filtering: only notifies when relevant pending items exist
- 30-second polling with 30-meter minimum movement threshold

### Photo Journal
- Capture photos via camera or import from library
- Categorize entries: food, selfie, other
- Add and edit captions
- Timeline view grouped by date
- AI-generated insights per category (analyzes 2-week photo history)
- Journal statistics and activity tracking

### Smart Notifications
- Personalized morning briefing at wake time (AI-generated based on today's tasks)
- Bedtime reminder for pending tasks
- Food insight notifications based on meal photo patterns
- Journal reminders (2x/week based on missing categories)
- 14-notification onboarding sequence over first 7 days
- Notification tone preferences: friendly, neutral, motivational

### Task Enrichment
- AI-generated links and tips for actionable tasks (buy, cook, book, travel, etc.)
- Estimated task duration
- Quick links to Amazon, Google, Yelp

### Onboarding
- 5-step flow: welcome, wake time, bed time, tone preference, completion
- Can be retaken from settings
- Saves preferences for notification scheduling

### Settings
- Dark/light/system theme toggle
- Wake and sleep time configuration
- Notification tone selection (Default, Gentle, Chime, Alert)
- Location reminders management
- Account management (change password, update email, delete account)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81.5 + Expo ~54.0 |
| Language | TypeScript ~5.9 |
| Navigation | Expo Router ~6.0 (file-based) |
| Styling | NativeWind 4.2 (Tailwind CSS for RN) |
| Animations | React Native Reanimated ~4.1 |
| Gestures | React Native Gesture Handler ~2.28 |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| AI | DeepSeek API (deepseek-chat, OpenAI-compatible) |
| Transcription | OpenAI Whisper API (whisper-1) |
| Location | Expo Location + Expo TaskManager |
| Notifications | Expo Notifications |
| Camera | Expo Camera + Expo ImagePicker |
| Audio | Expo AV |
| Local Storage | AsyncStorage |

## Project Structure

```
notes/
├── app/                        # Screens (Expo Router file-based routing)
│   ├── _layout.tsx             # Root layout, auth state, deep links
│   ├── index.tsx               # Entry redirect
│   ├── onboarding.tsx          # Onboarding flow
│   ├── locations.tsx           # Location reminders management
│   ├── profile.tsx             # Profile & account settings
│   ├── auth/
│   │   └── callback.tsx        # OAuth & email verification handler
│   ├── (auth)/                 # Unauthenticated screens
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── forgot-password.tsx
│   │   └── reset-password.tsx
│   └── (tabs)/                 # Main app tabs
│       ├── index.tsx           # Home - notes feed & voice input
│       ├── reminders.tsx       # Tasks - date-based task management
│       ├── journal.tsx         # Photo journal & insights
│       └── settings.tsx        # App settings (hidden tab)
├── components/
│   ├── common/                 # TopBar
│   ├── notes/                  # NoteCard, NoteInputBar, EditNoteModal, ReminderPicker, TranscriptionReview
│   ├── ui/                     # AnimatedPressable, BottomSheet, PremiumButton, PremiumCard, PullToRefresh, SkeletonLoader, WheelTimePicker
│   ├── voice/                  # VoiceRecordButton, VoiceCaptureSheet, VoiceWaveform
│   ├── journal/                # PhotoCard, AddPhotoSheet, CameraView, CategoryFilter, EmptyJournalState, InsightsView, PhotoPreview
│   └── onboarding/             # OnboardingSlider, OnboardingOption, OnboardingProgress, OnboardingScreen, OnboardingTimePicker, OnboardingTextInput
├── services/                   # Business logic
│   ├── aiService.ts            # DeepSeek API wrapper
│   ├── authService.ts          # Supabase auth, account management
│   ├── claudeService.ts        # Note parsing, intent extraction, time/location detection
│   ├── notesService.ts         # Notes CRUD, task management, shopping lists
│   ├── reminderService.ts      # Reminder scheduling, recurring logic, completions
│   ├── notificationService.ts  # Notification scheduling, natural language time parsing
│   ├── locationService.ts      # Geofencing, saved locations, background monitoring
│   ├── journalService.ts       # Photo storage, stats, timeline
│   ├── journalInsightsService.ts       # AI journal insights
│   ├── journalNotificationService.ts   # Weekly journal reminders
│   ├── voiceService.ts         # Audio recording, Whisper transcription
│   ├── speechRecognitionService.ts     # Native speech recognition (stub for Expo Go)
│   ├── profileService.ts       # User profile, onboarding
│   ├── profileAnalysisService.ts       # AI note analysis, profile inference
│   ├── preferencesService.ts   # User preferences (wake/sleep, tone, geofence)
│   ├── taskEnrichmentService.ts        # AI-generated links & tips for tasks
│   ├── googlePlacesService.ts  # Address autocomplete & place details
│   ├── smartNotificationEngine.ts      # Personalized daily notifications
│   └── onboardingNotificationService.ts # First-week feature discovery notifications
├── config/
│   ├── supabase.ts             # Supabase client setup
│   ├── env.ts                  # Environment variables
│   └── env.example.ts          # Env template
├── context/                    # React Context (theme)
├── theme/                      # Design tokens, colors, typography
├── database/
│   ├── user_profile_schema.sql
│   └── migrations/             # SQL migrations
└── assets/                     # Icons, images, splash screens
```

## External Services

| Service | Purpose |
|---------|---------|
| **Supabase** | Authentication (email/password + Google OAuth), PostgreSQL database, Row Level Security |
| **DeepSeek API** | AI note parsing, task enrichment, journal insights, profile analysis, smart notifications |
| **OpenAI Whisper API** | Voice-to-text transcription |
| **Google Places API** | Address autocomplete, place details (optional) |

## Database Tables

All tables use Supabase Row Level Security - users can only access their own data.

| Table | Purpose |
|-------|---------|
| `notes` | Voice/text notes with parsed data, reminder fields, location categories, shopping items |
| `user_profiles` | Personality traits, inferred interests/dislikes, onboarding state, AI context |
| `user_preferences` | Wake/sleep times, notification tone, geofence settings |
| `saved_locations` | Geofenced locations (home, work, gym) with coordinates and radius |
| `reminder_completions` | Tracks recurring reminder completion by date |
| `onboarding_responses` | Individual onboarding question responses |
| `place_suggestions` | AI-generated place suggestions with feedback status |
| `plan_patterns` | Liked/disliked activity types and venues |
| `note_place_results` | Cached Google Places search results linked to notes |

## Device Permissions

| Permission | Purpose |
|-----------|---------|
| Microphone | Record voice notes |
| Location (When In Use) | Location-based reminders via geofencing |
| Camera | Capture photos for journal |
| Photo Library | Import photos for journal |
| Speech Recognition | On-device speech-to-text (dev builds only) |
| Notifications | Reminders, smart notifications, journal prompts |

## Getting Started

### Prerequisites
- Node.js
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or physical device with Expo Go

### Setup

```bash
cd notes
npm install
```

### Environment Variables

Set these via EAS Secrets for production builds, or in a local `.env`:

```
DEEPSEEK_API_KEY=        # Required - AI features
OPENAI_API_KEY=          # Required - Voice transcription
GOOGLE_PLACES_API_KEY=   # Optional - Address autocomplete
```

Supabase credentials are configured in `config/supabase.ts`.

### Run

```bash
npx expo start          # Start dev server
npx expo run:ios        # Run on iOS (dev build, enables native speech recognition)
npx expo run:android    # Run on Android
```

### Build

```bash
eas build --profile development --platform ios     # Dev build
eas build --profile preview --platform ios          # Preview build
eas build --profile production --platform ios       # Production build
```

## Authentication

- Email/password signup with email verification
- Google OAuth via Supabase
- Password requirements: 8+ characters, 1 letter, 1 number, 1 special character
- Session persistence via AsyncStorage
- Account deletion available (removes all user data)

## App Identifiers

- **Bundle ID (iOS):** `com.notesapp.voicenotes`
- **Package Name (Android):** `com.notesapp.voicenotes`
- **EAS Project ID:** `d676cf2a-5bc7-4bf8-b616-7ccb12f07aa4`
