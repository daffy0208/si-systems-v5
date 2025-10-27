# SI Systems Dashboard

Real-time visualization dashboard for SI Systems drift detection platform. Built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## Overview

The SI Systems Dashboard provides a modern, responsive interface for monitoring identity alignment in real-time during AI interactions. It visualizes drift detection metrics across four key dimensions: tone, values, rhythm, and context.

## Features

### Core Components

1. **Drift Score Gauge** (`DriftScoreGauge.tsx`)
   - Real-time drift score visualization using radial gauge
   - Color-coded status indicators (green/amber/red)
   - Inverted display: shows alignment percentage (higher is better)
   - Confidence score display
   - Smooth transitions with CSS animations

2. **Drift History Chart** (`DriftHistoryChart.tsx`)
   - Area chart showing drift trends over last 50 interactions
   - Real-time updates as new data arrives
   - Threshold markers for alignment levels
   - Interactive tooltips with detailed metrics
   - Responsive design adapts to screen size

3. **Dimension Breakdown** (`DimensionBreakdown.tsx`)
   - Horizontal bar chart for four alignment dimensions:
     - Tone alignment
     - Value alignment
     - Rhythm alignment
     - Context alignment
   - Color-coded bars based on drift level
   - Individual dimension metrics

4. **Flag Alerts List** (`FlagAlertsList.tsx`)
   - Real-time alert panel for active drift flags
   - Severity-based visual indicators
   - Empty state when no drift detected
   - Grouped by drift level

5. **Theme System**
   - Dark mode support with `next-themes`
   - System preference detection
   - Manual toggle in header
   - Persistent theme selection (localStorage)
   - Optimized for both light and dark viewing

### Technical Architecture

**Frontend:**
- Next.js 15 with App Router
- React 19 with Server Components
- TypeScript for type safety
- Tailwind CSS for styling
- Recharts for data visualization

**State Management:**
- Custom `useDriftData` hook for data fetching
- Real-time polling (configurable interval, default 3s)
- Error handling and loading states
- Automatic retry on failure

**API Layer:**
- Next.js API routes (`/api/drift`)
- GET endpoint for current score + history
- POST endpoint for analyzing new interactions
- Integration with `@si-systems/core` library

**Data Flow:**
```
SI Systems Core Library
    ↓
DriftClient (wrapper)
    ↓
API Routes (/api/drift)
    ↓
useDriftData Hook (polling)
    ↓
Dashboard Components
```

## Installation

### Prerequisites

- Node.js 20+
- npm or pnpm
- SI Systems Core library (installed as local dependency)

### Setup

```bash
# Navigate to dashboard directory
cd dashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
dashboard/
├── app/                          # Next.js App Router
│   ├── api/
│   │   └── drift/
│   │       └── route.ts         # Drift detection API endpoint
│   ├── dashboard/
│   │   └── page.tsx             # Main dashboard page
│   ├── layout.tsx               # Root layout with theme provider
│   ├── page.tsx                 # Home page (redirects to dashboard)
│   └── globals.css              # Global styles + Tailwind
│
├── components/
│   ├── dashboard/               # Dashboard-specific components
│   │   ├── DashboardShell.tsx  # Main layout shell
│   │   ├── DriftScoreGauge.tsx # Radial gauge for overall score
│   │   ├── DriftHistoryChart.tsx # Area chart for trend history
│   │   ├── DimensionBreakdown.tsx # Bar chart for dimensions
│   │   └── FlagAlertsList.tsx   # Alert panel for flags
│   ├── providers/
│   │   └── ThemeProvider.tsx    # Theme context provider
│   └── ui/                      # Reusable UI components
│       ├── Badge.tsx
│       ├── Card.tsx
│       └── ThemeToggle.tsx
│
├── hooks/
│   └── useDriftData.ts          # Data fetching hook
│
├── lib/
│   ├── drift-client.ts          # DriftClient wrapper class
│   ├── types.ts                 # TypeScript type definitions
│   └── utils.ts                 # Utility functions
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── README.md                     # This file
```

## Component API

### DriftScoreGauge

```tsx
interface DriftScoreGaugeProps {
  score: number;        // Drift score (0-1, lower is better)
  confidence: number;   // Confidence in detection (0-1)
}
```

### DriftHistoryChart

```tsx
interface DriftHistoryChartProps {
  history: DriftDataPoint[];  // Array of historical data points
}

interface DriftDataPoint {
  timestamp: number;
  score: number;
  dimensions: {
    toneAlignment: number;
    valueAlignment: number;
    rhythmAlignment: number;
    contextAlignment: number;
  };
}
```

### DimensionBreakdown

```tsx
interface DimensionBreakdownProps {
  dimensions: {
    toneAlignment: number;
    valueAlignment: number;
    rhythmAlignment: number;
    contextAlignment: number;
  };
}
```

### FlagAlertsList

```tsx
interface FlagAlertsListProps {
  flags: string[];        // Array of alert messages
  overallScore: number;   // Overall drift score for severity
}
```

## Configuration

### Polling Interval

Adjust real-time update frequency in `app/dashboard/page.tsx`:

```tsx
const { currentScore, history, isLoading, error } = useDriftData(3000) // 3 seconds
```

### History Limit

Change maximum stored history points in `app/api/drift/route.ts`:

```tsx
driftClient = new DriftClient(identity, 0.2, 50) // Last parameter = max points
```

### Drift Thresholds

Modify drift level thresholds in `lib/utils.ts`:

```tsx
export function getDriftLevel(score: number): DriftLevel {
  if (score < 0.2) return 'safe'      // < 20% drift = safe
  if (score < 0.4) return 'warning'   // 20-40% drift = warning
  return 'danger'                      // > 40% drift = danger
}
```

