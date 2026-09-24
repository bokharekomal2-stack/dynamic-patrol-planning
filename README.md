# Dynamic Patrol Planning (TROS v2.4)
> **Tactical Resource Optimization System for Law Enforcement & Public Safety**

[![Status](https://img.shields.io/badge/Status-Hackathon--Ready-06B6D4?style=for-the-badge)](#)
[![Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS%20%7C%20Leaflet%20%7C%20Chart.js-10B981?style=for-the-badge)](#)
[![Theme](https://img.shields.io/badge/UI-Dark%20Command%20Center-EF4444?style=for-the-badge)](#)

---

## 🚔 Overview

**Dynamic Patrol Planning** is a responsive, dark command-center web application designed for police dispatchers, watch commanders, and tactical planners. It bridges the gap between reactive policing and proactive deterrence by fusing **spatial crime incidents**, **traffic collision hotspots**, **temporal day-of-week & hourly risk patterns**, and **active patrol coverage** into an actionable, real-time deployment engine.

---

## ✨ Key Capabilities & Features

### 1. 🗺️ Tactical GIS Map & Spatial Intelligence
- Built on high-performance **Leaflet.js** with high-contrast **CartoDB Dark Matter** tiles.
- **Dynamic Risk Heatmap**: Real-time canvas gradient surface highlighting high-density threat pockets.
- **Crime Incident Pins**: Color-coded by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) with police ten-codes (`10-31 Robbery`, `10-50 Collision`, `10-15 Burglary`) and pulsing active beacons.
- **Accident Hotspots**: Hazard icons displaying 30-day crash counts, primary causation factors, and peak collision hours.
- **Sector Boundaries**: Transparent polygons for Sectors Alpha through Foxtrot dynamically tinted by their current 0–100 risk score.
- **Active Patrol Units**: Telemetry badges showing callsign (`Alpha-101`, `Intercept-301`, `K9-Tactical-1`), officer roster, heading, speed, and fuel levels.
- **Coverage Blind Spots**: Pulsing radar rings marking high-risk zones that have lacked patrol coverage for over 60–90 minutes.
- **Animated Patrol Routes**: Waypoint routes with directional guidance and dwell durations.

### 2. ⚡ Dynamic Risk Score Algorithm (0–100)
Calculates composite threat scores using four weighted dimensions:
$$\text{Risk Score} = w_c \cdot C + w_a \cdot A + w_t \cdot T + w_p \cdot P$$
- $C$ (**Crime Severity Index**): Weighted incident count within the sector (Critical = 10 pts, High = 7 pts, Medium = 4 pts, Low = 2 pts) with recency multiplier.
- $A$ (**Accident Hotspot Index**): 30-day collision frequency and severity rating.
- $T$ (**Temporal Multiplier**): Synchronized with the 7×24 time-of-week risk matrix.
- $P$ (**Patrol Deficit Penalty**): Escalates risk when active unit presence is zero or elapsed time exceeds target patrol frequency.
- **Interactive Slider Tuner**: Planners can adjust weighting percentages ($w_c, w_a, w_p$) in real-time.

### 3. 📅 Interactive 7-Day × 24-Hour Time/Day Heatmap Matrix
- Full matrix of **168 time-blocks** (Monday to Sunday, 00:00 to 23:00).
- Color-coded risk cells from safe emerald to critical crimson.
- **Interactive Synchronization**: Click any cell in the matrix to immediately calibrate the entire dashboard and patrol simulator to that exact temporal profile.

### 4. 📊 Command Center Analytics & Charts
- **Hourly Risk vs Actual Incidents**: Dual-axis line & bar chart powered by Chart.js.
- **Crime & Hazard Composition**: Doughnut chart categorizing Violent Crime, Property Crime, Traffic/Accidents, Narcotics, and Public Order.
- **Sector Risk vs Resource Allocation**: Grouped bar chart identifying resource deficits.

### 5. 🎯 Algorithmic Patrol Recommendations & Waypoint Routing
- Generates strategic deterrence plans tailored to the current threat posture.
- Includes target patrol window, suggested unit, expected risk reduction percentage, and step-by-step waypoint itinerary (e.g. 25-min static presence, 15-min radar check, 20-min foot patrol).
- **1-Click Route Execution**: Displays the optimized waypoint polyline directly on the GIS map.

### 6. 🚨 Patrol Blind Spots & Instant Intercept
- Detects high-risk sectors or transit bottlenecks where unit coverage is absent.
- Displays minutes unpatrolled, root cause, and closest available unit.
- **"Deploy Intercept" Button**: Commands the nearest unit to re-route immediately and establishes a deterrence baseline.

### 7. 🎮 Live Patrol Simulator & Tactical Audio FX
- Real-time simulation of a police shift with **Play/Pause** and **1x, 2x, 5x, 10x** acceleration.
- Patrol vehicles interpolate smoothly along their assigned street waypoints on the map.
- Generates realistic dynamic 911 dispatch calls with Web Audio API sound alerts (chirps & sonar pings with mute toggle).

### 8. 📄 Shift Briefing Report & Data Export
- Formatted **Command Briefing Document** with executive summary, sector rankings, and tactical directives ready for printing or saving to PDF.
- **Export CSV**: Instant export of filtered incident logs for external analysis.

---

## 📁 Project Architecture

```
dynamic-patrol-planning/
├── index.html            # Main command center dashboard & views
├── css/
│   ├── styles.css        # Command center dark theme, layout grid, typography
│   └── components.css    # KPI cards, Leaflet map styling, popups, heatmap, tables
├── js/
│   ├── data.js           # Realistic law enforcement datasets (sectors, incidents, units, hotspots)
│   ├── analytics.js      # Dynamic 0-100 risk scoring algorithm & filter engine
│   ├── planner.js        # Patrol recommendation & route generation engine
│   ├── map.js            # Leaflet map instance, dark CartoDB tiles, custom markers & layers
│   ├── charts.js         # Chart.js graphs & interactive 7x24 heatmap matrix visualizer
│   ├── simulation.js     # Live shift simulation, waypoint interpolation & audio FX
│   └── app.js            # Main controller, event routing, modals & export tools
└── README.md             # Documentation & Pitch Guide
```

---

## 🚀 How to Run

No build step, compiler, or package manager installation is required.

### Method 1: Local HTTP Server (Recommended)
Open your terminal in the project directory and run:
```bash
# Python 3
python -m http.server 8080
```
Then navigate to `http://localhost:8080` in any modern web browser.

### Method 2: Direct File Opening
Double-click `index.html` to open it directly in Chrome, Firefox, Edge, or Safari.

---

## 🏆 Hackathon Pitch & Presentation Guide

| Demonstration Step | What to Show | Pitch Highlight |
|---|---|---|
| **1. The Problem** | Show high crime & accident numbers | Traditional police patrols are static and predictable, leading to coverage blind spots and reactive dispatch delays. |
| **2. Real-Time Risk Score (0-100)** | Point to KPI Cards & Sector Ranking | Dynamic Patrol Planning calculates a continuous 0–100 risk score combining spatial incidents, collision corridors, and temporal surges. |
| **3. Temporal Intelligence** | Open "Temporal & Heatmap Analytics" | Highlight Friday & Saturday late-night spikes on the 7×24 grid; click a cell to prove how the model recalculates instantly. |
| **4. Blind Spot Closure** | Click "Deploy Intercept" on BLIND-01 | Watch the nearest available unit immediately divert to establish a deterrent perimeter. |
| **5. Live Shift Simulation** | Hit "Play Shift" (5x speed) | Show patrol cruisers moving live across downtown corridors on the dark tactical map. |
| **6. Command Deliverable** | Click "Shift Briefing" | Show the generated, printable watch commander briefing report with tactical directives and unit assignments. |

---

## 🛡️ License
Built for hackathon demonstration and public safety operational planning.
