# Testing Documentation

## Overview

This project uses **Vitest** for testing with a hybrid module system to support both Electron desktop app and comprehensive unit tests.

## Test Setup

### Test Framework
- **Vitest** - Modern, fast testing framework (Jest-compatible API)
- **jsdom** - DOM simulation for testing browser APIs
- **Test Files**: All tests are in the `tests/` directory with `.test.mjs` extension

### Test Coverage
- **41 tests** covering all utility functions
- **100% passing** test suite
- Tests include:
  - Date utilities (formatting, parsing, calculations)
  - Streak calculation logic
  - Study time aggregation
  - Project filtering and distribution
  - Heatmap color bucket calculations

## Running Tests

```bash
# Run tests once
npm run test:run

# Run tests in watch mode (auto-rerun on file changes)
npm test

# Run tests with interactive UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Architecture: ES Modules + CommonJS Hybrid

### The Challenge
Electron apps using `file://` protocol have compatibility issues with ES modules, but modern test frameworks (like Vitest) work best with ES modules.

### The Solution: File Extension Separation

We use explicit file extensions to maintain two separate module systems:

#### App Files (CommonJS - Traditional JavaScript)
- **Extension**: `.js`
- **Files**: `main.js`, `electron-main.js`
- **Module System**: CommonJS (traditional)
- **Why**: Works perfectly with Electron's `file://` protocol
- **No `"type": "module"`** in package.json

#### Test Files (ES Modules)
- **Extension**: `.mjs` (explicit ES module)
- **Files**:
  - `vitest.config.mjs` - Test configuration
  - `tests/setup.mjs` - Mock setup for browser APIs
  - `tests/utils.test.mjs` - Test suites
  - `utils.mjs` - Utility functions for testing
- **Module System**: ES Modules (`import`/`export`)
- **Why**: Vitest (runs in Node.js) handles ES modules natively

### Code Organization

```
Pomo-Doll/
├── main.js                   # App code (ALL functionality)
├── electron-main.js          # Electron main process
├── utils.mjs                 # Utility functions (FOR TESTING ONLY)
├── vitest.config.mjs         # Vitest configuration
├── package.json              # No "type": "module"
└── tests/
    ├── setup.mjs             # Test mocks (localStorage, Audio, etc.)
    └── utils.test.mjs        # Test suites
```

## Code Duplication Strategy

### Why Duplicate?
Pure utility functions exist in **two places**:
1. **`main.js`** - Used by the app
2. **`utils.mjs`** - Used by tests

This is **intentional and healthy duplication** because:
- ✅ App remains simple with no build step
- ✅ Tests can import and test functions in isolation
- ✅ No complex bundler configuration needed
- ✅ Both app and tests work without conflicts

### What Gets Duplicated?
Only **pure utility functions** (no DOM, no browser APIs):
- `getLocalDateKey()` - Date formatting
- `getTodayKey()` - Get today's date key
- `calculateStreak()` - Calculate study streak
- `getDateRangeForFilter()` - Date range calculations
- `getTotalStudyTimeInRange()` - Sum study time
- `filterCompletedProjects()` - Filter projects by period
- `calculateDaysBetween()` - Date difference
- `formatDate()` - Format ISO dates
- `calculateProjectDistribution()` - Project time distribution
- `buildThresholds()` - Heatmap thresholds
- `computeColorBucket()` - Heatmap color buckets

**Total duplication**: ~200 lines out of 960 lines in main.js (~20%)

### What Does NOT Get Duplicated?
- DOM manipulation code
- Event listeners
- Browser API calls (localStorage, Audio, Notification)
- UI rendering functions
- Timer logic

## Adding New Features with Tests

When adding new functionality:

### 1. Write the Feature
Add your code to `main.js` as usual:

```javascript
// In main.js
function myNewUtilityFunction(input) {
  // Pure logic, no DOM
  return input * 2;
}
```

### 2. Decide If It Needs Tests
Ask: Is this a **pure utility function**?
- ✅ Takes inputs, returns outputs
- ✅ No DOM manipulation
- ✅ No browser APIs
- ✅ Just logic/calculations

If YES → Add to tests

### 3. Duplicate to utils.mjs
```javascript
// In utils.mjs
export function myNewUtilityFunction(input) {
  // Exact copy from main.js
  return input * 2;
}
```

### 4. Write Tests
```javascript
// In tests/utils.test.mjs
import { myNewUtilityFunction } from '../utils.mjs';

describe('myNewUtilityFunction', () => {
  it('should double the input', () => {
    expect(myNewUtilityFunction(5)).toBe(10);
  });
});
```

## Mocking Strategy

Browser APIs are mocked in `tests/setup.mjs`:

### localStorage Mock
```javascript
const localStorageMock = {
  getItem: (key) => store[key] || null,
  setItem: (key, value) => { store[key] = value.toString(); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { store = {}; }
};
```

### Audio Mock
```javascript
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  volume: 0.3,
}));
```

### Notification Mock
```javascript
global.Notification = vi.fn();
```

## Common Testing Patterns

### Testing Date Functions
Always use explicit date construction to avoid timezone issues:
```javascript
// ❌ BAD - Timezone issues
const date = new Date('2024-03-01');

// ✅ GOOD - Explicit local date
const date = new Date(2024, 2, 1); // March 1, 2024 (month is 0-indexed)
```

### Testing with Current Date
Use dynamic dates when testing "this month" or "today":
```javascript
const now = new Date();
const today = getLocalDateKey(now);
```

### Testing Date Ranges
Ensure date loops don't mutate the date object:
```javascript
// ✅ GOOD - Create new date for loop
const current = new Date(startDate);
while (current <= endDate) {
  // use current
  current.setDate(current.getDate() + 1);
}
```

## Troubleshooting

### Tests Fail After App Changes
If you modified a utility function in `main.js`:
1. Update the same function in `utils.mjs`
2. Update tests if behavior changed
3. Run `npm test` to verify

### App Won't Start
- Check that `main.js` has NO `import` statements
- Verify `package.json` has NO `"type": "module"`
- Check `index.html` loads `main.js` without `type="module"`

### Tests Won't Run
- Ensure test files use `.mjs` extension
- Verify `utils.mjs` exports functions correctly
- Check `vitest.config.mjs` is present

## Benefits of This Approach

✅ **Simple** - No build step, no bundler
✅ **Fast** - Tests run in ~1 second
✅ **Reliable** - Both app and tests always work
✅ **Maintainable** - Clear separation of concerns
✅ **Flexible** - Easy to add new tests
✅ **Compatible** - Works with both Electron and web browsers

## Alternative Approaches (Not Used)

### Why Not Use a Bundler?
- ❌ Adds complexity (Webpack/Vite configuration)
- ❌ Requires build step before running app
- ❌ More dependencies to maintain
- ✅ Our approach: Zero build step, works immediately

### Why Not Convert Everything to ES Modules?
- ❌ Electron has issues with ES modules over `file://`
- ❌ Would require `nodeIntegration: true` (security risk)
- ❌ More complex to configure
- ✅ Our approach: Works out of the box

### Why Not Use Different Test Framework?
- ❌ Jest requires more configuration for ES modules
- ❌ Mocha doesn't include assertions/mocking
- ✅ Vitest: Fast, modern, zero-config ES module support

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [ES Modules in Node.js](https://nodejs.org/api/esm.html)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
