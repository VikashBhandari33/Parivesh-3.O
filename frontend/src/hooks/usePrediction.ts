import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface PredictionInput {
  sector: string;
  district: string;
  areaHa?: number;
  riskScore?: number;
  edsCount?: number;
}

export interface PredictionFactor {
  name: string;
  impact: string;
  direction: 'positive' | 'negative' | 'neutral';
}

export interface PredictionResult {
  approvalChance: number;
  estimatedDays: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  confidence: number;
  verdict: string;
  dataPoints: number;
  stageBreakdown: {
    scrutiny: number;
    eds: number;
    referred: number;
    mom: number;
    total: number;
  };
  factors: PredictionFactor[];
}

export function useApplicationPrediction(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['prediction', applicationId],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: PredictionResult }>(`/prediction/${applicationId}`);
      return data.data;
    },
    enabled: !!applicationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLivePrediction(params: PredictionInput) {
  // Only enable if we have the minimum required params (sector, district)
  const isReady = !!params.sector && !!params.district;
  
  return useQuery({
    queryKey: ['prediction', 'live', params],
    queryFn: async () => {
      // Clean undefined params so they don't break the query string
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
      );
      
      const { data } = await api.get<{ success: boolean; data: PredictionResult }>('/prediction', {
        params: cleanParams
      });
      return data.data;
    },
    enabled: isReady,
    staleTime: 1000 * 60, // 1 min (live updates)
  });
}
