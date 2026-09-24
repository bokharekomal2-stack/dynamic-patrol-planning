/**
 * DYNAMIC PATROL PLANNING - Tactical GIS Map Engine (Leaflet)
 * Renders dark-themed command-center tactical map, custom vector markers,
 * heatmaps, sector polygons, patrol units, and dynamic route overlays.
 */

class TacticalMap {
  constructor(containerId = "map") {
    this.containerId = containerId;
    this.map = null;
    this.layers = {
      crimes: null,
      accidents: null,
      heatmap: null,
      sectors: null,
      units: null,
      blindSpots: null,
      patrolRoutes: null
    };
    this.layerVisibility = {
      crimes: true,
      accidents: true,
      heatmap: true,
      sectors: true,
      units: true,
      blindSpots: true,
      patrolRoutes: true
    };
    this.unitMarkers = {};
    this.activeRoutePolyline = null;
    this.activeRouteMarkers = [];
  }

  init() {
    if (this.map) return;

    // Center on Downtown Metro Grid
    this.map = L.map(this.containerId, {
      center: [41.8845, -87.6335],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    // Custom Dark CartoDB Tiles for Command Center Aesthetic
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; CartoDB & OpenStreetMap'
    }).addTo(this.map);

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Layer groups
    this.layers.crimes = L.layerGroup().addTo(this.map);
    this.layers.accidents = L.layerGroup().addTo(this.map);
    this.layers.sectors = L.layerGroup().addTo(this.map);
    this.layers.units = L.layerGroup().addTo(this.map);
    this.layers.blindSpots = L.layerGroup().addTo(this.map);
    this.layers.patrolRoutes = L.layerGroup().addTo(this.map);

    // Render all initial layers
    this.renderSectors();
    this.renderIncidents();
    this.renderAccidents();
    this.renderBlindSpots();
    this.renderUnits();
    this.renderHeatmap();

    // Map click event: Local Risk Query
    this.map.on('click', (e) => {
      this.handleMapClick(e.latlng);
    });

    // Invalidate size on container resize
    setTimeout(() => {
      this.map.invalidateSize();
    }, 300);
  }

  /**
   * Render Sector Polygon Boundaries & Risk Tinting
   */
  renderSectors() {
    this.layers.sectors.clearLayers();
    if (!this.layerVisibility.sectors) return;

    const evaluated = window.analyticsEngine.getEvaluatedSectors();

    evaluated.forEach(sec => {
      let fillColor = "#10B981"; // Low
      let borderColor = "#34D399";
      if (sec.currentRisk >= 80) {
        fillColor = "#EF4444"; // Critical
        borderColor = "#F87171";
      } else if (sec.currentRisk >= 65) {
        fillColor = "#F59E0B"; // High
        borderColor = "#FBBF24";
      } else if (sec.currentRisk >= 45) {
        fillColor = "#3B82F6"; // Moderate
        borderColor = "#60A5FA";
      }

      const polygon = L.polygon(sec.polygon, {
        color: borderColor,
        weight: 2,
        opacity: 0.8,
        dashArray: "4, 4",
        fillColor: fillColor,
        fillOpacity: 0.12
      });

      // Hover glow effect
      polygon.on('mouseover', function () {
        this.setStyle({
          weight: 3,
          fillOpacity: 0.25,
          dashArray: ""
        });
      });
      polygon.on('mouseout', function () {
        this.setStyle({
          weight: 2,
          fillOpacity: 0.12,
          dashArray: "4, 4"
        });
      });

      // Sector Popup
      const popupContent = `
        <div class="tactical-popup">
          <div class="popup-header">
            <span class="popup-code">SECTOR ${sec.code.toUpperCase()}</span>
            <span class="popup-badge ${sec.badgeClass}">RISK: ${sec.currentRisk}/100</span>
          </div>
          <h4 class="popup-title">${sec.name}</h4>
          <p class="popup-desc">${sec.description}</p>
          <div class="popup-grid">
            <div><span class="dim">Active Units:</span> <strong>${sec.activeUnits}</strong></div>
            <div><span class="dim">Target Freq:</span> <strong>Every ${sec.targetPatrolFreqMins}m</strong></div>
            <div><span class="dim">Last Patrolled:</span> <strong>${sec.lastPatrolMinsAgo}m ago</strong></div>
            <div><span class="dim">Coverage Status:</span> <strong class="${sec.isDeficit ? 'text-crimson' : 'text-emerald'}">${sec.isDeficit ? 'Deficit' : 'Optimal'}</strong></div>
          </div>
          <div class="popup-actions">
            <button class="btn btn-sm btn-primary" onclick="window.app.assignPatrolToSector('${sec.id}')">
              <i class="icon-shield"></i> Deploy Priority Patrol
            </button>
            <button class="btn btn-sm btn-outline" onclick="window.app.filterBySector('${sec.id}')">
              Filter Sector
            </button>
          </div>
        </div>
      `;
      polygon.bindPopup(popupContent, { className: 'custom-leaflet-popup' });

      // Label at sector center
      const labelIcon = L.divIcon({
        className: 'sector-map-label',
        html: `<div class="sector-label-badge" style="border-color:${borderColor}; color:${borderColor}">
                 <span class="sector-tag">SEC-${sec.code}</span>
                 <span class="sector-risk-val">${sec.currentRisk}</span>
               </div>`,
        iconSize: [80, 26],
        iconAnchor: [40, 13]
      });
      const markerLabel = L.marker(sec.center, { icon: labelIcon, interactive: false });

      this.layers.sectors.addLayer(polygon);
      this.layers.sectors.addLayer(markerLabel);
    });
  }

