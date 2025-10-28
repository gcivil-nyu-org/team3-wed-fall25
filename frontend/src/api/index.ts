// Main API exports - clean imports for all API functions

export * from './auth';
export * from './building';
export * from './neighborhood';

// Re-export types for backward compatibility
export type { HeatmapPoint, BoroughSummary } from '../types';