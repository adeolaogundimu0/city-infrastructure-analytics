import { Router } from 'express';
import { getTopTypes } from '../controllers/analytics.controller.js';

const router = Router();

router.get('/top-types', getTopTypes);

export default router;
