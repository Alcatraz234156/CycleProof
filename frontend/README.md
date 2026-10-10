# Shift Cool - Heat Safety & Safe Drinking Water Platform

**Shift Cool** is an environmental-technology platform engineered for climate-resilient workforce operations. It provides real-time thermal stress telemetry, OSHA/NIOSH-compliant work-rest shift planning, and interactive geospatial mapping for safe drinking water, chilled hydration pods, and high-velocity misting shelters.

---

## 🎨 Design System
- **Theme**: Product-stage black canvas (`#000`) with oversized display typography and pill-shaped controls
- **Semantic color**: Vermilion (`#ff4a1c`) for heat stress and alerts, Cyan (`#22d3c5`) for coolant, shade and safe zones, Blue (`#4da3ff`) for water; a light panel and a solid red alert slab give the page rhythm
- **Typography**: Big Shoulders Display (headlines, readings) + Hanken Grotesk (body), bundled locally via Fontsource so the demo works offline
- **Signature element**: the WBGT arc dial, which draws itself on load and marks the risk thresholds
- **Map**: full-bleed stage with floating glass filter and station panels

---

## 🏗️ Architecture & Folder Structure

```
frontend/
├── index.html                   # HTML entry point with modern typography
├── package.json                 # Dependencies (React, TypeScript, Vite, Leaflet)
├── tsconfig.json                # TypeScript application config
├── tsconfig.node.json           # Vite node configuration
├── vite.config.ts               # Vite bundler configuration
├── src/
│   ├── App.tsx                  # Main responsive operational dashboard layout
│   ├── main.tsx                 # React DOM mount point
│   ├── index.css                # Environmental-tech design system & tokens
│   ├── components/              # Modular UI components
│   │   ├── Header.tsx           # Telemetry status, active operational zone, brand
│   │   ├── HeatRiskSection.tsx  # WBGT gauge, environmental sensors, OSHA work-rest
│   │   ├── ShiftPlanner.tsx     # Microclimate shift scheduler & rest allocation
│   │   ├── WaterMap.tsx         # Leaflet GIS drinking water & misting hub map
│   │   └── index.ts             # Component barrel export
│   ├── services/                # Business logic & data queries
│   │   ├── heatRiskService.ts   # WBGT math, risk tiers, and thermal advisories
│   │   ├── shiftPlannerService.ts# Shift rosters & thermal load projections
│   │   ├── waterMapService.ts   # Water station telemetry & geospatial filters
│   │   └── index.ts             # Service barrel export
│   └── types/                   # TypeScript interfaces & domain models
│       ├── heatRisk.ts          # Environmental telemetry & work-rest cycles
│       ├── shift.ts             # Shift intervals, rosters, and risk ratings
│       ├── waterMap.ts          # Water stations, station types, and GIS coordinates
│       └── index.ts             # Types barrel export
```

---

## 🚀 Quickstart & Localhost Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

### 2. Install Dependencies
Open your terminal inside the `frontend` folder:
```bash
cd frontend
npm install
```

### 3. Run Development Server (Localhost)
Launch Vite's development server with hot-module replacement (HMR):
```bash
npm run dev
```
Open your browser and navigate to:
**http://localhost:5173**

### 4. Connect the deployed backend

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the `ApiUrl`
output from `sam deploy`. Restart Vite after changing environment variables.
The dashboard then uses the backend for weather, generated shift guidance,
nearby water points, and community water-point reports. If location access or
the API is unavailable, the UI keeps the demo data visible and shows the error.

### 5. Build for Production
To typecheck and bundle the optimized static distribution:
```bash
npm run build
```
The production bundle will be generated in `frontend/dist/`.

### 6. Preview Production Build
```bash
npm run preview
```

---

## 🗺️ Leaflet GIS Map Notes
- The map is powered by Leaflet and configured with CartoDB Dark Matter tiles.
- Custom DOM markers represent chilled dispensers, misting canopies, and emergency relief pods.
- Click any station on the map or in the selector bar to view water temperature, remaining capacity percentage, and filter diagnostics.
