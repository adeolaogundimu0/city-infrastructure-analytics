import express from 'express';
import cors from 'cors';

import hotspotsRouter from './routes/hotspots.routes.js';
import analyticsRouter from './routes/analytics.routes.js';


const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/hotspots', hotspotsRouter);
app.use('/api/analytics', analyticsRouter);


export default app;
