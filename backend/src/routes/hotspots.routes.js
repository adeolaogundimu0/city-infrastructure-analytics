import { Router } from 'express';
import { getHotspots } from '../controllers/hotspots.controller.js';
import { getHotspotsDbscan } from '../controllers/hotspotsDbscan.controller.js';

const router = Router();

router.get('/', getHotspots);
router.get('/dbscan', getHotspotsDbscan);

export default router;
