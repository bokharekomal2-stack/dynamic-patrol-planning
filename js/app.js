/**
 * DYNAMIC PATROL PLANNING - Main Application Controller
 * Handles view routing, UI rendering, event listeners, modals, and user interactions.
 */

class DynamicPatrolApp {
  constructor() {
    this.currentView = "dashboard";
    this.activeModal = null;
  }

  init() {
    // 1. Initialize Map
    window.tacticalMap.init();

    // 2. Initialize Charts & Heatmap
    window.tacticalCharts.init();

    // 3. Initialize Simulator Clock
    window.patrolSimulator.init();

    // 4. Render All UI Views
    this.renderKPIs();
    this.renderAreaRankings();
    this.renderRecommendations();
    this.renderBlindSpots();
    this.renderFleetRoster();
    this.renderIncidentTable();

    // 5. Setup Event Listeners
    this.setupEventListeners();

    // 6. Live Clock Zulu & Local
    this.startLiveSystemClocks();

    console.log("Tactical Command Center: Dynamic Patrol Planning Initialized.");
  }

  /**
   * Real-time Local and Zulu (UTC) Military Clock
   */
  startLiveSystemClocks() {
    const update = () => {
      const now = new Date();
      const zulu = now.toISOString().substring(11, 19) + "Z";
      const local = now.toTimeString().substring(0, 8);
      const zuluEl = document.getElementById('zuluClock');
      const localEl = document.getElementById('localClock');
      if (zuluEl) zuluEl.innerText = zulu;
      if (localEl) localEl.innerText = local;
    };
    update();
    setInterval(update, 1000);
  }

  /**
   * View Switcher Navigation
   */
  switchView(viewName) {
    this.currentView = viewName;

    // Update navigation active states
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Hide/show view sections
    document.querySelectorAll('.view-section').forEach(section => {
      section.classList.toggle('active-view', section.id === `view-${viewName}`);
    });

    // Special layout triggers
    const mapEl = document.getElementById('map');
    if (viewName === 'map') {
      const fullPlaceholder = document.getElementById('fullMapPlaceholder');
      if (fullPlaceholder && mapEl) {
        fullPlaceholder.appendChild(mapEl);
        mapEl.style.height = '100%';
      }
      setTimeout(() => {
        window.tacticalMap.map.invalidateSize();
      }, 100);
    } else if (viewName === 'dashboard') {
      const dashPanel = document.getElementById('dashboardMapPanel');
      if (dashPanel && mapEl) {
        dashPanel.appendChild(mapEl);
        mapEl.style.height = '100%';
      }
      setTimeout(() => {
        window.tacticalMap.map.invalidateSize();
      }, 100);
    }

    if (viewName === 'heatmap') {
      window.tacticalCharts.renderTimeDayHeatmapGrid();
      window.tacticalCharts.initHourlyRiskChart();
    }

    if (viewName === 'recommendations') {
      this.renderRecommendations();
    }

    if (viewName === 'units') {
      this.renderFleetRoster();
      this.renderBlindSpots();
    }
  }

