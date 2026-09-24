/**
 * DYNAMIC PATROL PLANNING - Analytics & Dynamic Risk Engine
 * Computes spatial-temporal risk scores (0-100), detects patrol blind spots,
 * and handles multi-factor law enforcement prioritization.
 */

class AnalyticsEngine {
  constructor() {
    // Default weights for risk calculation (configurable via UI)
    this.weights = {
      crimeSeverity: 0.45,
      accidentHotspot: 0.25,
      temporalFactor: 0.15,
      patrolDeficit: 0.15
    };

    // Current active filters
    this.filters = {
      category: "ALL",
      severity: "ALL",
      timeShift: "ALL",
      sectorId: "ALL",
      searchQuery: ""
    };

    // Dynamic state
    this.simulatedHour = 22; // Default 22:00 (Night shift)
    this.simulatedDayIndex = 5; // Saturday (Nightlife peak)
  }

  setWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
  }

  setFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
  }

  setSimulatedTime(dayIndex, hour) {
    this.simulatedDayIndex = dayIndex;
    this.simulatedHour = hour;
  }

  /**
   * Filter crime incidents based on active criteria
   */
  getFilteredIncidents() {
    return CRIME_INCIDENTS.filter(item => {
      // Category filter
      if (this.filters.category !== "ALL") {
        if (this.filters.category === "Violent" && item.category !== "Violent Crime") return false;
        if (this.filters.category === "Property" && item.category !== "Property Crime") return false;
        if (this.filters.category === "Traffic" && item.category !== "Traffic / Accident") return false;
        if (this.filters.category === "Narcotics" && item.category !== "Narcotics") return false;
        if (this.filters.category === "PublicOrder" && item.category !== "Public Order") return false;
      }

      // Severity filter
      if (this.filters.severity !== "ALL" && item.severity !== this.filters.severity) {
        return false;
      }

      // Time shift filter
      if (this.filters.timeShift !== "ALL") {
        if (this.filters.timeShift === "24H" && item.timeHoursAgo > 24) return false;
        if (this.filters.timeShift === "Night" && item.shift !== "Night") return false;
        if (this.filters.timeShift === "Day" && (item.shift !== "Morning" && item.shift !== "Afternoon")) return false;
      }

      // Sector filter
      if (this.filters.sectorId !== "ALL" && item.sectorId !== this.filters.sectorId) {
        return false;
      }

      // Search query
      if (this.filters.searchQuery && this.filters.searchQuery.trim() !== "") {
        const q = this.filters.searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesLocation = item.location.toLowerCase().includes(q);
        const matchesType = item.type.toLowerCase().includes(q);
        const matchesCode = item.code.toLowerCase().includes(q);
        if (!matchesTitle && !matchesLocation && !matchesType && !matchesCode) return false;
      }

      return true;
    });
  }

  /**
   * Filter accident hotspots
   */
  getFilteredAccidents() {
    return ACCIDENT_HOTSPOTS.filter(item => {
      if (this.filters.sectorId !== "ALL" && item.sectorId !== this.filters.sectorId) {
        return false;
      }
      if (this.filters.searchQuery && this.filters.searchQuery.trim() !== "") {
        const q = this.filters.searchQuery.toLowerCase();
        return item.intersection.toLowerCase().includes(q) || item.primaryCause.toLowerCase().includes(q);
      }
      return true;
    });
  }

  /**
   * Dynamic 0-100 Risk Score algorithm for a single sector
   */
  calculateSectorRisk(sector) {
    const incidents = CRIME_INCIDENTS.filter(i => i.sectorId === sector.id);
    const accidents = ACCIDENT_HOTSPOTS.filter(a => a.sectorId === sector.id);

    // 1. Incident Severity Weight (Sum of severity scores)
    let crimeScoreRaw = 0;
    incidents.forEach(inc => {
      const mult = inc.timeHoursAgo <= 4 ? 1.5 : (inc.timeHoursAgo <= 12 ? 1.1 : 0.8);
      let baseSeverityVal = 3;
      if (inc.severity === "CRITICAL") baseSeverityVal = 10;
      else if (inc.severity === "HIGH") baseSeverityVal = 7;
      else if (inc.severity === "MEDIUM") baseSeverityVal = 4;
      else if (inc.severity === "LOW") baseSeverityVal = 2;

      crimeScoreRaw += baseSeverityVal * mult;
    });
    // Normalize crime score to 0-100 scale (typically capped at 50 raw points)
    const crimeScore = Math.min(100, (crimeScoreRaw / 40) * 100);

    // 2. Accident Hotspot Component
    let accidentScoreRaw = 0;
    accidents.forEach(acc => {
      accidentScoreRaw += (acc.severityIndex * 0.6) + (acc.collisionCount30d * 1.5);
    });
    const accidentScore = accidents.length > 0 
      ? Math.min(100, accidentScoreRaw / accidents.length) 
      : 30;

    // 3. Temporal Multiplier from Time/Day matrix
    const temporalRisk = TIME_DAY_HEATMAP_MATRIX.matrix[this.simulatedDayIndex][this.simulatedHour];

    // 4. Patrol Presence Deficit Component
    // If activeUnits is 0 or lastPatrol > target, risk escalates
    let patrolDeficitScore = 30;
    if (sector.activeUnits === 0) {
      patrolDeficitScore = 95;
    } else if (sector.activeUnits === 1) {
      patrolDeficitScore = sector.lastPatrolMinsAgo > sector.targetPatrolFreqMins ? 80 : 50;
    } else if (sector.activeUnits >= 2) {
      patrolDeficitScore = sector.lastPatrolMinsAgo > sector.targetPatrolFreqMins ? 45 : 20;
    }

    // Weighted composite
    const compositeRisk = Math.round(
      (crimeScore * this.weights.crimeSeverity) +
      (accidentScore * this.weights.accidentHotspot) +
      (temporalRisk * this.weights.temporalFactor) +
      (patrolDeficitScore * this.weights.patrolDeficit)
    );

    // Clamp between 5 and 99
    return Math.max(5, Math.min(99, compositeRisk));
  }

  /**
   * Get all sectors evaluated with dynamic risk scores & priority status
   */
  getEvaluatedSectors() {
    return SECTORS_DATA.map(sector => {
      const riskScore = this.calculateSectorRisk(sector);
      let threatLevel = "LOW";
      let badgeClass = "badge-low";

      if (riskScore >= 80) {
        threatLevel = "CRITICAL";
        badgeClass = "badge-critical";
      } else if (riskScore >= 65) {
        threatLevel = "HIGH";
        badgeClass = "badge-high";
      } else if (riskScore >= 45) {
        threatLevel = "MODERATE";
        badgeClass = "badge-moderate";
      }

      // Recommend unit count
      let recommendedUnits = 1;
      if (riskScore >= 80) recommendedUnits = 3;
      else if (riskScore >= 65) recommendedUnits = 2;
      else recommendedUnits = 1;

      const unitDelta = recommendedUnits - sector.activeUnits;

      return {
        ...sector,
        currentRisk: riskScore,
        threatLevel,
        badgeClass,
        recommendedUnits,
        unitDelta, // positive means need more, negative means surplus
        isDeficit: unitDelta > 0
      };
    }).sort((a, b) => b.currentRisk - a.currentRisk);
  }

  /**
   * Citywide Composite Risk Score (0-100)
   */
  getCitywideRisk() {
    const evaluated = this.getEvaluatedSectors();
    const sum = evaluated.reduce((acc, curr) => acc + curr.currentRisk, 0);
    const avg = Math.round(sum / evaluated.length);

    let status = "NORMAL";
    let statusClass = "text-emerald";
    if (avg >= 75) {
      status = "CRITICAL ELEVATION";
      statusClass = "text-crimson";
    } else if (avg >= 60) {
      status = "ELEVATED THREAT";
      statusClass = "text-amber";
    } else if (avg >= 45) {
      status = "GUARDED";
      statusClass = "text-blue";
    }

    return {
      score: avg,
      status,
      statusClass,
      criticalSectorCount: evaluated.filter(s => s.currentRisk >= 75).length,
      uncoveredZones: evaluated.filter(s => s.unitDelta > 0).length
    };
  }

  /**
   * Get Active Blind Spots based on current risk and unit allocation
   */
  getActiveBlindSpots() {
    return BLIND_SPOTS_DATA.map(spot => {
      const sector = SECTORS_DATA.find(s => s.id === spot.sectorId);
      const dynamicRisk = sector ? this.calculateSectorRisk(sector) : spot.riskScore;

      return {
        ...spot,
        dynamicRisk: Math.max(dynamicRisk, spot.riskScore),
        urgency: spot.timeUncoveredMins > 80 ? "IMMEDIATE DISPATCH" : "SCHEDULE RE-ROUTE"
      };
    }).sort((a, b) => b.timeUncoveredMins - a.timeUncoveredMins);
  }

  /**
   * Key Performance Indicators Summary
   */
  getKPISummary() {
    const cityRisk = this.getCitywideRisk();
    const filteredIncidents = this.getFilteredIncidents();
    const activeUnitsCount = PATROL_UNITS.filter(u => u.status === "ON PATROL" || u.status === "DISPATCHED").length;
    const totalUnitsCount = PATROL_UNITS.length;
    const criticalIncidents = filteredIncidents.filter(i => i.severity === "CRITICAL").length;
    const blindSpotsCount = this.getActiveBlindSpots().length;
    const avgResponseTime = "5.8 min";

    return {
      cityRiskScore: cityRisk.score,
      cityRiskStatus: cityRisk.status,
      cityRiskClass: cityRisk.statusClass,
      activeIncidents: filteredIncidents.length,
      criticalIncidents,
      deployedUnits: `${activeUnitsCount} / ${totalUnitsCount}`,
      unitsDeploymentPct: Math.round((activeUnitsCount / totalUnitsCount) * 100),
      avgResponseTime,
      blindSpotsCount,
      accidentHotspotsCount: ACCIDENT_HOTSPOTS.length
    };
  }
}

// Global instance
window.analyticsEngine = new AnalyticsEngine();
