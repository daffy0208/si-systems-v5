# Dashboard Screenshots Guide

Since I cannot create actual screenshots, here's what you would see when viewing the dashboard:

## Main Dashboard View (Light Mode)

**URL:** `http://localhost:3000/dashboard`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                  [🌙] │
│ SI Systems Dashboard                                         │
│ Real-time identity alignment monitoring                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐ ┌─────────────────────────┐
│ Identity Alignment      [🟢]  │ │ Active Alerts      [0] │
│                               │ │                         │
│        ┌────────┐            │ │   ✓ No drift detected   │
│        │   88%  │            │ │                         │
│        │Radial  │            │ │   All dimensions within │
│        │ Gauge  │            │ │   alignment threshold   │
│        └────────┘            │ │                         │
│                               │ │                         │
│  Confidence: 85%              │ │                         │
│  AI responses are well-       │ │                         │
│  aligned with your identity   │ │                         │
└──────────────────────────────┘ └─────────────────────────┘

┌──────────────────────────────┐ ┌─────────────────────────┐
│ Dimension Breakdown           │ │ Drift History          │
│                               │ │ Last 10 interactions    │
│ Tone     ████████████░░ 88%   │ │                         │
│ Values   ██████████████ 92%   │ │ 100% ┐                 │
│ Rhythm   ███████████░░░ 85%   │ │      │    ╱─╲          │
│ Context  ████████████░░ 90%   │ │  80% │  ╱    ╲         │
│                               │ │      │ ╱      ╲─       │
│ [Legend with color dots]      │ │  60% └──────────────   │
└──────────────────────────────┘ └─────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ℹ️ Recommendation                                            │
│ Continue monitoring interactions                            │
└─────────────────────────────────────────────────────────────┘
```

**Colors:**
- Background: Light gray (#f8fafc)
- Cards: White with subtle shadows
- Safe metrics: Green (#10b981)
- Text: Dark gray (#0f172a)

## Main Dashboard View (Dark Mode)

**After clicking theme toggle (🌙 → ☀️)**

**Layout:** Same as above but with dark colors:

```
[Same layout as light mode]
```

**Colors:**
- Background: Very dark gray (#020617)
- Cards: Dark gray (#0f172a) with subtle borders
- Safe metrics: Green (#10b981)
- Text: Light gray (#f8fafc)

## Dashboard with Warning State

**When drift score is between 0.2 - 0.4:**

```
┌──────────────────────────────┐
│ Identity Alignment      [🟡]  │
│                               │
│        ┌────────┐            │
│        │   75%  │ <- Amber   │
│        │Radial  │            │
│        │ Gauge  │            │
│        └────────┘            │
│                               │
│  Some responses show minor    │
│  drift from your identity     │
└──────────────────────────────┘

┌─────────────────────────┐
│ Active Alerts      [2] │
│                         │
│ ⚠️ Tone drift detected   │
│                         │
│ ⚠️ Rhythm misalignment   │
└─────────────────────────┘
```

**Warning Indicators:**
- Badge: Amber/yellow
- Gauge: Amber colored
- Alert icons: Yellow warning triangles
- Bar charts: Amber bars for affected dimensions

## Dashboard with Danger State

**When drift score is above 0.4:**

```
┌──────────────────────────────┐
│ Identity Alignment      [🔴]  │
│                               │
│        ┌────────┐            │
│        │   55%  │ <- Red     │
│        │Radial  │            │
│        │ Gauge  │            │
│        └────────┘            │
│                               │
│  Significant drift detected   │
│  - review recommended         │
└──────────────────────────────┘