  /**
   * Render Top KPI Metric Cards
   */
  renderKPIs() {
    const kpi = window.analyticsEngine.getKPISummary();

    // Risk Index
    const riskValEl = document.getElementById('kpiRiskVal');
    const riskStatusEl = document.getElementById('kpiRiskStatus');
    if (riskValEl) riskValEl.innerText = `${kpi.cityRiskScore}/100`;
    if (riskStatusEl) {
      riskStatusEl.innerText = kpi.cityRiskStatus;
      riskStatusEl.className = `kpi-sub ${kpi.cityRiskClass}`;
    }

    // Active Incidents
    const incValEl = document.getElementById('kpiIncidentsVal');
    const incSubEl = document.getElementById('kpiIncidentsSub');
    if (incValEl) incValEl.innerText = kpi.activeIncidents;
    if (incSubEl) incSubEl.innerText = `${kpi.criticalIncidents} Critical Priority`;

    // Patrol Units Deployed
    const unitsValEl = document.getElementById('kpiUnitsVal');
    const unitsSubEl = document.getElementById('kpiUnitsSub');
    if (unitsValEl) unitsValEl.innerText = kpi.deployedUnits;
    if (unitsSubEl) unitsSubEl.innerText = `${kpi.unitsDeploymentPct}% Fleet Active`;

    // Patrol Blind Spots
    const blindValEl = document.getElementById('kpiBlindSpotsVal');
    const blindSubEl = document.getElementById('kpiBlindSpotsSub');
    if (blindValEl) blindValEl.innerText = kpi.blindSpotsCount;
    if (blindSubEl) blindSubEl.innerText = `Requires Intercept`;

    // Average Response Time
    const respValEl = document.getElementById('kpiResponseVal');
    if (respValEl) respValEl.innerText = kpi.avgResponseTime;

    // Header Threat Status Badge
    const headerDefconEl = document.getElementById('headerThreatBadge');
    if (headerDefconEl) {
      if (kpi.cityRiskScore >= 75) {
        headerDefconEl.innerHTML = `<span class="pulse-dot crimson"></span> DEFCON 2 • CRITICAL RISK (${kpi.cityRiskScore})`;
        headerDefconEl.className = "header-badge badge-threat-critical";
      } else if (kpi.cityRiskScore >= 60) {
        headerDefconEl.innerHTML = `<span class="pulse-dot amber"></span> DEFCON 3 • ELEVATED RISK (${kpi.cityRiskScore})`;
        headerDefconEl.className = "header-badge badge-threat-elevated";
      } else {
        headerDefconEl.innerHTML = `<span class="pulse-dot emerald"></span> DEFCON 4 • STABLE (${kpi.cityRiskScore})`;
        headerDefconEl.className = "header-badge badge-threat-stable";
      }
    }
  }

