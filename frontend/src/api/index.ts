// Main API exports - clean imports for all API functions

export * from './auth';
export * from './building';
export * from './neighborhood';
export * from './community';

// Re-export types for backward compatibility
export type { HeatmapPoint, BoroughSummary } from '../types';
