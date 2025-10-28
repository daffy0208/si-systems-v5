# SI Systems Dashboard - Quick Setup Guide

## Prerequisites

- Node.js 20 or higher
- npm (comes with Node.js)
- SI Systems Core library (parent directory)

## Installation Steps

### 1. Install Dependencies

```bash
cd dashboard
npm install
```

This will install:
- Next.js 15
- React 19
- Tailwind CSS
- Recharts (charts library)
- next-themes (dark mode)
- TypeScript and related types
- @si-systems/core (local dependency from parent)

### 2. Verify Core Library Link

The dashboard depends on the parent SI Systems core library:

```bash
# From dashboard directory
npm ls @si-systems/core
```

Expected output:
```
si-systems-dashboard@0.1.0 /path/to/dashboard
└── @si-systems/core@0.1.0 -> ./../
```

If the link is broken, reinstall:

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The dashboard will start on `http://localhost:3000`

### 4. Verify Dashboard

Open `http://localhost:3000` in your browser. You should see:

1. **Header** with "SI Systems Dashboard" title and theme toggle
2. **Drift Score Gauge** showing alignment percentage with radial chart
3. **Flag Alerts** panel (empty if no drift detected)
4. **Dimension Breakdown** bar chart showing 4 alignment dimensions
5. **Drift History Chart** area chart with trend over time
6. **Recommendation** panel at bottom

### 5. Test Features

**Theme Toggle:**
- Click the sun/moon icon in the header
- Dashboard should switch between light and dark modes
- Theme persists across page refreshes

**Real-Time Updates:**
- Dashboard polls API every 3 seconds
- Watch the drift history chart update automatically
- Score should change as new mock data is generated

**Responsive Design:**
- Resize browser window
- Layout adapts to mobile, tablet, and desktop views
- Charts remain readable at all sizes

## Troubleshooting

### Issue: "Cannot find module '@si-systems/core'"

**Solution:**
```bash
# From dashboard directory
cd ..
npm install
npm run build
cd dashboard
npm install
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Issue: Dark mode not working

**Solution:**
Clear localStorage and refresh:
```javascript
// In browser console
localStorage.clear()
location.reload()
```

### Issue: Charts not rendering

**Solution:**
```bash
# Reinstall recharts
npm uninstall recharts
npm install recharts@^2.15.1
```

### Issue: TypeScript errors

**Solution:**
```bash
# Regenerate Next.js types
rm -rf .next
npm run dev
```

## Development Workflow

### Making Changes

1. **Edit Components:** Files hot-reload automatically
2. **Add New Components:** Create in `components/` directory
3. **Update Styles:** Modify `app/globals.css` or use Tailwind classes
4. **Change API Logic:** Edit `app/api/drift/route.ts`

### File Watch

Next.js watches these directories:
- `app/` - Pages and API routes
- `components/` - React components
- `lib/` - Utilities and types
- `hooks/` - Custom React hooks

### Debugging

**Enable verbose logging:**
```bash
DEBUG=* npm run dev
```

**View API responses:**
```javascript
// In browser console
fetch('/api/drift')
  .then(r => r.json())
  .then(console.log)
```

**Check for errors:**
- Browser DevTools → Console
- Terminal running `npm run dev`
- Network tab for API calls

## Building for Production

### Build

```bash
npm run build
```

This creates optimized production build in `.next/`

### Start Production Server

```bash
npm start
```

Production server runs on `http://localhost:3000`

### Preview Build

```bash
npm run build && npm start
```

## Environment Variables

Create `.env.local` for custom configuration:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Polling Interval (milliseconds)
NEXT_PUBLIC_POLL_INTERVAL=3000

# Maximum History Points
NEXT_PUBLIC_MAX_HISTORY=50
```

**Note:** Restart dev server after changing environment variables.

## Integration Testing

### Test API Endpoint

```bash
# GET current drift data
curl http://localhost:3000/api/drift

# POST new interaction
curl -X POST http://localhost:3000/api/drift \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Test message",
    "aiResponse": "Test response"
  }'
```

### Test Components

```bash
# Install testing dependencies (when tests are added)
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Run tests
npm test
```

## Next Steps

After setup:

1. **Explore Components:** Check `components/dashboard/` for UI components
2. **Review Types:** See `lib/types.ts` for data structures
3. **Customize Styling:** Edit Tailwind config in `tailwind.config.js`
4. **Add Features:** Refer to P2-1 task for advanced features
5. **Connect Persistence:** Wait for P1-3 completion for database integration

## Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Run production build
npm run lint         # Run ESLint

# Dependencies
npm install          # Install dependencies
npm update           # Update dependencies
npm outdated         # Check for outdated packages

# Cleaning
rm -rf .next         # Clear build cache
rm -rf node_modules  # Remove dependencies
npm install          # Fresh install
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts Documentation](https://recharts.org/)
- [SI Systems Core Library](../README.md)

## Support

If you encounter issues:

1. Check this SETUP.md for solutions
2. Review dashboard README.md for component details
3. Check parent project documentation
4. Verify Node.js and npm versions
5. Try fresh install: `rm -rf node_modules && npm install`

---

**Setup Complete!** The dashboard should now be running at `http://localhost:3000`
