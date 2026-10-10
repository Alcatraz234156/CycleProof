# Shift Cool - Heat Safety & Safe Drinking Water Platform

**Shift Cool** is an environmental-technology platform engineered for climate-resilient workforce operations. It provides real-time thermal stress telemetry, OSHA/NIOSH-compliant work-rest shift planning, and interactive geospatial mapping for safe drinking water, chilled hydration pods, and high-velocity misting shelters.

---

## Design system
- **Look**: liquid glass. Frosted, see-through surfaces with a bright top edge sit over soft drifting light. The ambient light picks up the current heat-risk color.
- **Palette**: mist (`#e8f0ef`), deep-water ink (`#0c2b33`), sun (`#ffb627`), water blue (`#2a6fdb`), plus one signal color that follows the heat risk.
- **Type**: Big Shoulders Display for headlines and readings, Hanken Grotesk for text, both bundled with Fontsource.
- **Motion**: tabs that fade out and in as you switch, a gliding glass highlight on the tabs and shift picker, a dial that draws and sweeps, numbers that count up, bars that grow in, an accordion that opens smoothly on the water list, and a rippling pin on the selected station.
- **Accessibility**: visible focus, labelled controls, a solid fallback where backdrop blur is unsupported, and `prefers-reduced-motion` turns all motion off.

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
│   │   ├── Header.tsx           # Brand, section tabs, site status
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

### 4. Build for Production
To typecheck and bundle the optimized static distribution:
```bash
npm run build
```
The production bundle will be generated in `frontend/dist/`.

### 5. Preview Production Build
```bash
npm run preview
```

---

## 🗺️ Leaflet GIS Map Notes
- The map is powered by Leaflet and configured with CartoDB Dark Matter tiles.
- Custom DOM markers represent chilled dispensers, misting canopies, and emergency relief pods.
- Click any station on the map or in the selector bar to view water temperature, remaining capacity percentage, and filter diagnostics.
