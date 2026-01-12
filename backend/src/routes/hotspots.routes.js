import { Router } from 'express';
import { getHotspots } from '../controllers/hotspots.controller.js';

const router = Router();

router.get('/', getHotspots);

export default router;
