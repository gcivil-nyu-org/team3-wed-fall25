// Neighborhood-related hooks

import { useState } from 'react';
import { 
  fetchNeighborhoodStats, 
  fetchHeatmapData, 
  fetchBoroughSummary, 
  fetchNeighborhoodTrends 
} from '../api';
import type {
  NeighborhoodStatsParams,
  HeatmapDataParams,
  NeighborhoodTrendsParams,
  NeighborhoodStats,
  HeatmapPoint,
  BoroughSummary,
  NeighborhoodTrends
} from '../types';

export const useNeighborhoodStats = () => {
  const [stats, setStats] = useState<NeighborhoodStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (params: NeighborhoodStatsParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchNeighborhoodStats(params);
      setStats(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch neighborhood stats');
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, fetchStats };
};

export const useHeatmapData = () => {
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmap = async (params: HeatmapDataParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchHeatmapData(params);
      setHeatmapData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch heatmap data');
      setHeatmapData([]);
    } finally {
      setLoading(false);
    }
  };

  return { heatmapData, loading, error, fetchHeatmap };
};

export const useBoroughSummary = () => {
  const [summary, setSummary] = useState<BoroughSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (borough?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchBoroughSummary(borough);
      setSummary(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch borough summary');
      setSummary([]);
    } finally {
      setLoading(false);
    }
  };

  return { summary, loading, error, fetchSummary };
};

export const useNeighborhoodTrends = () => {
  const [trends, setTrends] = useState<NeighborhoodTrends | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async (params: NeighborhoodTrendsParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchNeighborhoodTrends(params);
      setTrends(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch neighborhood trends');
      setTrends(null);
    } finally {
      setLoading(false);
    }
  };

  return { trends, loading, error, fetchTrends };
};
