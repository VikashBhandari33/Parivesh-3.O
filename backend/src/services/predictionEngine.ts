export interface PredictionInput {
  sector: string;
  district: string;
  areaHa?: number;
  riskScore?: number; // 0 to 100
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

import axios from 'axios';

export const computePrediction = async (input: PredictionInput): Promise<PredictionResult> => {
  try {
    // Forward the payload exactly to the new Scikit-Learn Python Microservice
    const response = await axios.post('http://127.0.0.0:8000/predict', input);
    return response.data as PredictionResult;
  } catch (error) {
    console.error("ML Service Connection Error:", error);
    
    // In case the Python Fast API server goes offline, fall back to a conservative generic forecast
    return {
      approvalChance: 15,
      estimatedDays: 90,
      riskLevel: "Medium",
      confidence: 10,
      verdict: "ML Service unavailable. Returning generic baseline estimates.",
      dataPoints: 0,
      stageBreakdown: { scrutiny: 20, eds: 20, referred: 40, mom: 10, total: 90 },
      factors: [
        { name: "ML Offline", impact: "System fallback activated", direction: "negative" }
      ]
    };
  }
};
