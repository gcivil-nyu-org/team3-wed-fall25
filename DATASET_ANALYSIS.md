# Database Dataset Analysis for Map Filters

## Current Database Tables Available

### 1. **building_rent_stabilized_list**
- **Columns**: `bbl`, `borough`, `block`, `lot`, `zip`, `city`, `status`, `source_year`
- **Primary Key**: Composite `[source_year, bbl]`
- **Status Values**: Likely "RENT_STABILIZED" or similar (needs verification)
- **Use Case**: Filter buildings that are rent-stabilized
- **Note**: Table has composite primary key, so same BBL can appear multiple times with different source_year

### 2. **building_violations**
- **Status Fields**:
  - `violation_status`: "Open" | "Close" | "Closed"
  - `current_status`: "Open" | "VIOLATION CLOSED" | "NOV SENT OUT" | etc.
- **Classification**:
  - `class`: "A" | "B" | "C" (violation severity class)
  - `rent_impairing`: boolean (Y/N) - indicates if violation affects rent
- **Date Fields**:
  - `inspection_date`: When violation was inspected
  - `nov_issued_date`: When Notice of Violation was issued
  - `approved_date`: When violation was approved
  - `current_status_date`: When status was last updated
- **Additional**: `nov_type`, `nov_description`

### 3. **building_complaints**
- **Status Fields**:
  - `complaint_status`: "Open" | "Closed" | "In Progress" | etc.
  - `problem_status`: Status of the specific problem
  - `status_description`: Text description of status
- **Type/Category**:
  - `type`: "EMERGENCY" | "IMMEDIATE EMERGENCY" | "NON-EMERGENCY" | etc.
  - `major_category`: Major category of complaint
  - `minor_category`: Minor category of complaint
- **Date Fields**:
  - `complaint_status_date`: When complaint status changed
  - `problem_status_date`: When problem status changed
- **Additional**: `unit_type`, `space_type`

### 4. **building_evictions**
- **Date Fields**:
  - `executed_date`: When eviction was executed (already used for 3-year filter)
- **Type Fields**:
  - `residential_commercial_ind`: "R" | "C" | etc.
  - `ejectment`: Type of ejectment
  - `eviction_possession`: Type of possession
- **Geographic**: `community_board`, `council_district`, `census_tract`, `nta`

### 5. **building_affordable_housing**
- **Columns**: `project_id`, `bbl`, `project_name`, `project_start_date`, `reporting_construction_type`, `extended_affordability_status`, `prevailing_wage_status`, `extremely_low_income_units`, `very_low_income_units`, `low_income_units`, `counted_rental_units`, `all_counted_units`, `total_units`
- **Use Case**: Filter buildings with affordable housing programs

### 6. **building_registrations**
- Registration data for buildings
- **Use Case**: Filter by registration status, dates, etc.

## Current Issues to Fix

### 1. **Rent Stabilized Filter Not Working**
- **Problem**: Frontend fetches from `/api/search/?rent_stabilized=true` but this endpoint doesn't exist
- **Solution**: Create a simple endpoint `/api/neighborhood/rent-stabilized-bbls/` that returns all rent stabilized BBLs
- **Query**: `SELECT DISTINCT bbl FROM building_rent_stabilized_list`

### 2. **Time Range Filter in Heatmap**
- **Current**: Time range dropdown exists but not implemented in backend
- **Needs**: 
  - For violations: Filter by `inspection_date` or `nov_issued_date`
  - For evictions: Filter by `executed_date` (already has 3-year default, but should respect time range)
  - For complaints: Filter by `complaint_status_date` or `problem_status_date`

### 3. **Complaints Slider in Heatmap**
- **User Request**: Remove complaints slider from heatmap (keep only for points mode)
- **Note**: There's no "complaints slider" in heatmap - user might mean the time range filter

## Suggested Additional Filters (Based on Available Data)

### For Heatmap Mode:
1. **Violation Status Filter** (Open/Closed/All)
   - Filter by `violation_status = 'Open'` vs all violations
   - Useful to see only ongoing issues vs historical
   - **Resolution Status**: Highlights responsiveness of agencies

2. **Violation Class Filter** (A/B/C/All)
   - Filter by `class` field
   - Class A = most serious, Class C = least serious
   - Useful to focus on most critical violations

3. **Rent Impairing Violations Only**
   - Filter by `rent_impairing = true`
   - Shows violations that affect rent (most critical for tenants)

4. **Time Range** (already requested)
   - Past 6 months / 1 year / 3 years / All time
   - Use appropriate date fields per data type:
     - Violations: `inspection_date` or `nov_issued_date`
     - Evictions: `executed_date`
     - Complaints: `complaint_status_date` or `problem_status_date`

### For Points Mode (Additional to existing):
1. **Violation Status** (Open/Closed/All)
   - Filter points by whether violations are open or closed
   - **Resolution Status**: Shows which buildings have resolved issues

2. **Violation Class** (A/B/C/All)
   - Filter by violation severity class
   - Focus on most serious violations

3. **Rent Impairing Only**
   - Show only buildings with rent-impairing violations
   - Critical for tenant protection

4. **Complaint Type** (Emergency/Non-Emergency/All)
   - Filter by `type` field in complaints
   - `type IN ('EMERGENCY', 'IMMEDIATE EMERGENCY')` for emergencies

5. **Complaint Status** (Open/Closed/All)
   - Filter by `complaint_status`
   - **Resolution Status**: Shows responsiveness

6. **Affordable Housing Only**
   - Filter buildings that have affordable housing programs
   - JOIN with `building_affordable_housing` table

7. **Eviction Type** (Residential/Commercial/All)
   - Filter by `residential_commercial_ind`
   - Focus on residential evictions

## Implementation Priority

### High Priority (Fix Issues):
1. ✅ Fix rent stabilized filter - Create `/api/neighborhood/rent-stabilized-bbls/` endpoint
2. ✅ Remove complaints slider from heatmap (if it exists)
3. ✅ Implement time range filter in backend for heatmap

### Medium Priority (Useful Filters):
1. **Violation Status (Open/Closed)** - Very useful for heatmap, shows resolution status
2. **Time Range** - Already requested
3. **Violation Class (A/B/C)** - Useful for both modes

### Low Priority (Nice to Have):
1. Rent Impairing filter
2. Complaint Type filter (Emergency/Non-Emergency)
3. Affordable Housing filter
4. Eviction Type filter

## Key Insights from Dataset

1. **Resolution Status is Available**:
   - Violations: `violation_status` = "Open" vs "Close"/"Closed"
   - Complaints: `complaint_status` = "Open" vs "Closed"
   - This can show which buildings/agencies are responsive

2. **Time-based Filtering is Rich**:
   - Multiple date fields per data type
   - Can filter by when issue occurred, when reported, when resolved

3. **Severity Classification**:
   - Violation classes (A/B/C) allow filtering by severity
   - Rent-impairing flag identifies most critical violations

4. **Rent Stabilized Data**:
   - Table exists with composite key (source_year, bbl)
   - Need to use `SELECT DISTINCT bbl` to get unique list
   - Status field may need filtering (e.g., only "RENT_STABILIZED" status)