  /**
   * Render Crime Incident Markers with Severity Color Coding
   */
  renderIncidents() {
    this.layers.crimes.clearLayers();
    if (!this.layerVisibility.crimes) return;

    const incidents = window.analyticsEngine.getFilteredIncidents();

    incidents.forEach(inc => {
      let colorClass = "inc-low";
      let pulseHtml = "";
      if (inc.severity === "CRITICAL") {
        colorClass = "inc-critical";
        pulseHtml = `<span class="marker-pulse-ring pulse-crimson"></span>`;
      } else if (inc.severity === "HIGH") {
        colorClass = "inc-high";
        pulseHtml = `<span class="marker-pulse-ring pulse-amber"></span>`;
      } else if (inc.severity === "MEDIUM") {
        colorClass = "inc-medium";
      }

      const icon = L.divIcon({
        className: 'tactical-crime-marker',
        html: `
          <div class="marker-body ${colorClass}">
            ${pulseHtml}
            <span class="marker-code">${inc.code}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([inc.lat, inc.lng], { icon });

      const popupContent = `
        <div class="tactical-popup">
          <div class="popup-header">
            <span class="popup-code">${inc.code} • ${inc.category.toUpperCase()}</span>
            <span class="popup-badge badge-${inc.severity.toLowerCase()}">${inc.severity}</span>
          </div>
          <h4 class="popup-title">${inc.title}</h4>
          <div class="popup-meta">
            <span><i class="icon-clock"></i> ${inc.timestamp}</span>
            <span><i class="icon-map-pin"></i> ${inc.location}</span>
          </div>
          <p class="popup-desc">${inc.details}</p>
          <div class="popup-grid">
            <div><span class="dim">Sector:</span> <strong>${inc.sectorName}</strong></div>
            <div><span class="dim">Status:</span> <strong class="text-amber">${inc.status}</strong></div>
            <div><span class="dim">Assigned Unit:</span> <strong>${inc.officerResponding}</strong></div>
          </div>
          <div class="popup-actions">
            <button class="btn btn-sm btn-primary" onclick="window.app.dispatchBackupToIncident('${inc.id}')">
              <i class="icon-radio"></i> Dispatch Backup
            </button>
            <button class="btn btn-sm btn-outline" onclick="window.app.focusIncidentInLog('${inc.id}')">
              View Log
            </button>
          </div>
        </div>
      `;
      marker.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
      this.layers.crimes.addLayer(marker);
    });
  }

  /**
   * Render Accident Hotspot Markers
   */
  renderAccidents() {
    this.layers.accidents.clearLayers();
    if (!this.layerVisibility.accidents) return;

    const accidents = window.analyticsEngine.getFilteredAccidents();

    accidents.forEach(acc => {
      const icon = L.divIcon({
        className: 'tactical-accident-marker',
        html: `
          <div class="marker-accident-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFA726" stroke-width="2.5">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span class="acc-count">${acc.collisionCount30d}</span>
          </div>
        `,
        iconSize: [36, 24],
        iconAnchor: [18, 12]
      });

      const marker = L.marker([acc.lat, acc.lng], { icon });

      const popupContent = `
        <div class="tactical-popup">
          <div class="popup-header">
            <span class="popup-code">${acc.id} • TRAFFIC HAZARD</span>
            <span class="popup-badge badge-high">SEV ${acc.severityIndex}/100</span>
          </div>
          <h4 class="popup-title">${acc.intersection}</h4>
          <p class="popup-desc">${acc.riskFactor}</p>
          <div class="popup-grid">
            <div><span class="dim">30-Day Crashes:</span> <strong class="text-amber">${acc.collisionCount30d}</strong></div>
            <div><span class="dim">Peak Hours:</span> <strong>${acc.peakHours}</strong></div>
            <div><span class="dim">Primary Cause:</span> <strong>${acc.primaryCause}</strong></div>
            <div><span class="dim">Pedestrians:</span> <strong>${acc.pedestrianInvolved ? 'Yes (At Risk)' : 'Vehicle Only'}</strong></div>
          </div>
          <div class="popup-actions">
            <button class="btn btn-sm btn-primary" onclick="window.app.scheduleTrafficPatrol('${acc.id}')">
              <i class="icon-radar"></i> Schedule Traffic Radar
            </button>
          </div>
        </div>
      `;
      marker.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
      this.layers.accidents.addLayer(marker);
    });
  }

  /**
   * Render Blind Spots (Coverage gaps)
   */
  renderBlindSpots() {
    this.layers.blindSpots.clearLayers();
    if (!this.layerVisibility.blindSpots) return;

    const blindSpots = window.analyticsEngine.getActiveBlindSpots();

    blindSpots.forEach(bs => {
      // Danger circle perimeter
      const circle = L.circle([bs.lat, bs.lng], {
        radius: bs.radius,
        color: '#EF4444',
        weight: 1.5,
        dashArray: "6, 6",
        fillColor: '#EF4444',
        fillOpacity: 0.15
      });

      const icon = L.divIcon({
        className: 'blind-spot-marker',
        html: `
          <div class="radar-blind-spot-beacon">
            <span class="blind-wave"></span>
            <div class="blind-center-core">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const centerMarker = L.marker([bs.lat, bs.lng], { icon });

      const popupContent = `
        <div class="tactical-popup">
          <div class="popup-header">
            <span class="popup-code">${bs.id} • COVERAGE DEFICIT</span>
            <span class="popup-badge badge-critical">${bs.timeUncoveredMins}M UNCOVERED</span>
          </div>
          <h4 class="popup-title">${bs.title}</h4>
          <p class="popup-desc">${bs.reason}</p>
          <div class="popup-alert-box">
            <i class="icon-alert-triangle"></i>
            <span><strong>Tactical Directive:</strong> ${bs.suggestedAction}</span>
          </div>
          <div class="popup-grid">
            <div><span class="dim">Risk Score:</span> <strong class="text-crimson">${bs.dynamicRisk}/100</strong></div>
            <div><span class="dim">Nearest Unit:</span> <strong>${bs.nearestUnitId} (${bs.distanceKm} km)</strong></div>
          </div>
          <div class="popup-actions">
            <button class="btn btn-sm btn-crimson" onclick="window.app.deployBlindSpotIntercept('${bs.id}')">
              <i class="icon-zap"></i> Deploy Intercept Now
            </button>
          </div>
        </div>
      `;
      centerMarker.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
      circle.bindPopup(popupContent, { className: 'custom-leaflet-popup' });

      this.layers.blindSpots.addLayer(circle);
      this.layers.blindSpots.addLayer(centerMarker);
    });
  }

  /**
   * Render Patrol Units with Call signs & Status
   */
  renderUnits() {
    this.layers.units.clearLayers();
    this.unitMarkers = {};
    if (!this.layerVisibility.units) return;

    PATROL_UNITS.forEach(unit => {
      let statusColor = "#10B981"; // Available/Patrol
      let statusClass = "unit-patrol";
      if (unit.status === "DISPATCHED" || unit.status === "EN ROUTE") {
        statusColor = "#EF4444";
        statusClass = "unit-dispatched";
      } else if (unit.status === "AVAILABLE") {
        statusColor = "#3B82F6";
        statusClass = "unit-available";
      }

      const icon = L.divIcon({
        className: 'tactical-unit-marker',
        html: `
          <div class="unit-marker-container ${statusClass}">
            <div class="unit-halo"></div>
            <div class="unit-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11.2 2 11.7V16c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <path d="M9 17h6"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
              <span class="unit-label">${unit.callsign}</span>
            </div>
          </div>
        `,
        iconSize: [68, 30],
        iconAnchor: [34, 15]
      });

      const marker = L.marker([unit.lat, unit.lng], { icon });

      const popupContent = `
        <div class="tactical-popup">
          <div class="popup-header">
            <span class="popup-code">${unit.id} • ${unit.type.toUpperCase()}</span>
            <span class="popup-badge ${unit.status === 'DISPATCHED' ? 'badge-critical' : 'badge-low'}">${unit.status}</span>
          </div>
          <h4 class="popup-title">${unit.callsign}</h4>
          <p class="popup-desc"><i class="icon-user"></i> ${unit.officers}</p>
          <div class="popup-grid">
            <div><span class="dim">Sector:</span> <strong>${unit.assignedSector}</strong></div>
            <div><span class="dim">Speed:</span> <strong>${unit.speed} mph</strong></div>
            <div><span class="dim">Fuel / Batt:</span> <strong class="${unit.fuel < 60 ? 'text-amber' : 'text-emerald'}">${unit.fuel}%</strong></div>
            <div><span class="dim">Coverage Score:</span> <strong>${unit.coverageScore}%</strong></div>
          </div>
          <div class="popup-actions">
            <button class="btn btn-sm btn-primary" onclick="window.app.openUnitTelemetry('${unit.id}')">
              <i class="icon-radio"></i> Unit Telemetry
            </button>
            <button class="btn btn-sm btn-outline" onclick="window.app.reassignUnitModal('${unit.id}')">
              Reassign
            </button>
          </div>
        </div>
      `;
      marker.bindPopup(popupContent, { className: 'custom-leaflet-popup' });

      this.layers.units.addLayer(marker);
      this.unitMarkers[unit.id] = marker;
    });
  }

  /**
   * Render Density Heatmap using Leaflet.heat
   */
  renderHeatmap() {
    if (this.layers.heatmap) {
      this.map.removeLayer(this.layers.heatmap);
      this.layers.heatmap = null;
    }

    if (!this.layerVisibility.heatmap || typeof L.heatLayer !== 'function') return;

    // Collect crime and accident coordinates with intensity weights
    const heatPoints = [];

    const incidents = window.analyticsEngine.getFilteredIncidents();
    incidents.forEach(inc => {
      let intensity = 0.5;
      if (inc.severity === "CRITICAL") intensity = 1.0;
      else if (inc.severity === "HIGH") intensity = 0.8;
      else if (inc.severity === "MEDIUM") intensity = 0.5;
      else intensity = 0.3;
      heatPoints.push([inc.lat, inc.lng, intensity]);
    });

    const accidents = window.analyticsEngine.getFilteredAccidents();
    accidents.forEach(acc => {
      heatPoints.push([acc.lat, acc.lng, (acc.severityIndex / 100) * 0.9]);
    });

    this.layers.heatmap = L.heatLayer(heatPoints, {
      radius: 28,
      blur: 20,
      maxZoom: 16,
      max: 1.0,
      gradient: {
        0.2: '#06b6d4', // cyan
        0.4: '#3b82f6', // blue
        0.6: '#eab308', // yellow
        0.8: '#f97316', // orange
        1.0: '#ef4444'  // crimson red
      }
    }).addTo(this.map);
  }

  /**
   * Render and highlight an optimized patrol route
   */
  displayPatrolRoute(routeData) {
    // Clear old route
    this.clearPatrolRoute();

    if (!routeData || !routeData.coords || routeData.coords.length < 2) return;

    // Polyline with tactical glowing aesthetic
    this.activeRoutePolyline = L.polyline(routeData.coords, {
      color: '#06B6D4',
      weight: 4,
      opacity: 0.9,
      dashArray: '8, 8',
      className: 'patrol-animated-route'
    }).addTo(this.layers.patrolRoutes);

    // Add waypoint numbered markers
    routeData.waypoints.forEach((wp, idx) => {
      const icon = L.divIcon({
        className: 'route-waypoint-marker',
        html: `
          <div class="waypoint-pin">
            <span class="wp-num">${idx + 1}</span>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([wp.lat, wp.lng], { icon });
      marker.bindPopup(`
        <div class="tactical-popup">
          <div class="popup-header">
            <span class="popup-code">WAYPOINT ${idx + 1}</span>
            <span class="popup-badge badge-primary">${wp.durationMins} MINS</span>
          </div>
          <h4 class="popup-title">${wp.name}</h4>
          <p class="popup-desc"><i class="icon-target"></i> Objective: <strong>${wp.type}</strong></p>
        </div>
      `, { className: 'custom-leaflet-popup' });

      this.layers.patrolRoutes.addLayer(marker);
      this.activeRouteMarkers.push(marker);
    });

    // Zoom map to fit route
    this.map.fitBounds(this.activeRoutePolyline.getBounds(), { padding: [50, 50], maxZoom: 15 });
  }

  clearPatrolRoute() {
    this.layers.patrolRoutes.clearLayers();
    this.activeRoutePolyline = null;
    this.activeRouteMarkers = [];
  }

  /**
   * Handle user map click: instant risk assessment at coordinate
   */
  handleMapClick(latlng) {
    const lat = latlng.lat.toFixed(4);
    const lng = latlng.lng.toFixed(4);

    // Calculate nearest sector
    let nearestSector = SECTORS_DATA[0];
    let minDist = 999999;
    SECTORS_DATA.forEach(s => {
      const d = Math.hypot(s.center[0] - latlng.lat, s.center[1] - latlng.lng);
      if (d < minDist) {
        minDist = d;
        nearestSector = s;
      }
    });

    const evaluated = window.analyticsEngine.getEvaluatedSectors().find(s => s.id === nearestSector.id);
    const risk = evaluated ? evaluated.currentRisk : 60;

    const popup = L.popup({ className: 'custom-leaflet-popup' })
      .setLatLng(latlng)
      .setContent(`
        <div class="tactical-popup">
          <div class="popup-header">
            <span class="popup-code">TACTICAL QUERY</span>
            <span class="popup-badge badge-primary">GPS: ${lat}, ${lng}</span>
          </div>
          <h4 class="popup-title">Location Risk Analysis</h4>
          <p class="popup-desc">Closest Sector: <strong>${nearestSector.name}</strong></p>
          <div class="popup-grid">
            <div><span class="dim">Sector Risk:</span> <strong class="${risk > 70 ? 'text-crimson' : 'text-amber'}">${risk}/100</strong></div>
            <div><span class="dim">Active Units:</span> <strong>${nearestSector.activeUnits}</strong></div>
          </div>
          <div class="popup-actions">
            <button class="btn btn-sm btn-primary" onclick="window.app.createWaypointAt(${lat}, ${lng})">
              <i class="icon-plus"></i> Add Patrol Waypoint
            </button>
          </div>
        </div>
      `)
      .openOn(this.map);
  }

  toggleLayer(layerName, visible) {
    this.layerVisibility[layerName] = visible;
    if (layerName === 'crimes') this.renderIncidents();
    if (layerName === 'accidents') this.renderAccidents();
    if (layerName === 'sectors') this.renderSectors();
    if (layerName === 'units') this.renderUnits();
    if (layerName === 'blindSpots') this.renderBlindSpots();
    if (layerName === 'heatmap') this.renderHeatmap();
    if (layerName === 'patrolRoutes' && !visible) this.clearPatrolRoute();
  }

  focusCoordinates(lat, lng, zoom = 16) {
    if (this.map) {
      this.map.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  }

  resetView() {
    if (this.map) {
      this.map.flyTo([41.8845, -87.6335], 14, { duration: 1.0 });
    }
  }
}

// Global instance
window.tacticalMap = new TacticalMap();
