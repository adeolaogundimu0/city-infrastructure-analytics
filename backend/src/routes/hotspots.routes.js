

import { Router } from 'express';
import { getHotspotsDbscan } from '../controllers/hotspotsDbscan.controller.js';

const router = Router();

router.get('/', getHotspotsDbscan);
router.get('/dbscan', getHotspotsDbscan);

export default router;
