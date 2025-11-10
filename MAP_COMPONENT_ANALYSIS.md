# Map Component & Website Architecture - Complete Analysis

## ✅ Current Branch
**`feat/neighborhood-explorer-deploy`** - Confirmed ✓

---

## 🗺️ MAP COMPONENT ARCHITECTURE

### **Main Component: `SimplifiedMap.tsx`**

#### **Core Features:**
1. **Two Visualization Modes:**
   - **Heatmap Mode**: Gradient circles showing intensity
   - **Points Mode**: Individual markers for each building

2. **Three Heatmap Modes:**
   - **Default**: Overall intensity visualization
   - **Risk**: Risk assessment based on frequency and intensity
   - **Inequality**: Deviation from citywide median

3. **Data Types:**
   - **Violations**: Building code violations (Red)
   - **Evictions**: Court-ordered evictions (Amber/Orange)
   - **Complaints**: 311 complaints (Blue)

4. **Filtering System:**
   - Dataset toggles (violations/evictions/complaints)
   - Borough selector (All Boroughs, Manhattan, Brooklyn, Queens, Bronx, Staten Island)
   - Advanced filters drawer (risk threshold slider)
   - Time windows (3 years default)

#### **Component Structure:**

```
SimplifiedMap
├── ModeSwitcher (Heatmap vs Points)
├── HeatmapModeSelector (Default/Risk/Inequality)
├── FilterBar (Dataset toggles, Borough, Legend, Advanced)
├── StatsPanel (Live statistics, hotspots)
├── OptimizedHeatmap (Main map component)
│   ├── SimpleGradientHeatmap (Heatmap visualization)
│   └── PointsLayer (Points visualization)
├── HeatmapLegend (Color scale explanation)
└── AdvancedFiltersDrawer (Risk threshold, reset)
```

#### **Data Flow:**

1. **Initial Load:**
   - Fetches data for full NYC bounds (40.4-41.0 lat, -74.5 to -73.5 lng)
   - Default: Violations data
   - Limit: 50,000 points for performance

2. **API Calls:**
   - `GET /api/neighborhood/heatmap/` - Main heatmap data
   - `GET /api/neighborhood/borough-summary/` - Borough statistics

3. **Data Processing:**
   - Validates coordinates (lat/lng within valid ranges)
   - Normalizes intensity values (0.0 to 1.0)
   - Filters by risk threshold in points mode
   - Sorts by count for top hotspots

4. **Visualization:**
   - **Heatmap**: Creates 3 overlapping circles per point for gradient effect
   - **Points**: Shows up to 10,000 top points with color-coded markers
   - Popups show: Address, BBL, Count, Intensity, Risk Score

---

## 🎨 VISUALIZATION COMPONENTS

### **1. SimpleGradientHeatmap.tsx**
- **Purpose**: Renders gradient heatmap circles
- **Algorithm**:
  - Calculates score based on mode (default/risk/inequality)
  - Creates 3 overlapping circles per point for smooth gradient
  - Color calculation uses HSL with vibrant gradients
  - Radius based on count (50-200px range)
  - Opacity based on score (0.1-0.6 range)

### **2. OptimizedHeatmap.tsx**
- **Purpose**: Main Leaflet map container
- **Features**:
  - Uses react-leaflet with OpenStreetMap tiles
  - Auto-fits bounds to data
  - Handles map clicks
  - Switches between heatmap and points layers

### **3. PointsLayer**
- **Purpose**: Individual point markers
- **Features**:
  - Filters by risk threshold
  - Limits to top 10,000 points
  - Color-coded by data type
  - Small radius (1-4px) for performance
  - Clickable popups with building details

### **4. HeatmapLegend.tsx**
- **Purpose**: Explains color scales
- **Features**:
  - Shows legend for current mode
  - Displays data type description
  - Shows building count
  - Gradient bar visualization

---

## 📊 BACKEND API ARCHITECTURE

### **Neighborhood Repository (`neighborhood_repository.py`)**

#### **Key Methods:**

1. **`get_heatmap_data()`**
   - Routes to specific data type handler
   - Parameters: bounds, data_type, borough, limit
   - Returns: List of HeatmapPoint objects

2. **`_get_violations_heatmap()`**
   - Joins `building_evictions` (for coordinates) with `building_violations` (for counts)
   - Intensity calculation:
     - 0 violations: 0.0
     - 1-2: 0.2
     - 3-5: 0.4
     - 6-10: 0.6
     - 11-20: 0.8
     - 21+: 1.0

3. **`_get_evictions_heatmap()`**
   - Groups evictions by BBL
   - Filters to last 3 years
   - Intensity calculation:
     - 0: 0.0
     - 1: 0.2
     - 2: 0.4
     - 3-4: 0.6
     - 5-8: 0.8
     - 9+: 1.0

