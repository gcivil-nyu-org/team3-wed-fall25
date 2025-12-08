// Building-related hooks

import { useState, useEffect } from 'react';
import { fetchBuilding, searchBuildings } from '../api';
import type { BuildingData, BuildingSearchResult, SearchParams } from '../types';

export const useBuilding = (bbl: string | null) => {
  const [building, setBuilding] = useState<BuildingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBuilding = async () => {
      if (!bbl) {
        setBuilding(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchBuilding(bbl);
        setBuilding(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load building data');
      } finally {
        setLoading(false);
      }
    };

    loadBuilding();
  }, [bbl]);

  return { building, loading, error };
};

export const useBuildingSearch = () => {
  const [searchResults, setSearchResults] = useState<BuildingSearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (params: SearchParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await searchBuildings(params);
      setSearchResults(response.data);
      setTotalResults(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to search buildings');
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setSearchResults([]);
    setTotalResults(0);
    setError(null);
  };

  return {
    searchResults,
    totalResults,
    loading,
    error,
    search,
    clearResults,
  };
};
