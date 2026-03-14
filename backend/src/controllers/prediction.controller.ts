import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { computePrediction, PredictionInput } from '../services/predictionEngine';
import { AppError } from '../middleware/errorHandler';

export const getLivePrediction = async (req: Request, res: Response) => {
  const { sector, district, areaHa, riskScore, edsCount } = req.query;

  if (!sector || !district) {
    throw new AppError(400, 'BAD_REQUEST', 'Missing required query parameters: sector, district');
  }

  const input: PredictionInput = {
    sector: sector as string,
    district: district as string,
    areaHa: areaHa ? Number(areaHa) : 0,
    riskScore: riskScore ? Number(riskScore) : 0,
    edsCount: edsCount ? Number(edsCount) : 0
  };

  const prediction = computePrediction(input);
  res.json({ success: true, data: prediction });
};

export const getApplicationPrediction = async (req: Request, res: Response) => {
  const { id } = req.params;

  const app = await prisma.application.findUnique({
    where: { id },
    include: { edsNotices: true }
  });

  if (!app) {
    throw new AppError(404, 'NOT_FOUND', 'Application not found');
  }

  const input: PredictionInput = {
    sector: app.sector,
    district: app.district || '',
    areaHa: app.areaHa ? Number(app.areaHa) : 0,
    riskScore: app.satelliteRiskScore || 0,
    edsCount: app.edsNotices?.length || 0
  };

  const prediction = computePrediction(input);
  res.json({ success: true, data: prediction });
};
