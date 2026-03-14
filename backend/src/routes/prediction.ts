import { Router } from 'express';
import { getLivePrediction, getApplicationPrediction } from '../controllers/prediction.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Used for live prediction on the apply page
router.get('/', authenticate, asyncHandler(getLivePrediction));

// Used for reading existing applications
router.get('/:id', authenticate, asyncHandler(getApplicationPrediction));

export default router;
