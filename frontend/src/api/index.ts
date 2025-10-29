// Main API exports - clean imports for all API functions

export * from './auth';
export * from './building';
export * from './neighborhood';
export * from './community';

// Re-export fetchProfile for backward compatibility
export { fetchProfile } from './auth';

// Re-export types for backward compatibility
export type { HeatmapPoint, BoroughSummary, BuildingData } from '../types';
