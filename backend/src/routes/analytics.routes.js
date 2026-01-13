import { Router } from 'express';
import { getTopTypes, getDateRange, getTypeLocationCoverage } from '../controllers/analytics.controller.js';

const router = Router();

router.get('/top-types', getTopTypes);
router.get('/date-range', getDateRange);


router.get('/type-location-coverage', getTypeLocationCoverage);

export default router;
