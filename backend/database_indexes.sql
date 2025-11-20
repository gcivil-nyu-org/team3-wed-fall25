-- Database Indexes for Performance Optimization
-- Run these SQL commands to improve search performance

-- Indexes for building_registrations table
CREATE INDEX IF NOT EXISTS idx_building_registrations_bbl ON building_registrations(bbl);
CREATE INDEX IF NOT EXISTS idx_building_registrations_zip ON building_registrations(zip);
CREATE INDEX IF NOT EXISTS idx_building_registrations_boro ON building_registrations(boro);
CREATE INDEX IF NOT EXISTS idx_building_registrations_street_name ON building_registrations(street_name);
CREATE INDEX IF NOT EXISTS idx_building_registrations_house_street ON building_registrations(house_number, street_name);

-- Indexes for building_evictions table
CREATE INDEX IF NOT EXISTS idx_building_evictions_bbl ON building_evictions(bbl);
CREATE INDEX IF NOT EXISTS idx_building_evictions_executed_date ON building_evictions(executed_date) WHERE executed_date >= (CURRENT_DATE - INTERVAL '3 years')::date;

-- Indexes for building_violations table
CREATE INDEX IF NOT EXISTS idx_building_violations_bbl ON building_violations(bbl);
CREATE INDEX IF NOT EXISTS idx_building_violations_status ON building_violations(violation_status) WHERE UPPER(violation_status) = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_building_violations_class ON building_violations(class);
CREATE INDEX IF NOT EXISTS idx_building_violations_rent_impairing ON building_violations(rent_impairing);
CREATE INDEX IF NOT EXISTS idx_building_violations_nov_date ON building_violations(nov_issued_date);

-- Indexes for building_complaints table
CREATE INDEX IF NOT EXISTS idx_building_complaints_bbl ON building_complaints(bbl);
CREATE INDEX IF NOT EXISTS idx_building_complaints_category ON building_complaints(major_category);
CREATE INDEX IF NOT EXISTS idx_building_complaints_status_date ON building_complaints(complaint_status_date);

-- Indexes for building_rent_stabilized_list table
CREATE INDEX IF NOT EXISTS idx_rent_stabilized_bbl ON building_rent_stabilized_list(bbl);

-- Indexes for building_affordable_housing table
CREATE INDEX IF NOT EXISTS idx_affordable_housing_bbl ON building_affordable_housing(bbl);
CREATE INDEX IF NOT EXISTS idx_affordable_housing_total_units ON building_affordable_housing(bbl, total_units);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_registrations_boro_zip ON building_registrations(boro, zip);
CREATE INDEX IF NOT EXISTS idx_violations_bbl_status ON building_violations(bbl, violation_status) WHERE UPPER(violation_status) = 'OPEN';

-- Analyze tables to update statistics
ANALYZE building_registrations;
ANALYZE building_evictions;
ANALYZE building_violations;
ANALYZE building_complaints;
ANALYZE building_rent_stabilized_list;
ANALYZE building_affordable_housing;

