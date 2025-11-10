# Hardcoding/Caching Options for Static Heatmap Data

## Current Situation
- Data is **static** (doesn't change frequently)
- Map is **laggy** with 50k+ points
- Users need to **zoom in** to see data
- Visualization is **jarring** with huge hotspots

## Option 1: Pre-computed Aggregated Data (Recommended)
**Best for: Smooth Google Maps-like experience**

### Approach:
1. **Backend**: Create a scheduled job that pre-computes heatmap data
2. **Aggregation**: Group data by grid cells (e.g., 0.01° lat/lng squares)
3. **Storage**: Store aggregated data in a cache table or JSON file
4. **Frontend**: Load pre-computed data instantly

### Implementation:
```python
# Backend: Create aggregated_heatmap_data table
CREATE TABLE aggregated_heatmap_data (
    grid_cell_id VARCHAR(20) PRIMARY KEY,
    center_lat DECIMAL(10,7),
    center_lng DECIMAL(10,7),
    data_type VARCHAR(20),
    borough VARCHAR(50),
    total_count INT,
    avg_intensity DECIMAL(5,3),
    max_intensity DECIMAL(5,3),
    building_count INT,
    last_updated TIMESTAMP
);

# Scheduled job runs daily/weekly
# Aggregates all data into ~500-1000 grid cells
# Frontend loads instantly with smooth rendering
```

**Pros:**
- ✅ Instant loading
- ✅ Smooth rendering (500-1000 points vs 50k)
- ✅ True heatmap appearance
- ✅ Scales with zoom (load different grid sizes)

**Cons:**
- ⚠️ Requires backend changes
- ⚠️ Less granular detail

---

## Option 2: Frontend Caching with LocalStorage
**Best for: Quick fix without backend changes**

### Approach:
1. **First Load**: Fetch full dataset, cache in localStorage
2. **Subsequent Loads**: Use cached data
3. **Refresh**: Check timestamp, refresh if > 24 hours old

### Implementation:
```typescript
// Cache key: `heatmap_data_${dataType}_${borough}`
// Store: { data: HeatmapPoint[], timestamp: number }
// Check: if (Date.now() - cached.timestamp < 24*60*60*1000) use cache
```

**Pros:**
- ✅ No backend changes
- ✅ Fast after first load
- ✅ Works offline

**Cons:**
- ⚠️ Still slow on first load
- ⚠️ Large localStorage usage (~5-10MB)

---

## Option 3: Static JSON Files
**Best for: Completely static data**

### Approach:
1. **Backend Script**: Export heatmap data to JSON files
2. **Frontend**: Load from `/static/data/violations.json`, etc.
3. **Build Time**: Include in frontend build

### Implementation:
```bash
# Backend script
python export_heatmap_data.py --output frontend/public/data/

# Frontend
import violationsData from '/data/violations.json';
```

**Pros:**
- ✅ Instant loading (no API calls)
- ✅ Can be CDN-cached
- ✅ Works offline

**Cons:**
- ⚠️ Large bundle size
- ⚠️ Requires rebuild to update
- ⚠️ No dynamic filtering

---

## Option 4: Hybrid Approach (Recommended)
**Best for: Best of all worlds**

### Approach:
1. **Initial Load**: Pre-computed aggregated data (fast)
2. **Zoom In**: Load detailed data for viewport (on-demand)
3. **Caching**: Cache both aggregated and detailed data

### Implementation:
```typescript
// Initial: Load aggregated data (500-1000 points)
// Zoom > 13: Load detailed data for viewport (2000-5000 points)
// Cache both in memory + localStorage
```

**Pros:**
- ✅ Fast initial load
- ✅ Detailed data when needed
- ✅ Smooth experience
- ✅ Scales well

**Cons:**
- ⚠️ More complex implementation

---

## Recommendation: **Option 1 + Option 4 Hybrid**

### Phase 1 (Quick Fix - This Week):
1. ✅ Reduce data points (already done: 3000 max)
2. ✅ Fix initial view (ensure data shows on load)
3. ✅ Reduce hotspot sizes (already done)
4. ✅ Add frontend caching (localStorage)

### Phase 2 (Better Solution - Next Week):
1. Create backend aggregation script
2. Pre-compute grid-based heatmap data
3. Store in cache table or JSON
4. Frontend loads aggregated data instantly
5. Load detailed data on zoom

### Phase 3 (Production Ready):
1. Scheduled job updates aggregated data daily
2. CDN caching for static JSON files
3. Progressive loading (aggregated → detailed)

---

## Quick Implementation Plan

### Immediate (Today):
1. Fix initial view to show data immediately
2. Reduce hotspot sizes further
3. Add localStorage caching
4. Improve zoom-based rendering

### This Week:
1. Create aggregation script
2. Export to JSON files
3. Frontend loads from static files
4. Fallback to API if files missing

### Next Week:
1. Backend scheduled job
2. Database cache table
3. Progressive loading system

---

## Code Changes Needed

### Backend:
- `backend/crawlers/aggregate_heatmap_data.py` - New script
- `backend/apps/neighborhood/views.py` - Add cached endpoint
- Database migration for cache table

### Frontend:
- `frontend/src/utils/heatmapCache.ts` - Caching utility
- `frontend/src/pages/SimplifiedMap.tsx` - Use cached data
- `frontend/public/data/` - Static JSON files

---

## Questions to Discuss:
1. How often does data update? (Daily? Weekly? Monthly?)
2. Can we pre-compute all combinations? (3 data types × 5 boroughs = 15 files)
3. What's the acceptable bundle size? (JSON files might be 5-10MB)
4. Do we need real-time updates or is daily/weekly refresh OK?