4. **`_get_complaints_heatmap()`**
   - Similar structure to violations
   - Joins with evictions for coordinates
   - Intensity calculation:
     - 0: 0.0
     - 1-2: 0.2
     - 3-5: 0.4
     - 6-10: 0.6
     - 11-15: 0.8
     - 16+: 1.0

#### **Data Model: HeatmapPoint**
```python
@dataclass
class HeatmapPoint:
    bbl: str
    latitude: float
    longitude: float
    intensity: float  # 0.0 to 1.0
    data_type: str
    count: int
    address: str
    borough: str
```

---

## 🌐 WEBSITE ARCHITECTURE

### **Frontend Structure:**

```
App.tsx
├── Routes
│   ├── / (Home)
│   ├── /search (Building Search)
│   ├── /map (SimplifiedMap) ← YOUR FOCUS
│   ├── /community (Favorites & Reviews)
│   ├── /building/:bbl (Building Details)
│   ├── /landlord/dashboard
│   ├── /landlord/apply
│   └── /landlord/building/:bbl
```

### **Key Pages:**

1. **Home** (`Home.tsx`)
   - Landing page with features overview

2. **Search** (`Search.tsx`)
   - Building search with filters
   - Results show risk levels, violations, evictions

3. **Map** (`SimplifiedMap.tsx`) ← **YOUR COMPONENT**
   - Interactive neighborhood explorer
   - Heatmap/points visualization
   - Statistics panel
   - Filter controls

4. **Community** (`Community.tsx`)
   - Favorites tab
   - Reviews tab
   - Requires authentication

5. **Building** (`Building.tsx`)
   - Individual building details
   - Shows all violations, evictions, complaints
   - Registration info, contacts

### **API Endpoints:**

```
/api/building/?bbl={bbl}                    - Get building data
/api/neighborhood/stats/                    - Neighborhood statistics
/api/neighborhood/heatmap/                  - Heatmap data points
/api/neighborhood/borough-summary/          - Borough summaries
/api/neighborhood/trends/                   - Building trends
/api/community/favorites/                   - User favorites
/api/community/reviews/                     - Building reviews
/api/auth/login/                            - User authentication
```

---

## 🔧 TECHNICAL DETAILS

### **State Management:**
- Uses React `useState` for local state
- `MapState` interface defines all filter states
- `useEffect` triggers data refetch on filter changes
- `useMemo` for performance optimization

### **Performance Optimizations:**
- Limits data to 50,000 points
- Filters points by risk threshold
- Sorts and slices top points
- Uses `useMemo` for expensive calculations
- Debounced filter updates

### **Color Schemes:**
- **Violations**: Red (#EF4444)
- **Evictions**: Amber/Orange (#F59E0B)
- **Complaints**: Blue (#3B82F6)
- **Gradients**: HSL-based vibrant colors

### **Responsive Design:**
- Mobile: Stacked layout, collapsible panels
- Desktop: Sidebar with stats, full-width map
- Uses Material-UI breakpoints

---

## 🎯 KEY FEATURES TO UNDERSTAND

### **1. Intensity Calculation (Backend)**
- Based on count thresholds
- Normalized to 0.0-1.0 range
- Different thresholds per data type

### **2. Score Calculation (Frontend)**
- **Default**: `(intensity * 0.7) + (count/50 * 0.3)`
- **Risk**: `(intensity * 0.6) + (count/100 * 0.4)`
- **Inequality**: Deviation from median

### **3. Gradient Rendering**
- 3 overlapping circles per point
- Decreasing radius and opacity
- Creates smooth gradient effect

### **4. Data Filtering**
- Borough filter (SQL WHERE clause)
- Risk threshold (frontend filter)
- Time windows (backend date filtering)
- Dataset toggles (API data_type parameter)

---

## 📝 FILES TO MODIFY

### **For Map Changes:**
1. **`frontend/src/pages/SimplifiedMap.tsx`** - Main component
2. **`frontend/src/components/OptimizedHeatmap.tsx`** - Map rendering
3. **`frontend/src/components/SimpleGradientHeatmap.tsx`** - Heatmap visualization
4. **`frontend/src/components/HeatmapLegend.tsx`** - Legend component
5. **`frontend/src/api/index.ts`** - API functions

### **For Backend Changes:**
1. **`backend/apps/neighborhood/views.py`** - API endpoints
2. **`backend/infrastructures/postgres/neighborhood_repository.py`** - Data queries
3. **`backend/common/models/neighborhood.py`** - Data models

---

## 🚀 READY FOR DEVELOPMENT

You're on the correct branch (`feat/neighborhood-explorer-deploy`) with:
- ✅ Full community features merged
- ✅ Map component fully implemented
- ✅ Backend APIs working
- ✅ All dependencies installed
- ✅ Development servers running

**Next Steps:**
1. Make your map component changes
2. Test on `http://localhost:5173/map`
3. Commit and merge back to develop
4. CI/CD will deploy automatically

