# Current Logic Explanation - Why You Only See Orange

## Step-by-Step What's Happening

### Step 1: Backend Query
```sql
SELECT 
    e.bbl,
    e.latitude,
    e.longitude,
    COALESCE(v.violation_count, 0) as count,
    CASE 
        WHEN count = 0 THEN 0.0
        WHEN count <= 2 THEN 0.2
        WHEN count <= 5 THEN 0.4
        WHEN count <= 10 THEN 0.6
        WHEN count <= 20 THEN 0.8
        ELSE 1.0
    END as intensity
FROM building_evictions e
LEFT JOIN (SELECT bbl, COUNT(*) as violation_count FROM building_violations GROUP BY bbl) v
WHERE latitude BETWEEN 40.4 AND 41.0
LIMIT 100000
```

**Problem**: Most buildings probably have counts > 20, so they all get `intensity = 1.0` from backend!

### Step 2: Frontend Receives Data
- Gets up to 100,000 points
- Each point has: `{count: 25, intensity: 1.0, lat, lng}`

### Step 3: Frontend Normalization (THE PROBLEM)
```javascript
const counts = [25, 30, 50, 100, 200, ...] // Most are > 20
const logCounts = counts.map(c => Math.log10(c))
// log10(25) = 1.4, log10(100) = 2.0, log10(200) = 2.3

minLog = 0.0 (if count = 1)
maxLog = 2.3 (if max count = 200)

normalizedIntensity = (logCount - minLog) / (maxLog - minLog)
// For count = 25: (1.4 - 0.0) / 2.3 = 0.61
// For count = 100: (2.0 - 0.0) / 2.3 = 0.87
// For count = 200: (2.3 - 0.0) / 2.3 = 1.0
```

**Problem**: If most buildings have counts between 20-200:
- They all map to 0.6-1.0 range
- Which maps to YELLOW/ORANGE colors
- Blue/Green never show!

### Step 4: Color Mapping
```javascript
gradient: {
  0.0: blue,
  0.1: blue,
  0.25: teal,
  0.4: green,
  0.55: green,
  0.7: yellow,    // ← Most data ends up here
  0.85: amber,    // ← Or here
  1.0: orange     // ← Or here
}
```

**Result**: Everything is yellow/orange because normalized intensities are 0.6-1.0!

## The Real Problem

1. **Backend intensity is too coarse**: Everything > 20 gets 1.0
2. **Log normalization doesn't help**: If data is 20-200, log still puts it in 0.6-1.0 range
3. **No low values**: We're not seeing buildings with counts 0-10

## Solution

We need to:
1. Use PERCENTILE-based normalization (not log)
2. Force equal distribution: 20% in each color range
3. Or use the actual data distribution to map evenly

