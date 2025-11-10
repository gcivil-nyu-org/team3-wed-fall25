# Current Logic Explanation

## What's Happening Now

### 1. **Backend (Database Query)**
- **Location**: `backend/infrastructures/postgres/neighborhood_repository.py`
- **Query**: Gets violations data from `building_evictions` and `building_violations` tables
- **Problem**: Orders by `COUNT DESC` and limits to 20,000
  ```sql
  ORDER BY COALESCE(v.violation_count, 0) DESC LIMIT 20000
  ```
- **Result**: Only returns the TOP 20,000 buildings with highest counts
- **This means**: We're missing all the low-count buildings!

### 2. **Frontend Data Loading**
- **Location**: `frontend/src/pages/NewSimplifiedMap.tsx`
- **Process**:
  1. Fetches data from API (max 20,000 points)
  2. Validates coordinates
  3. **Samples again**: Takes only 10,000 points (30% low, 40% med, 30% high)
  4. Sets state with sampled data

### 3. **Heatmap Component**
- **Location**: `frontend/src/components/TrueHeatmap.tsx`
- **Problems**:
  - **Re-renders on zoom**: `zoom` is in dependency array, so zooming triggers recalculation
  - **Logarithmic normalization**: Recalculates min/max on every render
  - **Radius/blur changes**: Adjusts with zoom level
  - **Creates invisible markers**: For click detection (performance issue with many points)

### 4. **Current Flow**
```
User changes filter
  ↓
API call (gets top 20,000 by count DESC)
  ↓
Frontend samples to 10,000
  ↓
Heatmap component receives data
  ↓
Calculates log normalization (recalculates min/max)
  ↓
Creates heat layer
  ↓
User zooms → Re-renders everything (BAD!)
```

## Why It's Not Working

1. **Only top points**: Backend returns highest counts only
2. **Double sampling**: Backend limits + frontend samples = missing data
3. **Zoom triggers re-render**: Colors/calculations change on zoom
4. **Inefficient**: Recalculates everything unnecessarily

## What We Need

1. **Static heatmap**: Only updates when filters change
2. **Use ALL data**: No sampling, no limits
3. **Simple calculations**: Pre-calculate once, reuse
4. **No zoom dependency**: Same colors at all zoom levels
5. **Performance**: Use efficient rendering (canvas-based)