  /**
   * Render Area / Sector Priority Ranking Table
   */
  renderAreaRankings() {
    const container = document.getElementById('areaRankingsList');
    if (!container) return;

    const evaluated = window.analyticsEngine.getEvaluatedSectors();

    let html = `
      <div class="priority-rank-table">
        <div class="priority-table-head">
          <div class="col-rank">RANK</div>
          <div class="col-sector">SECTOR / DISTRICT</div>
          <div class="col-risk">RISK INDEX (0-100)</div>
          <div class="col-units">UNITS (ACT / REC)</div>
          <div class="col-status">DEFICIT STATUS</div>
          <div class="col-action">DIRECTIVE</div>
        </div>
        <div class="priority-table-body">
    `;

    evaluated.forEach((sec, idx) => {
      let riskProgressColor = "#10B981";
      if (sec.currentRisk >= 80) riskProgressColor = "#EF4444";
      else if (sec.currentRisk >= 65) riskProgressColor = "#F59E0B";
      else if (sec.currentRisk >= 45) riskProgressColor = "#3B82F6";

      html += `
        <div class="priority-row ${sec.isDeficit ? 'row-deficit' : ''}" onclick="window.app.zoomToSector('${sec.id}')">
          <div class="col-rank">
            <span class="rank-badge rank-${idx + 1}">#${idx + 1}</span>
          </div>
          <div class="col-sector">
            <strong>SEC-${sec.code}: ${sec.name}</strong>
            <span class="dim sub-text">${sec.populationDensity}</span>
          </div>
          <div class="col-risk">
            <div class="risk-score-bar-container">
              <span class="risk-number" style="color: ${riskProgressColor}">${sec.currentRisk}</span>
              <div class="risk-progress-bg">
                <div class="risk-progress-fill" style="width: ${sec.currentRisk}%; background: ${riskProgressColor}"></div>
              </div>
            </div>
          </div>
          <div class="col-units">
            <span class="units-ratio ${sec.isDeficit ? 'text-crimson' : 'text-emerald'}">
              <strong>${sec.activeUnits}</strong> / ${sec.recommendedUnits}
            </span>
          </div>
          <div class="col-status">
            <span class="badge ${sec.badgeClass}">${sec.threatLevel}</span>
            ${sec.isDeficit ? '<span class="badge-tag tag-alert">+1 UNIT REQ</span>' : '<span class="badge-tag tag-opt">BALANCED</span>'}
          </div>
          <div class="col-action" onclick="event.stopPropagation()">
            <button class="btn btn-xs btn-primary" onclick="window.app.assignPatrolToSector('${sec.id}')">
              Deploy
            </button>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Render AI Patrol Recommendations Cards
   */
  renderRecommendations() {
    const container1 = document.getElementById('patrolRecommendationsList');
    const container2 = document.getElementById('fullRecommendationsContainer');
    if (!container1 && !container2) return;

    const recs = window.patrolPlanner.generatePatrolRecommendations();

    let html = `<div class="recommendations-grid">`;

    recs.forEach(rec => {
      let badgeClass = rec.priority === "CRITICAL" ? "badge-critical" : "badge-high";

      html += `
        <div class="rec-card ${rec.priority === 'CRITICAL' ? 'rec-border-critical' : ''}">
          <div class="rec-header">
            <div class="rec-title-wrap">
              <span class="badge ${badgeClass}">${rec.priority}</span>
              <span class="rec-sector-tag">${rec.sectorName}</span>
            </div>
            <span class="rec-reduction-tag">${rec.projectedRiskReduction}</span>
          </div>
          <h3 class="rec-heading">${rec.title}</h3>
          <p class="rec-strategy">${rec.strategy}</p>

          <div class="rec-meta-box">
            <div class="meta-item"><span class="dim">Optimal Time Window:</span> <strong>${rec.targetWindow}</strong></div>
            <div class="meta-item"><span class="dim">Assigned / Suggested:</span> <strong class="text-cyan">${rec.suggestedUnit}</strong></div>
            <div class="meta-item"><span class="dim">Action Type:</span> <strong>${rec.actionType}</strong></div>
          </div>

          <div class="rec-waypoints">
            <div class="waypoints-title"><i class="icon-list"></i> Tactical Waypoints (${rec.waypoints.length} Checkpoints):</div>
            <ol class="waypoints-list">
              ${rec.waypoints.map((wp, i) => `
                <li>
                  <span class="wp-name">${wp.name}</span>
                  <span class="wp-time">${wp.durationMins}m • ${wp.type}</span>
                </li>
              `).join('')}
            </ol>
          </div>

          <div class="rec-footer-actions">
            <button class="btn btn-sm btn-primary" onclick="window.app.applyRecommendationRoute('${rec.id}')">
              <i class="icon-map"></i> View & Execute Route
            </button>
            <button class="btn btn-sm btn-outline" onclick="window.app.dispatchRouteDirect('${rec.suggestedUnit}', '${rec.title}')">
              <i class="icon-radio"></i> Dispatch Unit
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    if (container1) container1.innerHTML = html;
    if (container2) container2.innerHTML = html;
  }

  /**
   * Render Patrol Blind Spots Radar
   */
  renderBlindSpots() {
    const container1 = document.getElementById('blindSpotsList');
    const container2 = document.getElementById('fullBlindSpotsList');
    if (!container1 && !container2) return;

    const blindSpots = window.analyticsEngine.getActiveBlindSpots();

    let html = `<div class="blind-spots-grid">`;

    blindSpots.forEach(bs => {
      html += `
        <div class="blind-card ${bs.severity === 'CRITICAL' ? 'blind-critical' : ''}">
          <div class="blind-header">
            <div>
              <span class="badge badge-${bs.severity.toLowerCase()}">${bs.severity}</span>
              <span class="blind-id">${bs.id}</span>
            </div>
            <div class="blind-timer">
              <i class="icon-alert-circle"></i>
              <strong>${bs.timeUncoveredMins} MINS UNPATROLLED</strong>
            </div>
          </div>
          <h4 class="blind-title">${bs.title}</h4>
          <p class="blind-desc">${bs.reason}</p>
          <div class="blind-action-directive">
            <span class="dim">Directive:</span> ${bs.suggestedAction}
          </div>
          <div class="blind-footer">
            <div class="blind-unit-rec">
              <span class="dim">Nearest Unit:</span> <strong>${bs.nearestUnitId} (${bs.distanceKm} km away)</strong>
            </div>
            <button class="btn btn-xs btn-crimson" onclick="window.app.deployBlindSpotIntercept('${bs.id}')">
              <i class="icon-zap"></i> Deploy Intercept
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    if (container1) container1.innerHTML = html;
    if (container2) container2.innerHTML = html;
  }

  /**
   * Render Fleet Roster Cards
   */
  renderFleetRoster() {
    const container = document.getElementById('fleetRosterList');
    if (!container) return;

    let html = `<div class="fleet-grid">`;

    PATROL_UNITS.forEach(unit => {
      let statusClass = "badge-low";
      if (unit.status === "DISPATCHED" || unit.status === "EN ROUTE") statusClass = "badge-critical";
      else if (unit.status === "AVAILABLE") statusClass = "badge-primary";

      html += `
        <div class="unit-roster-card">
          <div class="unit-roster-top">
            <div class="unit-callsign-wrap">
              <span class="unit-avatar"><i class="icon-shield"></i></span>
              <div>
                <h4 class="unit-callsign">${unit.callsign}</h4>
                <span class="unit-type dim">${unit.type}</span>
              </div>
            </div>
            <span class="badge ${statusClass}">${unit.status}</span>
          </div>

          <div class="unit-officers">
            <i class="icon-user"></i> ${unit.officers}
          </div>

          <div class="unit-stats-grid">
            <div class="stat-box">
              <span class="dim">Sector:</span>
              <strong>${unit.assignedSector}</strong>
            </div>
            <div class="stat-box">
              <span class="dim">Speed:</span>
              <strong>${unit.speed} mph</strong>
            </div>
            <div class="stat-box">
              <span class="dim">Fuel:</span>
              <strong class="${unit.fuel < 60 ? 'text-amber' : 'text-emerald'}">${unit.fuel}%</strong>
            </div>
            <div class="stat-box">
              <span class="dim">Coverage:</span>
              <strong>${unit.coverageScore}%</strong>
            </div>
          </div>

          <div class="unit-card-actions">
            <button class="btn btn-xs btn-outline" onclick="window.tacticalMap.focusCoordinates(${unit.lat}, ${unit.lng}, 16)">
              <i class="icon-map-pin"></i> Locate
            </button>
            <button class="btn btn-xs btn-primary" onclick="window.app.reassignUnitModal('${unit.id}')">
              <i class="icon-edit"></i> Reassign
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  /**
   * Render Incident Intelligence Log Table
   */
  renderIncidentTable() {
    const container = document.getElementById('incidentTableBody');
    if (!container) return;

    const incidents = window.analyticsEngine.getFilteredIncidents();

    if (incidents.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 dim">
            No incidents match current filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    let html = "";
    incidents.forEach(inc => {
      let sevClass = "badge-low";
      if (inc.severity === "CRITICAL") sevClass = "badge-critical";
      else if (inc.severity === "HIGH") sevClass = "badge-high";
      else if (inc.severity === "MEDIUM") sevClass = "badge-moderate";

      html += `
        <tr class="incident-row" onclick="window.app.viewIncidentModal('${inc.id}')">
          <td><strong class="text-cyan">${inc.id}</strong></td>
          <td><span class="code-pill">${inc.code}</span></td>
          <td>
            <strong>${inc.title}</strong>
            <span class="dim sub-text">${inc.details.substring(0, 50)}...</span>
          </td>
          <td><span class="badge ${sevClass}">${inc.severity}</span></td>
          <td>${inc.location} <span class="dim">(${inc.sectorName})</span></td>
          <td>${inc.timestamp}</td>
          <td onclick="event.stopPropagation()">
            <button class="btn btn-xs btn-primary" onclick="window.app.dispatchBackupToIncident('${inc.id}')">
              Dispatch
            </button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = html;
  }

  /**
   * Setup Event Listeners for Filters & Interactions
   */
  setupEventListeners() {
    // Navigation Tab Buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchView(btn.dataset.view);
      });
    });

    // Global Filters: Category
    const categorySelect = document.getElementById('filterCategory');
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        window.analyticsEngine.setFilters({ category: e.target.value });
        this.refreshDataViews();
      });
    }

    // Global Filters: Severity
    const severitySelect = document.getElementById('filterSeverity');
    if (severitySelect) {
      severitySelect.addEventListener('change', (e) => {
        window.analyticsEngine.setFilters({ severity: e.target.value });
        this.refreshDataViews();
      });
    }

    // Global Filters: Shift / Time
    const timeShiftSelect = document.getElementById('filterTimeShift');
    if (timeShiftSelect) {
      timeShiftSelect.addEventListener('change', (e) => {
        window.analyticsEngine.setFilters({ timeShift: e.target.value });
        this.refreshDataViews();
      });
    }

    // Global Filters: Sector
    const sectorSelect = document.getElementById('filterSector');
    if (sectorSelect) {
      sectorSelect.addEventListener('change', (e) => {
        window.analyticsEngine.setFilters({ sectorId: e.target.value });
        this.refreshDataViews();
      });
    }

    // Global Search
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        window.analyticsEngine.setFilters({ searchQuery: e.target.value });
        this.renderIncidentTable();
      });
    }

    // Map Layer Checkbox Toggles
    document.querySelectorAll('.map-layer-toggle').forEach(chk => {
      chk.addEventListener('change', (e) => {
        window.tacticalMap.toggleLayer(e.target.dataset.layer, e.target.checked);
      });
    });

    // Planner Weight Sliders
    const sliderCrime = document.getElementById('sliderWeightCrime');
    const sliderAccident = document.getElementById('sliderWeightAccident');
    const sliderPatrol = document.getElementById('sliderWeightPatrol');

    const updateWeights = () => {
      if (sliderCrime && sliderAccident && sliderPatrol) {
        const c = parseFloat(sliderCrime.value) / 100;
        const a = parseFloat(sliderAccident.value) / 100;
        const p = parseFloat(sliderPatrol.value) / 100;
        window.analyticsEngine.setWeights({
          crimeSeverity: c,
          accidentHotspot: a,
          patrolDeficit: p
        });
        document.getElementById('weightCrimeVal').innerText = `${Math.round(c * 100)}%`;
        document.getElementById('weightAccidentVal').innerText = `${Math.round(a * 100)}%`;
        document.getElementById('weightPatrolVal').innerText = `${Math.round(p * 100)}%`;
        this.refreshDataViews();
      }
    };

    if (sliderCrime) sliderCrime.addEventListener('input', updateWeights);
    if (sliderAccident) sliderAccident.addEventListener('input', updateWeights);
    if (sliderPatrol) sliderPatrol.addEventListener('input', updateWeights);
  }

  /**
   * Refreshes all dependent views when filters or weights change
   */
  refreshDataViews() {
    window.tacticalMap.renderIncidents();
    window.tacticalMap.renderAccidents();
    window.tacticalMap.renderSectors();
    window.tacticalMap.renderHeatmap();
    window.tacticalMap.renderBlindSpots();

    window.tacticalCharts.updateCharts();

    this.renderKPIs();
    this.renderAreaRankings();
    this.renderRecommendations();
    this.renderBlindSpots();
    this.renderIncidentTable();
  }

  /**
   * Apply recommendation and project route onto map
   */
  applyRecommendationRoute(recId) {
    const recs = window.patrolPlanner.generatePatrolRecommendations();
    const rec = recs.find(r => r.id === recId) || recs[0];
    const route = window.patrolPlanner.generateRouteForRecommendation(rec);

    window.tacticalMap.displayPatrolRoute(route);
    this.switchView('map');
    this.showToast(`Tactical Route Activated for ${route.unit}: ${route.title} (${route.totalShiftTime})`, 'info');
  }

  /**
   * Direct route dispatch confirmation
   */
  dispatchRouteDirect(unitCallsign, title) {
    const res = window.patrolPlanner.dispatchRoute(unitCallsign, title);
    this.showToast(res.message, 'success');
    window.patrolSimulator.playTone(750, 'sine', 0.2);
    this.renderFleetRoster();
    this.renderKPIs();
  }

  /**
   * Deploy immediate blind spot intercept
   */
  deployBlindSpotIntercept(blindSpotId) {
    const spot = BLIND_SPOTS_DATA.find(b => b.id === blindSpotId);
    if (spot) {
      const unit = PATROL_UNITS.find(u => u.id === spot.nearestUnitId);
      if (unit) {
        unit.status = "DISPATCHED";
        unit.waypoints = [
          [spot.lat, spot.lng],
          [spot.lat + 0.002, spot.lng + 0.002],
          [spot.lat - 0.002, spot.lng - 0.002]
        ];
        unit.currentWaypointIndex = 0;
      }

      // Remove from uncovered blind spots or mark resolved
      spot.timeUncoveredMins = 0;
      spot.reason = `Intercept underway by ${spot.nearestUnitId}`;

      window.patrolSimulator.playAlertSound();
      this.showToast(`🚨 HIGH PRIORITY INTERCEPT: ${spot.nearestUnitId} dispatched to close ${spot.title}!`, 'critical');

      this.refreshDataViews();
      this.renderFleetRoster();
      window.tacticalMap.focusCoordinates(spot.lat, spot.lng, 15);
    }
  }

  /**
   * Assign or deploy patrol to a specific sector
   */
  assignPatrolToSector(sectorId) {
    const sector = SECTORS_DATA.find(s => s.id === sectorId);
    if (!sector) return;

    sector.activeUnits++;
    sector.lastPatrolMinsAgo = 0;

    // Find first available unit and assign
    const availUnit = PATROL_UNITS.find(u => u.status === "AVAILABLE") || PATROL_UNITS[0];
    availUnit.status = "ON PATROL";
    availUnit.assignedSector = sector.id;

    window.patrolSimulator.playTone(800, 'triangle', 0.15);
    this.showToast(`Unit ${availUnit.callsign} deployed to ${sector.name}. Sector coverage upgraded.`, 'success');

    this.refreshDataViews();
    this.renderFleetRoster();
  }

  /**
   * Zoom map to sector
   */
  zoomToSector(sectorId) {
    const sec = SECTORS_DATA.find(s => s.id === sectorId);
    if (sec) {
      this.switchView('map');
      window.tacticalMap.focusCoordinates(sec.center[0], sec.center[1], 15);
    }
  }

  /**
   * Select cell on 7x24 heatmap to inspect and simulate that time pattern
   */
  selectHeatmapCell(dayIdx, hourIdx) {
    const days = TIME_DAY_HEATMAP_MATRIX.days;
    const hour = TIME_DAY_HEATMAP_MATRIX.hours[hourIdx];
    const risk = TIME_DAY_HEATMAP_MATRIX.matrix[dayIdx][hourIdx];

    window.analyticsEngine.setSimulatedTime(dayIdx, hourIdx);
    window.tacticalCharts.renderTimeDayHeatmapGrid();
    window.tacticalCharts.initHourlyRiskChart();

    this.renderKPIs();
    this.renderAreaRankings();
    this.renderRecommendations();

    this.showToast(`Temporal Analysis Synchronized: ${days[dayIdx]} ${hour} — Peak Risk Score: ${risk}/100`, 'info');
  }

  /**
   * Dispatch backup to incident
   */
  dispatchBackupToIncident(incidentId) {
    const inc = CRIME_INCIDENTS.find(i => i.id === incidentId);
    if (!inc) return;

    inc.status = "Cleared";
    inc.officerResponding += " + Backup Assigned";

    window.patrolSimulator.playAlertSound();
    this.showToast(`Backup units routed to ${inc.code} at ${inc.location}. Perimeter support active.`, 'success');

    this.refreshDataViews();
  }

  scheduleTrafficPatrol(accId) {
    const acc = ACCIDENT_HOTSPOTS.find(a => a.id === accId);
    if (!acc) return;

    window.patrolSimulator.playTone(700, 'sine', 0.15);
    this.showToast(`Traffic calming radar scheduled for ${acc.intersection} during peak hours ${acc.peakHours}.`, 'success');
  }

  /**
   * Modal: Incident Details
   */
  viewIncidentModal(incidentId) {
    const inc = CRIME_INCIDENTS.find(i => i.id === incidentId);
    if (!inc) return;

    const modal = document.getElementById('tacticalModal');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="modal-tactical-body">
        <div class="modal-header">
          <div>
            <span class="code-pill">${inc.code}</span>
            <span class="badge badge-${inc.severity.toLowerCase()}">${inc.severity}</span>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <h2 class="modal-title">${inc.title}</h2>
        <div class="modal-sub">
          <span><i class="icon-map-pin"></i> ${inc.location} (${inc.sectorName})</span>
          <span><i class="icon-clock"></i> ${inc.timestamp}</span>
        </div>
        <p class="modal-narrative">${inc.details}</p>
        <div class="modal-grid">
          <div><span class="dim">Category:</span> <strong>${inc.category}</strong></div>
          <div><span class="dim">Status:</span> <strong class="text-amber">${inc.status}</strong></div>
          <div><span class="dim">Responding Unit:</span> <strong>${inc.officerResponding}</strong></div>
          <div><span class="dim">Incident ID:</span> <strong>${inc.id}</strong></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" onclick="window.app.dispatchBackupToIncident('${inc.id}'); window.app.closeModal();">
            <i class="icon-radio"></i> Dispatch Additional Backup
          </button>
          <button class="btn btn-outline" onclick="window.tacticalMap.focusCoordinates(${inc.lat}, ${inc.lng}, 16); window.app.closeModal(); window.app.switchView('map');">
            <i class="icon-map"></i> View On Map
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  /**
   * Modal: Reassign Unit
   */
  reassignUnitModal(unitId) {
    const unit = PATROL_UNITS.find(u => u.id === unitId);
    if (!unit) return;

    const modal = document.getElementById('tacticalModal');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="modal-tactical-body">
        <div class="modal-header">
          <span class="code-pill">${unit.id} • ${unit.callsign}</span>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <h2 class="modal-title">Reassign Patrol Unit</h2>
        <p class="modal-narrative">Reassign <strong>${unit.callsign}</strong> (${unit.officers}) to a new sector or change operational status.</p>
        
        <div class="form-group mb-3">
          <label class="form-label dim">Target Operational Sector:</label>
          <select id="modalAssignSector" class="form-select">
            ${SECTORS_DATA.map(s => `<option value="${s.id}" ${s.id === unit.assignedSector ? 'selected' : ''}>${s.name} (${s.code}) - Risk ${s.baseRisk}</option>`).join('')}
          </select>
        </div>

        <div class="form-group mb-4">
          <label class="form-label dim">Unit Operational Status:</label>
          <select id="modalAssignStatus" class="form-select">
            <option value="ON PATROL" ${unit.status === 'ON PATROL' ? 'selected' : ''}>ON PATROL</option>
            <option value="AVAILABLE" ${unit.status === 'AVAILABLE' ? 'selected' : ''}>AVAILABLE / STANDBY</option>
            <option value="DISPATCHED" ${unit.status === 'DISPATCHED' ? 'selected' : ''}>DISPATCHED / EN ROUTE</option>
          </select>
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary" onclick="window.app.saveUnitReassignment('${unit.id}')">
            Confirm Reassignment Order
          </button>
          <button class="btn btn-outline" onclick="window.app.closeModal()">
            Cancel
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  saveUnitReassignment(unitId) {
    const unit = PATROL_UNITS.find(u => u.id === unitId);
    const secSelect = document.getElementById('modalAssignSector');
    const statusSelect = document.getElementById('modalAssignStatus');

    if (unit && secSelect && statusSelect) {
      unit.assignedSector = secSelect.value;
      unit.status = statusSelect.value;
      this.closeModal();
      this.showToast(`Order dispatched: ${unit.callsign} reassigned to ${unit.assignedSector} (${unit.status}).`, 'success');
      this.refreshDataViews();
      this.renderFleetRoster();
    }
  }

  /**
   * Modal: Generate Shift Briefing Report (Printable)
   */
  exportBriefingModal() {
    const kpi = window.analyticsEngine.getKPISummary();
    const evaluated = window.analyticsEngine.getEvaluatedSectors();
    const recs = window.patrolPlanner.generatePatrolRecommendations();

    const modal = document.getElementById('tacticalModal');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="modal-tactical-body briefing-modal">
        <div class="modal-header">
          <div>
            <span class="code-pill">METRO POLICE DEPT</span>
            <span class="badge badge-primary">COMMAND BRIEFING REPORT</span>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <h2 class="modal-title">Dynamic Patrol Deployment Briefing</h2>
        <div class="briefing-timestamp">
          Generated: ${new Date().toLocaleString()} | Shift: Night Alpha (18:00 - 06:00) | Threat Index: ${kpi.cityRiskScore}/100 (${kpi.cityRiskStatus})
        </div>

        <div class="briefing-section">
          <h3>1. Executive Risk Summary</h3>
          <p>Citywide composite risk index is evaluated at <strong>${kpi.cityRiskScore}/100</strong>. Active monitored crime incidents: <strong>${kpi.activeIncidents}</strong> (with ${kpi.criticalIncidents} critical priority calls). Total active units deployed: <strong>${kpi.deployedUnits}</strong>. There are currently <strong>${kpi.blindSpotsCount}</strong> detected coverage blind spots requiring immediate dynamic intercept.</p>
        </div>

        <div class="briefing-section">
          <h3>2. Sector Threat Ranking & Recommended Allocation</h3>
          <table class="briefing-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Sector Name</th>
                <th>Risk Score</th>
                <th>Current Units</th>
                <th>Recommended Units</th>
                <th>Primary Threats</th>
              </tr>
            </thead>
            <tbody>
              ${evaluated.map((s, i) => `
                <tr>
                  <td>#${i + 1}</td>
                  <td><strong>${s.name} (${s.code})</strong></td>
                  <td class="${s.currentRisk >= 75 ? 'text-crimson' : ''}">${s.currentRisk}/100</td>
                  <td>${s.activeUnits}</td>
                  <td><strong>${s.recommendedUnits}</strong></td>
                  <td>${s.primaryCrimes.slice(0, 2).join(', ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="briefing-section">
          <h3>3. Key Tactical Directives</h3>
          <ul class="briefing-list">
            ${recs.map(r => `
              <li>
                <strong>${r.title}</strong> (${r.priority} Priority):
                <span>${r.strategy} Projected outcome: ${r.projectedRiskReduction}. Target unit: ${r.suggestedUnit}.</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary" onclick="window.print()">
            <i class="icon-printer"></i> Print / Save PDF Briefing
          </button>
          <button class="btn btn-outline" onclick="window.app.closeModal()">
            Close
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  /**
   * Export Incidents as CSV file
   */
  exportIncidentsCSV() {
    const incidents = window.analyticsEngine.getFilteredIncidents();
    let csv = "ID,Code,Title,Category,Severity,Sector,Location,Timestamp,Status,OfficerResponding\n";

    incidents.forEach(inc => {
      csv += `"${inc.id}","${inc.code}","${inc.title}","${inc.category}","${inc.severity}","${inc.sectorName}","${inc.location}","${inc.timestamp}","${inc.status}","${inc.officerResponding}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `patrol_incidents_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast("Export successful: patrol_incidents.csv downloaded.", "success");
  }

  closeModal() {
    const modal = document.getElementById('tacticalModal');
    if (modal) modal.classList.remove('active');
  }

  /**
   * HUD Notification Toast
   */
  showToast(message, type = "info") {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `tactical-toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-body">
        <span class="toast-text">${message}</span>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  updateSimControls() {
    const playBtn = document.getElementById('btnSimPlay');
    if (playBtn) {
      if (window.patrolSimulator.isPlaying) {
        playBtn.innerHTML = `<i class="icon-pause"></i> PAUSE SIM`;
        playBtn.classList.add('btn-crimson');
      } else {
        playBtn.innerHTML = `<i class="icon-play"></i> PLAY SHIFT`;
        playBtn.classList.remove('btn-crimson');
      }
    }
  }

  triggerSimEmergency() {
    window.patrolSimulator.triggerDynamicEvent();
  }
}

// Global Application Instance
window.app = new DynamicPatrolApp();

// Boot application upon DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
