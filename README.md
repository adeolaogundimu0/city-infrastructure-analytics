Ottawa 311 Hotspot Explorer (DBSCAN + PostGIS)

A full-stack data analytics web application that ingests Ottawa’s 311 current-year service request
dataset, stores it in PostgreSQL + PostGIS, and visualizes geospatial hotspots using DBSCAN
clustering with interactive filters and charts.

Key Features
- Weekly ETL pipeline with upserts using request_id
- PostGIS geography point storage for spatial queries
- DBSCAN clustering with configurable eps and minPoints
- Interactive Leaflet map and Recharts bar chart
- Date range filtering and multi-select service types
- Visual distinction for request types without sufficient coordinates
- 
Tech Stack
Frontend: React (Vite), Leaflet, Recharts
Backend: Node.js, Express, PostgreSQL (Supabase), PostGIS
Data Source: City of Ottawa Open Data – 311 Current Year

API Endpoints
GET /health
GET /api/hotspots (from, to, type, eps, minPoints)
GET /api/analytics/top-types
GET /api/analytics/date-range
GET /api/analytics/type-location-coverage

Local Setup
Create a .env file in the project root (not committed):
DB_HOST=YOUR_DATABASE_HOST
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD
DB_SSL=true
PORT=5000

Backend
cd backend
npm install
npm start
Run ETL
npm run etl

Frontend
cd frontend
npm install
npm run dev

Deployment Notes
Frontend deployed on Netlify
Backend deployed on Render
ETL scheduled weekly via GitHub Actions