### Theme Colors

Customize semantic colors in `lib/utils.ts`:

```tsx
export function getDriftColor(level: DriftLevel): string {
  const colors = {
    safe: '#10b981',    // green-500
    warning: '#f59e0b', // amber-500
    danger: '#ef4444',  // red-500
  }
  return colors[level]
}
```

## API Endpoints

### GET /api/drift

Returns current drift score and history.

**Response:**
```json
{
  "currentScore": {
    "overall": 0.15,
    "dimensions": {
      "toneAlignment": 0.12,
      "valueAlignment": 0.18,
      "rhythmAlignment": 0.14,
      "contextAlignment": 0.16
    },
    "flags": [],
    "recommendation": "Continue monitoring interactions",
    "confidence": 0.85
  },
  "history": [
    {
      "timestamp": 1234567890,
      "score": 0.15,
      "dimensions": { ... }
    }
  ]
}
```

### POST /api/drift

Analyze a new interaction and return drift score.

**Request:**
```json
{
  "userMessage": "What are my account options?",
  "aiResponse": "I can help you with that! Let me explain..."
}
```

**Response:**
```json
{
  "score": {
    "overall": 0.15,
    "dimensions": { ... },
    "flags": [],
    "recommendation": "...",
    "confidence": 0.85
  },
  "history": { ... }
}
```

## Integration with SI Systems Core

The dashboard integrates with the SI Systems core library via the `DriftClient` wrapper:

```typescript
import { DriftClient, createSampleIdentity } from '@/lib/drift-client'

// Create client with identity profile
const identity = createSampleIdentity()
const client = new DriftClient(identity, 0.2, 50)

// Detect drift
const score = await client.detectDrift({
  userMessage: "...",
  aiResponse: "..."
})

// Get history
const history = client.getHistory()
```

## Mock Data vs. Live Data

**Current State (P1-1a):** Uses in-memory mock data via API routes

**Future State (P1-3):** Will connect to persistence layer for:
- Historical conversation data
- Session-based tracking
- Database-backed storage
- Multi-user support

## Design System

### Colors

**Semantic Colors:**
- Safe (Aligned): `green-500` (#10b981)
- Warning (Minor Drift): `amber-500` (#f59e0b)
- Danger (Significant Drift): `red-500` (#ef4444)

**Base Palette:**
- Background Light: `slate-50`
- Background Dark: `slate-950`
- Card Light: `white`
- Card Dark: `slate-900`
- Text Light: `slate-900`
- Text Dark: `slate-50`

### Typography

- Font: Inter (Google Fonts)
- Headings: Bold, varying sizes
- Body: Regular, 14px base
- Code: Monospace

### Spacing

Using Tailwind's default spacing scale (4px base unit)

### Responsive Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast meets WCAG AA standards
- Focus indicators on interactive elements
- Screen reader friendly

## Performance

- Server Components for static content
- Client Components only where needed
- Optimized chart rendering with Recharts
- Throttled polling to reduce server load
- Memoized calculations in charts
- CSS transitions for smooth animations

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile Safari: iOS 15+
- Chrome Mobile: Android 10+

## Development

### Running Tests

```bash
# Run component tests (when implemented)
npm test

# Run E2E tests (when implemented)
npm run test:e2e
```

### Code Quality

```bash
# Lint code
npm run lint

# Type check
npm run type-check
```

### Development Tips

1. **Hot Reload:** Changes to components trigger instant reload
2. **API Testing:** Use `/api/drift` directly for testing
3. **Theme Testing:** Toggle dark mode to verify styling
4. **Responsive Testing:** Use browser dev tools device emulation

## Known Issues & Limitations

1. **In-Memory State:** API routes use in-memory state (resets on server restart)
2. **Single User:** No multi-user support yet (P2-3 feature)
3. **No Persistence:** History clears on page refresh (P1-3 will add DB)
4. **Mock Data:** Currently uses sample identity (user profiles in P2-1)

## Future Enhancements (P2-1)

Planned for advanced dashboard phase:

- Identity profile editor (CRUD for Identity objects)
- Historical drift trends (weekly, monthly aggregations)
- Heatmap visualization (drift patterns over time)
- Session comparison tool
- Alert configuration panel
- Export reports (PDF, CSV)
- Real-time notifications
- Custom threshold configuration

## Integration Plan (P1-3)

To connect to persistence layer:

1. **Update API Routes:**
   ```typescript
   // Replace in-memory client with DB client
   import { PersistenceService } from '@si-systems/core'

   const db = new DatabaseConnection('drift.db')
   const persistence = new PersistenceService(db)
   ```

2. **Add Session Support:**
   ```typescript
   // Track sessions
   const sessionId = await persistence.createSession(identity)

   // Store exchanges
   await persistence.recordExchange(sessionId, userMessage, aiResponse, driftScore)
   ```

3. **Query Historical Data:**
   ```typescript
   // Get session history
   const summary = await persistence.getSessionSummary(sessionId)

   // Get drift trends
   const trends = await persistence.getDriftTrends(sessionId)
   ```

## Contributing

When adding new features:

1. Follow existing component patterns
2. Use TypeScript for type safety
3. Maintain responsive design
4. Support both light and dark themes
5. Add JSDoc comments for public APIs
6. Test across breakpoints
7. Ensure accessibility standards

## License

MIT License - See parent project for details

## Contact

For questions or issues, contact the SI Systems development team.

---

**Version:** 0.1.0 (P1-1a Complete)
**Last Updated:** 2025-10-27
**Status:** Basic Dashboard Complete - Ready for P1-3 Integration
