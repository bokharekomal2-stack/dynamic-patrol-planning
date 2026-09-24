/**
 * DYNAMIC PATROL PLANNING - Patrol Recommendation & Tactical Route Engine
 * Synthesizes crime density, accident hotspots, and blind spots to generate
 * actionable patrol schedules, waypoint routes, and tactical deployments.
 */

class PatrolPlanner {
  constructor() {
    this.activePlan = null;
    this.customWaypoints = [];
    this.generationCount = 0;
  }

  /**
   * Generates optimal patrol schedule based on current analytics
   */
  generatePatrolRecommendations() {
    this.generationCount++;
    const evaluatedSectors = window.analyticsEngine.getEvaluatedSectors();
    const blindSpots = window.analyticsEngine.getActiveBlindSpots();
    const accidents = window.analyticsEngine.getFilteredAccidents();
    const hour = window.analyticsEngine.simulatedHour;

    const recommendations = [];

    // 1. Sector 1 High Risk Recommendation
    const topSector = evaluatedSectors[0];
    if (topSector) {
      recommendations.push({
        id: `REC-${this.generationCount}-01`,
        sectorId: topSector.id,
        sectorName: topSector.name,
        code: topSector.code,
        priority: "CRITICAL",
        riskScore: topSector.currentRisk,
        targetWindow: `${hour}:00 - ${(hour + 3) % 24}:00 (High Risk Surge)`,
        suggestedUnit: this.findOptimalUnitForSector(topSector.id),
        title: `Priority Saturation: ${topSector.name}`,
        strategy: `Sector risk currently at ${topSector.currentRisk}/100. Deploy double-unit high-visibility cruise along primary arterial intersections to suppress ${topSector.primaryCrimes[0]} and ${topSector.primaryCrimes[1]}.`,
        projectedRiskReduction: `-${Math.min(36, Math.round(topSector.currentRisk * 0.38))}% Risk Index`,
        actionType: "High-Visibility Saturation",
        waypoints: [
          { name: `${topSector.name} Center Core`, lat: topSector.center[0], lng: topSector.center[1], durationMins: 25, type: "Static Cruiser Presence" },
          { name: "Secondary Corridor Transition", lat: topSector.center[0] + 0.003, lng: topSector.center[1] + 0.002, durationMins: 15, type: "Mobile Radar Sweeping" },
          { name: "Transit / Pedestrian Bottleneck", lat: topSector.center[0] - 0.002, lng: topSector.center[1] - 0.003, durationMins: 20, type: "Foot Patrol Inspection" }
        ]
      });
    }

    // 2. Critical Blind Spot Intercept Recommendation
    if (blindSpots.length > 0) {
      const topBlindSpot = blindSpots[0];
      recommendations.push({
        id: `REC-${this.generationCount}-02`,
        sectorId: topBlindSpot.sectorId,
        sectorName: topBlindSpot.sectorName,
        code: "TACTICAL",
        priority: "CRITICAL",
        riskScore: topBlindSpot.dynamicRisk,
        targetWindow: "IMMEDIATE (Coverage Deficit)",
        suggestedUnit: topBlindSpot.nearestUnitId || "UNIT-103",
        title: `Blind Spot Intercept: ${topBlindSpot.title}`,
        strategy: `${topBlindSpot.title} has zero patrol coverage for ${topBlindSpot.timeUncoveredMins} mins. Divert nearest unit ${topBlindSpot.nearestUnitId} to establish 20-minute deterrent baseline.`,
        projectedRiskReduction: "-42% Vulnerability Index",
        actionType: "Gap Closure Intercept",
        waypoints: [
          { name: topBlindSpot.title, lat: topBlindSpot.lat, lng: topBlindSpot.lng, durationMins: 20, type: "Area Presence Sweep" },
          { name: "Adjacent Lighting / Alley Search", lat: topBlindSpot.lat + 0.0015, lng: topBlindSpot.lng - 0.001, durationMins: 10, type: "Spotlight Scan" }
        ]
      });
    }

    // 3. Accident Hotspot Mitigation Recommendation
    if (accidents.length > 0) {
      const topAccident = [...accidents].sort((a, b) => b.collisionCount30d - a.collisionCount30d)[0];
      recommendations.push({
        id: `REC-${this.generationCount}-03`,
        sectorId: topAccident.sectorId,
        sectorName: "Traffic Safety Division",
        code: "TRAFFIC",
        priority: "HIGH",
        riskScore: topAccident.severityIndex,
        targetWindow: `${topAccident.peakHours} (Collision Peak)`,
        suggestedUnit: "UNIT-104 (Traffic-401)",
        title: `Traffic Enforcement: ${topAccident.intersection}`,
        strategy: `High collision frequency (${topAccident.collisionCount30d} crashes in 30d). Primary cause: ${topAccident.primaryCause}. Deploy speed radar and traffic calming unit during peak congestion.`,
        projectedRiskReduction: "-30% Intersection Accidents",
        actionType: "Traffic Calming & Radar",
        waypoints: [
          { name: topAccident.intersection, lat: topAccident.lat, lng: topAccident.lng, durationMins: 30, type: "Speed Radar Enforcement" },
          { name: "Approach Feeder Avenue", lat: topAccident.lat - 0.002, lng: topAccident.lng + 0.001, durationMins: 15, type: "Lane Merge Monitoring" }
        ]
      });
    }

    // 4. Secondary Commercial/Residential Patrol Loop
    const secondSector = evaluatedSectors[1] || evaluatedSectors[0];
    if (secondSector) {
      recommendations.push({
        id: `REC-${this.generationCount}-04`,
        sectorId: secondSector.id,
        sectorName: secondSector.name,
        code: secondSector.code,
        priority: "HIGH",
        riskScore: secondSector.currentRisk,
        targetWindow: "Scheduled Shift Loop",
        suggestedUnit: this.findOptimalUnitForSector(secondSector.id),
        title: `Commercial Deterrence Sweep: ${secondSector.name}`,
        strategy: `Routine high-cadence patrol covering commercial parking lots and retail storefronts to prevent organized retail theft and vehicle break-ins.`,
        projectedRiskReduction: "-20% Property Theft",
        actionType: "Perimeter Foot & Vehicle Loop",
        waypoints: [
          { name: `${secondSector.name} Perimeter Loop`, lat: secondSector.center[0] + 0.002, lng: secondSector.center[1] - 0.002, durationMins: 20, type: "Perimeter Check" },
          { name: "Rear Delivery Dock Access", lat: secondSector.center[0] - 0.002, lng: secondSector.center[1] + 0.002, durationMins: 15, type: "Lighting & Lock Security" }
        ]
      });
    }

    return recommendations;
  }

