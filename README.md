# StudyNinja — SAT Practice App

An AI-powered SAT prep iOS app built with React Native and Expo. StudyNinja generates personalized practice questions, tracks your progress across every SAT domain, and estimates your score so you always know where you stand.

## Features

- **AI-generated questions** — On-demand math and reading/writing questions tailored to topic, subtopic, and difficulty
- **Full SAT domain coverage** — All College Board math and reading/writing domains
- **Daily practice goals** — Set daily question targets and track streaks
- **SAT score estimator** — Predicts your composite score with confidence range based on performance data
- **Per-choice explanations** — Every question includes explanations for all four answer choices
- **Onboarding flow** — Captures target score and study schedule to personalize the experience
- **Auth** — Apple Sign-In and Google Sign-In, backed by Supabase
- **Subscriptions** — RevenueCat-powered premium tier with monthly question limits

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo (SDK 53) |
| Language | TypeScript |
| Navigation | React Navigation (stack + bottom tabs) |
| Backend / DB | Supabase |
| Auth | Apple Sign-In, Google Sign-In |
| Payments | RevenueCat |
| Math rendering | react-native-katex, react-native-math-view |
| Build | EAS Build |

## Project Structure

```
src/
├── screens/          # App screens (Home, Practice, Test, Profile, Auth, Onboarding)
├── services/         # Business logic (question generation, score estimator, auth, RevenueCat)
├── components/       # Shared UI components
├── hooks/            # Custom hooks (useAuth, etc.)
├── navigation/       # Stack and tab navigator definitions
├── config/           # Supabase client config
└── types/            # Shared TypeScript types and SAT domain definitions
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or physical device (iOS 13.4+)
- Supabase project with question generation edge functions deployed

### Install

```bash
npm install
```

### Environment

Create a `.env` file (or set in `app.json` extra) with your Supabase URL and anon key:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Add your `GoogleService-Info.plist` for Google Sign-In.

### Run

```bash
# iOS Simulator
npm run ios

# Expo Go / dev build
npm start
```

### Build

```bash
eas build --platform ios
```

## License

Private — all rights reserved.