┌─────────────────────────┐
│ Active Alerts      [3] │
│                         │
│ 🚨 Tone drift detected   │
│                         │
│ 🚨 Value misalignment    │
│                         │
│ 🚨 Context drift         │
└─────────────────────────┘
```

**Danger Indicators:**
- Badge: Red
- Gauge: Red colored
- Alert icons: Red warning triangles
- Bar charts: Red bars for affected dimensions

## Loading State

**On initial load:**

```
┌─────────────────────────────────────────────┐
│                                             │
│              [Loading spinner]              │
│           Loading dashboard...              │
│                                             │
└─────────────────────────────────────────────┘
```

## Empty State

**When no data available:**

```
┌─────────────────────────────────────────────┐
│                                             │
│              [Science beaker icon]          │
│                                             │
│           No data available                 │
│                                             │
│  Start a conversation to see drift          │
│  detection in action. The dashboard         │
│  will update in real-time as                │
│  interactions are analyzed.                 │
│                                             │
└─────────────────────────────────────────────┘
```

## Mobile View (Portrait)

**On screens < 640px:**

```
┌──────────────────────────┐
│ SI Systems Dashboard [🌙]│
│ Real-time monitoring     │
├──────────────────────────┤
│ Identity Alignment  [🟢] │
│                          │
│     ┌──────────┐         │
│     │   88%    │         │
│     │  Gauge   │         │
│     └──────────┘         │
│                          │
│ Confidence: 85%          │
├──────────────────────────┤
│ Active Alerts       [0]  │
│                          │
│ ✓ No drift detected      │
├──────────────────────────┤
│ Dimension Breakdown      │
│                          │
│ Tone   ████████░░ 88%    │
│ Values ██████████ 92%    │
│ Rhythm ████████░░ 85%    │
│ Context ████████░ 90%    │
├──────────────────────────┤
│ Drift History            │
│                          │
│ [Compact area chart]     │
└──────────────────────────┘
```

**Mobile Optimizations:**
- Single column layout
- Stacked cards
- Compact charts
- Touch-friendly hit areas
- Reduced font sizes

## Interactive Elements

### Theme Toggle
**Light mode button:** 🌙 (Moon icon)
**Dark mode button:** ☀️ (Sun icon)
**Location:** Top right of header
**Action:** Click to toggle theme
**Persistence:** Saved to localStorage

### Chart Tooltips
**Hover over chart elements:**
```
┌─────────────────────┐
│ 10:45:32 AM        │
│ Alignment: 88.0%   │
│ Drift: 12.0%       │
└─────────────────────┘
```

### Dimension Bar Tooltips
**Hover over dimension bars:**
```
┌──────────────────┐
│ Tone             │
│ Drift: 12.0%     │
│ Alignment: 88%   │
└──────────────────┘
```

## Color Legend

### Drift Levels
- **Safe (0-20% drift):** Green (#10b981)
- **Warning (20-40% drift):** Amber (#f59e0b)
- **Danger (>40% drift):** Red (#ef4444)

### Threshold Markers
```
┌───────────────────────────────────┐
│ •  >80% Aligned                   │
│ •  60-80% Minor Drift             │
│ •  <60% Significant Drift         │
└───────────────────────────────────┘
```

## Real-Time Updates

**Visual Indicators:**
- Charts animate on data update
- Gauge smoothly transitions to new value
- Badges update count instantly
- No page flicker or reload

**Update Frequency:** Every 3 seconds (configurable)

## Responsive Breakpoints

### Mobile (< 640px)
- Single column layout
- Stacked components
- Reduced chart heights
- Compact legends

### Tablet (640px - 1024px)
- Two-column layout for some components
- Medium chart sizes
- Balanced spacing

### Desktop (> 1024px)
- Multi-column layout
- Full chart heights
- Optimal spacing
- Side-by-side comparisons

## Taking Your Own Screenshots

To capture screenshots:

1. **Start the dashboard:**
   ```bash
   cd dashboard
   npm run dev
   ```

2. **Open in browser:**
   - Navigate to `http://localhost:3000`

3. **Capture different states:**
   - **Normal:** Wait for data to load
   - **Dark mode:** Click theme toggle
   - **Mobile:** Use browser DevTools device emulation
   - **Warning:** Modify mock data to return score 0.3
   - **Danger:** Modify mock data to return score 0.5

4. **Recommended tools:**
   - Browser built-in screenshot (Cmd/Ctrl + Shift + S in Firefox)
   - Browser DevTools device toolbar
   - Full page screenshot extensions
   - Snipping tool (Windows) or Screenshot utility (Mac)

5. **Screenshot checklist:**
   - [ ] Main dashboard (light mode)
   - [ ] Main dashboard (dark mode)
   - [ ] Mobile view (portrait)
   - [ ] Mobile view (landscape)
   - [ ] Warning state
   - [ ] Danger state
   - [ ] Loading state
   - [ ] Empty state
   - [ ] Chart tooltips (hover state)
   - [ ] Theme toggle in action

## Video Demo Script

For a video walkthrough:

1. **Introduction (0:00-0:15)**
   - Show landing page
   - Explain purpose of dashboard

2. **Main Features (0:15-1:00)**
   - Point out drift score gauge
   - Show dimension breakdown
   - Explain drift history chart
   - Review flag alerts panel

3. **Real-Time Updates (1:00-1:30)**
   - Watch dashboard poll API
   - Show charts updating
   - Demonstrate smooth transitions

4. **Theme Toggle (1:30-1:45)**
   - Switch to dark mode
   - Show all components in dark theme

5. **Responsive Design (1:45-2:15)**
   - Resize browser window
   - Show mobile view
   - Show tablet view
   - Return to desktop view

6. **Interactive Elements (2:15-2:45)**
   - Hover over chart elements
   - Show tooltips
   - Demonstrate accessibility features

7. **Conclusion (2:45-3:00)**
   - Recap key features
   - Mention future enhancements

---

**Note:** These are textual representations. For actual visual screenshots, run the dashboard locally and capture images using your browser's screenshot tools.