  /**
   * Find nearest or most suitable available unit for a sector
   */
  findOptimalUnitForSector(sectorId) {
    // 1. Look for available unit already in sector
    const localAvailable = PATROL_UNITS.find(u => u.assignedSector === sectorId && u.status === "AVAILABLE");
    if (localAvailable) return `${localAvailable.id} (${localAvailable.callsign})`;

    // 2. Look for any unit on patrol in that sector
    const localPatrol = PATROL_UNITS.find(u => u.assignedSector === sectorId);
    if (localPatrol) return `${localPatrol.id} (${localPatrol.callsign})`;

    // 3. Fallback to any available unit
    const anyAvailable = PATROL_UNITS.find(u => u.status === "AVAILABLE");
    if (anyAvailable) return `${anyAvailable.id} (${anyAvailable.callsign})`;

    // Default
    return "UNIT-101 (Alpha-101)";
  }

  /**
   * Generate an optimized tactical route between selected waypoints
   */
  generateRouteForRecommendation(rec) {
    const coords = rec.waypoints.map(w => [w.lat, w.lng]);
    const totalDwellMinutes = rec.waypoints.reduce((acc, curr) => acc + curr.durationMins, 0);
    const estDistanceKm = (rec.waypoints.length * 1.8).toFixed(1);
    const estTransitMinutes = Math.round(rec.waypoints.length * 4.5);

    return {
      recommendationId: rec.id,
      title: rec.title,
      unit: rec.suggestedUnit,
      coords,
      estDistanceKm,
      estTransitMinutes,
      totalDwellMinutes,
      totalShiftTime: `${estTransitMinutes + totalDwellMinutes} mins`,
      waypoints: rec.waypoints
    };
  }

  /**
   * Dispatch route to target unit
   */
  dispatchRoute(unitId, recTitle) {
    const unit = PATROL_UNITS.find(u => u.id === unitId || recTitle.includes(u.id) || (u.callsign && recTitle.includes(u.callsign)));
    if (unit) {
      unit.status = "DISPATCHED";
      return {
        success: true,
        message: `Order confirmed: ${unit.callsign} re-routed to '${recTitle}'. Waypoint telemetry uploaded.`
      };
    }
    return {
      success: true,
      message: `Tactical order dispatched to field units: '${recTitle}'.`
    };
  }
}

// Global instance
window.patrolPlanner = new PatrolPlanner();
