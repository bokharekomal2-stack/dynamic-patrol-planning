/**
 * DYNAMIC PATROL PLANNING - Live Patrol Simulation Engine
 * Interpolates patrol units along waypoints in real-time, generates simulated
 * dispatch alerts, advances shift time, and provides Web Audio tactical sounds.
 */

class PatrolSimulator {
  constructor() {
    this.isPlaying = false;
    this.timerId = null;
    this.speedMultiplier = 1; // 1x, 2x, 5x, 10x
    this.simulatedTime = new Date(2026, 8, 24, 22, 0, 0); // 22:00 Start
    this.soundMuted = false;
    this.audioCtx = null;
    this.simStep = 0;
  }

  init() {
    this.updateClockDisplay();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Initialize AudioContext on user interaction
    if (!this.audioCtx && typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }

    const interval = Math.max(100, Math.floor(1000 / this.speedMultiplier));
    this.timerId = setInterval(() => this.tick(), interval);
    this.playTone(880, 'sine', 0.08); // high alert chirp
    window.app.updateSimControls();
  }

  pause() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    window.app.updateSimControls();
  }

  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }

  toggleSound() {
    this.soundMuted = !this.soundMuted;
    return this.soundMuted;
  }

  /**
   * Sound synthesizer using Web Audio API (tactical click/chirp/sonar)
   */
  playTone(freq = 600, type = 'sine', duration = 0.1) {
    if (this.soundMuted || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio not permitted or failed
    }
  }

  playAlertSound() {
    if (this.soundMuted || !this.audioCtx) return;
    try {
      this.playTone(950, 'triangle', 0.15);
      setTimeout(() => this.playTone(1200, 'sine', 0.25), 160);
    } catch (e) {}
  }

  /**
   * Main simulation tick
   */
  tick() {
    this.simStep++;
    // Advance simulated clock by 2 minutes per tick (scaled by speed)
    this.simulatedTime = new Date(this.simulatedTime.getTime() + 120000);
    this.updateClockDisplay();

    // Sync hour with analytics engine if hour changed
    const currentHour = this.simulatedTime.getHours();
    if (currentHour !== window.analyticsEngine.simulatedHour) {
      window.analyticsEngine.setSimulatedTime(window.analyticsEngine.simulatedDayIndex, currentHour);
      window.tacticalCharts.updateCharts();
      window.app.renderKPIs();
      window.app.renderAreaRankings();
    }

    // Move patrol units along their waypoints
    this.movePatrolUnits();

    // Periodically (every 18 steps ~ 36 simulated mins) trigger a simulated field event
    if (this.simStep % 18 === 0) {
      this.triggerDynamicEvent();
    }
  }

  /**
   * Smoothly interpolate patrol units towards next waypoint
   */
  movePatrolUnits() {
    PATROL_UNITS.forEach(unit => {
      if (unit.status !== "ON PATROL" && unit.status !== "DISPATCHED" && unit.status !== "EN ROUTE") return;
      if (!unit.waypoints || unit.waypoints.length === 0) return;

      const targetWaypoint = unit.waypoints[unit.currentWaypointIndex];
      const currentLat = unit.lat;
      const currentLng = unit.lng;

      const targetLat = targetWaypoint[0];
      const targetLng = targetWaypoint[1];

      // Calculate vector towards waypoint
      const dLat = targetLat - currentLat;
      const dLng = targetLng - currentLng;
      const dist = Math.hypot(dLat, dLng);

      const step = 0.0006; // Approx vehicle step per tick

      if (dist < step * 1.5) {
        // Arrived at waypoint, cycle to next
        unit.lat = targetLat;
        unit.lng = targetLng;
        unit.currentWaypointIndex = (unit.currentWaypointIndex + 1) % unit.waypoints.length;
      } else {
        // Step towards waypoint
        unit.lat += (dLat / dist) * step;
        unit.lng += (dLng / dist) * step;
      }

      // Slightly drain fuel (demo fidelity)
      if (this.simStep % 30 === 0 && unit.fuel > 15) {
        unit.fuel--;
      }

      // Update Leaflet marker position
      if (window.tacticalMap && window.tacticalMap.unitMarkers[unit.id]) {
        window.tacticalMap.unitMarkers[unit.id].setLatLng([unit.lat, unit.lng]);
      }
    });
  }

  /**
   * Generates a realistic dynamic field alert during live simulation
   */
  triggerDynamicEvent() {
    const randomTypes = [
      { code: "10-31", title: "Burglary Alarm Triggered", cat: "Property Crime", sev: "HIGH", sec: "SEC-01", secName: "Downtown Financial", loc: "220 S State St" },
      { code: "10-50", title: "Intersection T-Bone Collision", cat: "Traffic / Accident", sev: "CRITICAL", sec: "SEC-02", secName: "River North", loc: "Ontario & LaSalle" },
      { code: "10-44", title: "Retail Shoplifting Group", cat: "Property Crime", sev: "MEDIUM", sec: "SEC-05", secName: "Magnificent Mile", loc: "Michigan & Ohio" },
      { code: "10-23", title: "Bar Disturbance Call", cat: "Violent Crime", sev: "HIGH", sec: "SEC-02", secName: "River North", loc: "300 W Ontario St" }
    ];

    const evt = randomTypes[Math.floor(Math.random() * randomTypes.length)];
    const newId = `CR-2026-${Math.floor(8930 + Math.random() * 500)}`;

    const newIncident = {
      id: newId,
      code: evt.code,
      title: evt.title,
      category: evt.cat,
      type: evt.title,
      severity: evt.sev,
      sectorId: evt.sec,
      sectorName: evt.secName,
      location: evt.loc,
      lat: 41.8840 + (Math.random() - 0.5) * 0.02,
      lng: -87.6320 + (Math.random() - 0.5) * 0.02,
      timestamp: "Just Now (LIVE)",
      timeHoursAgo: 0.01,
      shift: "Night",
      status: "Active",
      officerResponding: "Dispatching...",
      details: `Live 911 dispatch generated automatically during simulated shift monitoring.`
    };

    // Prepend to incidents list
    CRIME_INCIDENTS.unshift(newIncident);

    // Audio chirp
    this.playAlertSound();

    // Show tactical toast
    window.app.showToast(`🚨 DISPATCH ALERT: ${newIncident.code} ${newIncident.title} at ${newIncident.location} (${newIncident.sectorName})`, 'critical');

    // Re-render map and logs
    window.tacticalMap.renderIncidents();
    window.tacticalMap.renderHeatmap();
    window.app.renderIncidentTable();
    window.app.renderKPIs();
    window.app.renderAreaRankings();
  }

  updateClockDisplay() {
    const el = document.getElementById('simClockDisplay');
    if (el) {
      const timeStr = this.simulatedTime.toTimeString().split(' ')[0];
      const dateStr = this.simulatedTime.toDateString();
      el.innerHTML = `<strong>${timeStr}</strong> <span class="dim">| ${dateStr}</span>`;
    }
  }

  resetClock() {
    this.simulatedTime = new Date(2026, 8, 24, 22, 0, 0);
    this.simStep = 0;
    this.updateClockDisplay();
  }
}

// Global instance
window.patrolSimulator = new PatrolSimulator();
