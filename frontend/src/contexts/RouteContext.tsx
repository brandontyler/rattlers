import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Location } from '@/types';
import {
  calculateRouteStats,
  optimizeRoute as optimizeRouteAlgorithm,
} from '@/utils/routeUtils';
import { apiService } from '@/services/api';

interface RouteStats {
  totalDistance: number;
  totalTime: number;
}

interface RouteContextType {
  stops: Location[];
  addStop: (location: Location) => void;
  removeStop: (locationId: string) => void;
  reorderStops: (fromIndex: number, toIndex: number) => void;
  optimizeRoute: () => void;
  clearRoute: () => void;
  isInRoute: (locationId: string) => boolean;
  stats: RouteStats;
  isGeneratingPdf: boolean;
  generatePdf: () => Promise<string>;
  isPanelExpanded: boolean;
  setIsPanelExpanded: (expanded: boolean) => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

const MAX_STOPS = 15;

export function RouteProvider({ children }: { children: ReactNode }) {
  const [stops, setStops] = useState<Location[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  const addStop = useCallback((location: Location) => {
    setStops((prev) => {
      // Check if already in route
      if (prev.some((stop) => stop.id === location.id)) {
        return prev;
      }
      // Check max stops
      if (prev.length >= MAX_STOPS) {
        return prev;
      }
      return [...prev, location];
    });
  }, []);

  const removeStop = useCallback((locationId: string) => {
    setStops((prev) => prev.filter((stop) => stop.id !== locationId));
  }, []);

  const reorderStops = useCallback((fromIndex: number, toIndex: number) => {
    setStops((prev) => {
      const newStops = [...prev];
      const [moved] = newStops.splice(fromIndex, 1);
      newStops.splice(toIndex, 0, moved);
      return newStops;
    });
  }, []);

  const optimizeRoute = useCallback(() => {
    setStops((prev) => optimizeRouteAlgorithm(prev));
  }, []);

  const clearRoute = useCallback(() => {
    setStops([]);
    setIsPanelExpanded(false);
  }, []);

  const isInRoute = useCallback(
    (locationId: string) => {
      return stops.some((stop) => stop.id === locationId);
    },
    [stops]
  );

  const stats = calculateRouteStats(stops);

  const generatePdf = useCallback(async (): Promise<string> => {
    if (stops.length === 0) {
      throw new Error('No stops in route');
    }

    setIsGeneratingPdf(true);
    try {
      const response = await apiService.generateRoutePdf({
        stops: stops.map((stop) => ({
          id: stop.id,
          address: stop.address,
          lat: stop.lat,
          lng: stop.lng,
          description: stop.description,
          photos: stop.photos,
        })),
      });

      if (!response.success || !response.data?.downloadUrl) {
        throw new Error(response.message || 'Failed to generate PDF');
      }

      return response.data.downloadUrl;
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [stops]);

  const value: RouteContextType = {
    stops,
    addStop,
    removeStop,
    reorderStops,
    optimizeRoute,
    clearRoute,
    isInRoute,
    stats,
    isGeneratingPdf,
    generatePdf,
    isPanelExpanded,
    setIsPanelExpanded,
  };

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useRoute() {
  const context = useContext(RouteContext);
  if (context === undefined) {
    throw new Error('useRoute must be used within a RouteProvider');
  }
  return context;
}
