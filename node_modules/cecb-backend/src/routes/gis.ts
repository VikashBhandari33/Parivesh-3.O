import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

const coordSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

// ─── GIS proximity thresholds (in metres) ─────────────────────────────────────
const THRESHOLDS = {
  FOREST:    1000,   // 1 km
  RIVER:     500,    // 500 m
  SANCTUARY: 10000,  // 10 km
  WETLAND:   2000,   // 2 km
};

// Simulated environmental layer data for Chhattisgarh (demo data for hackathon)
// In production: loaded from PostGIS database layers from FSI/MoEFCC
const DEMO_LAYERS = {
  FOREST: [
    { name: 'Barnawapara Wildlife Sanctuary', lat: 21.2345, lng: 82.1234 },
    { name: 'Kanger Valley National Park', lat: 19.1548, lng: 81.7935 },
    { name: 'Achanakmar Tiger Reserve', lat: 22.5000, lng: 81.7500 },
    { name: 'Indravati National Park', lat: 18.8500, lng: 80.6167 },
  ],
  RIVER: [
    { name: 'Mahanadi River', lat: 21.4850, lng: 82.0139 },
    { name: 'Sheonath River', lat: 21.2500, lng: 81.6500 },
    { name: 'Indravati River', lat: 18.9500, lng: 80.8500 },
    { name: 'Hasdeo River', lat: 22.3000, lng: 82.1000 },
  ],
  SANCTUARY: [
    { name: 'Udanti-Sitanadi Tiger Reserve', lat: 20.3500, lng: 82.3000 },
    { name: 'Guru Ghasidas National Park', lat: 23.5000, lng: 82.6500 },
  ],
  WETLAND: [
    { name: 'Gangrel Reservoir', lat: 20.5700, lng: 81.7900 },
    { name: 'Miniyara Wetland', lat: 22.3500, lng: 81.9500 },
  ],
};

// ─── GET /api/gis/check?lat=&lng= ────────────────────────────────────────────
router.get('/check', authenticate, asyncHandler(async (req, res) => {
  const { lat, lng } = coordSchema.parse(req.query);

  const flags: Array<{
    flagType: string;
    layerName: string;
    distanceM: number;
    threshold: number;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }> = [];

  for (const [layerType, threshold] of Object.entries(THRESHOLDS)) {
    const features = DEMO_LAYERS[layerType as keyof typeof DEMO_LAYERS];

    for (const feature of features) {
      const distanceM = haversineDistance(lat, lng, feature.lat, feature.lng);
      if (distanceM <= threshold) {
        const severity = distanceM <= threshold * 0.25 ? 'HIGH'
          : distanceM <= threshold * 0.6 ? 'MEDIUM' : 'LOW';

        flags.push({
          flagType: layerType,
          layerName: feature.name,
          distanceM: Math.round(distanceM),
          threshold,
          severity,
        });
      }
    }
  }

  // Sort by distance
  flags.sort((a, b) => a.distanceM - b.distanceM);

  res.json({
    success: true,
    data: {
      lat,
      lng,
      flags,
      hasHighRisk: flags.some((f) => f.severity === 'HIGH'),
      summary: flags.length === 0
        ? 'No environmental proximity concerns identified'
        : `${flags.length} environmental concern(s) detected within proximity thresholds`,
    },
  });
}));

// ─── GET /api/gis/layers ──────────────────────────────────────────────────────
router.get('/layers', authenticate, asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      layers: Object.entries(DEMO_LAYERS).map(([type, features]) => ({
        type,
        threshold: THRESHOLDS[type as keyof typeof THRESHOLDS],
        features: features.map((f) => ({ name: f.name, lat: f.lat, lng: f.lng })),
      })),
    },
  });
}));

// ─── POST /api/gis/save-flags ─────────────────────────────────────────────────
router.post('/save-flags', authenticate, asyncHandler(async (req, res) => {
  const { applicationId, flags } = z.object({
    applicationId: z.string().uuid(),
    flags: z.array(z.object({
      flagType: z.string(),
      layerName: z.string(),
      distanceM: z.number(),
      severity: z.string().default('HIGH'),
    })),
  }).parse(req.body);

  // Delete existing flags for this application
  await prisma.gisRiskFlag.deleteMany({ where: { applicationId } });

  const savedFlags = await prisma.gisRiskFlag.createMany({
    data: flags.map((f) => ({ ...f, applicationId })),
  });

  res.json({ success: true, data: { count: savedFlags.count } });
}));

// ─── Haversine formula ────────────────────────────────────────────────────────
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default router;
