/**
 * DYNAMIC PATROL PLANNING - Charts & Visual Analytics Engine
 * Powered by Chart.js & custom HTML5 7x24 Matrix Visualizer
 */

class TacticalCharts {
  constructor() {
    this.hourlyRiskChart = null;
    this.crimeCategoryChart = null;
    this.sectorComparisonChart = null;
  }

  init() {
    this.initHourlyRiskChart();
    this.initCrimeCategoryChart();
    this.initSectorComparisonChart();
    this.renderTimeDayHeatmapGrid();
  }

  /**
   * Chart 1: 24-Hour Temporal Curve (Predicted Risk vs Actual Incidents)
   */
  initHourlyRiskChart() {
    const ctx = document.getElementById('hourlyRiskChart');
    if (!ctx) return;

    const hours = TIME_DAY_HEATMAP_MATRIX.hours;
    const currentDayIdx = window.analyticsEngine.simulatedDayIndex;
    const riskCurve = TIME_DAY_HEATMAP_MATRIX.matrix[currentDayIdx];

    // Compute synthetic incident distribution for this day
    const incidentCounts = riskCurve.map(risk => Math.max(1, Math.round((risk / 100) * 14)));

    if (this.hourlyRiskChart) {
      this.hourlyRiskChart.destroy();
    }

    this.hourlyRiskChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Dynamic Risk Index (0-100)',
            data: riskCurve,
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#EF4444',
            pointRadius: 3,
            pointHoverRadius: 6,
            yAxisID: 'y'
          },
          {
            label: 'Reported Incidents',
            data: incidentCounts,
            borderColor: '#06B6D4',
            backgroundColor: 'rgba(6, 182, 212, 0.4)',
            borderWidth: 2,
            type: 'bar',
            barThickness: 8,
            borderRadius: 3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            labels: {
              color: '#94A3B8',
              font: { family: 'Inter', size: 11 }
            }
          },
          tooltip: {
            backgroundColor: '#0F172A',
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              afterBody: function (context) {
                const hourIdx = context[0].dataIndex;
                if (hourIdx >= 21 || hourIdx <= 3) {
                  return '⚠️ Tactical Warning: Late-night nightlife surge window.';
                } else if (hourIdx >= 7 && hourIdx <= 9) {
                  return '🚗 Rush Hour Alert: Elevated vehicle crash probability.';
                }
                return '';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748B', font: { size: 10 }, maxRotation: 45 }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            min: 0,
            max: 100,
            title: { display: true, text: 'Risk Score (0-100)', color: '#94A3B8', font: { size: 10 } },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748B', font: { size: 10 } }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            max: 20,
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Incidents/Hr', color: '#06B6D4', font: { size: 10 } },
            ticks: { color: '#06B6D4', font: { size: 10 } }
          }
        }
      }
    });
  }

  /**
   * Chart 2: Crime & Incident Category Breakdown (Doughnut)
   */
  initCrimeCategoryChart() {
    const ctx = document.getElementById('crimeCategoryChart');
    if (!ctx) return;

    const incidents = window.analyticsEngine.getFilteredIncidents();
    const categories = {
      'Violent Crime': 0,
      'Property Crime': 0,
      'Traffic / Accident': 0,
      'Narcotics': 0,
      'Public Order': 0
    };

    incidents.forEach(inc => {
      if (categories[inc.category] !== undefined) {
        categories[inc.category]++;
      } else {
        categories['Property Crime']++;
      }
    });

    if (this.crimeCategoryChart) {
      this.crimeCategoryChart.destroy();
    }

    this.crimeCategoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categories),
        datasets: [{
          data: Object.values(categories),
          backgroundColor: [
            '#EF4444', // Violent: Crimson
            '#F59E0B', // Property: Amber
            '#06B6D4', // Traffic: Cyan
            '#8B5CF6', // Narcotics: Purple
            '#10B981'  // Public Order: Emerald
          ],
          borderColor: '#0B0F19',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94A3B8',
              font: { family: 'Inter', size: 11 },
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            backgroundColor: '#0F172A',
            borderColor: '#334155',
            borderWidth: 1
          }
        },
        cutout: '68%'
      }
    });
  }

  /**
   * Chart 3: Sector Risk vs Patrol Units (Grouped Bar Chart)
   */
  initSectorComparisonChart() {
    const ctx = document.getElementById('sectorComparisonChart');
    if (!ctx) return;

    const evaluated = window.analyticsEngine.getEvaluatedSectors();
    const labels = evaluated.map(s => `Sec-${s.code}`);
    const risks = evaluated.map(s => s.currentRisk);
    const units = evaluated.map(s => s.activeUnits);
    const recommendedUnits = evaluated.map(s => s.recommendedUnits);

    if (this.sectorComparisonChart) {
      this.sectorComparisonChart.destroy();
    }

    this.sectorComparisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Risk Score (0-100)',
            data: risks,
            backgroundColor: '#EF4444',
            borderRadius: 4,
            barThickness: 14
          },
          {
            label: 'Active Patrol Units',
            data: units.map(u => u * 20), // Scale to 100 for visual comparison
            backgroundColor: '#06B6D4',
            borderRadius: 4,
            barThickness: 14
          },
          {
            label: 'Recommended Units Target',
            data: recommendedUnits.map(r => r * 20),
            backgroundColor: 'rgba(245, 158, 11, 0.4)',
            borderColor: '#F59E0B',
            borderWidth: 1.5,
            borderRadius: 4,
            barThickness: 14
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#94A3B8',
              font: { size: 11 }
            }
          },
          tooltip: {
            backgroundColor: '#0F172A',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: function (context) {
                if (context.datasetIndex === 0) {
                  return `Risk Score: ${context.parsed.y}/100`;
                } else if (context.datasetIndex === 1) {
                  return `Active Units: ${context.parsed.y / 20}`;
                } else {
                  return `Recommended Units: ${context.parsed.y / 20}`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94A3B8' }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748B' }
          }
        }
      }
    });
  }

  /**
   * Interactive 7 Days x 24 Hours Crime & Risk Heatmap Grid
   */
  renderTimeDayHeatmapGrid() {
    const container = document.getElementById('timeDayHeatmapGrid');
    if (!container) return;

    const { days, hours, matrix } = TIME_DAY_HEATMAP_MATRIX;
    const currentSimDay = window.analyticsEngine.simulatedDayIndex;
    const currentSimHour = window.analyticsEngine.simulatedHour;

    let html = `
      <div class="heatmap-matrix-wrapper">
        <div class="heatmap-matrix-table">
          <div class="heatmap-matrix-header">
            <div class="heatmap-corner-label">DAY / HOUR</div>
            ${hours.map(h => `<div class="heatmap-hour-col">${h.substring(0, 2)}</div>`).join('')}
          </div>
    `;

    days.forEach((dayName, dayIdx) => {
      const isSelectedDay = dayIdx === currentSimDay;
      html += `
        <div class="heatmap-row ${isSelectedDay ? 'row-active' : ''}">
          <div class="heatmap-day-label">${dayName.substring(0, 3)}</div>
      `;

      hours.forEach((hourStr, hourIdx) => {
        const val = matrix[dayIdx][hourIdx];
        const isCurrentCell = dayIdx === currentSimDay && hourIdx === currentSimHour;

        // Color gradient interpolation based on risk value
        let cellColor = '#10B981';
        let bgStyle = '';
        if (val >= 85) {
          bgStyle = `background: rgba(239, 68, 68, ${val / 100}); border: 1px solid rgba(239, 68, 68, 0.8);`;
        } else if (val >= 70) {
          bgStyle = `background: rgba(249, 115, 22, ${val / 100});`;
        } else if (val >= 50) {
          bgStyle = `background: rgba(234, 179, 8, ${(val / 100) * 0.8});`;
        } else if (val >= 30) {
          bgStyle = `background: rgba(59, 130, 246, ${(val / 100) * 0.7});`;
        } else {
          bgStyle = `background: rgba(16, 185, 129, ${(val / 100) * 0.5});`;
        }

        html += `
          <div class="heatmap-cell ${isCurrentCell ? 'cell-current-time' : ''}" 
               style="${bgStyle}" 
               data-day="${dayIdx}" 
               data-hour="${hourIdx}" 
               data-risk="${val}" 
               title="${dayName} ${hourStr} — Risk Score: ${val}/100"
               onclick="window.app.selectHeatmapCell(${dayIdx}, ${hourIdx})">
            <span class="cell-val">${val}</span>
          </div>
        `;
      });

      html += `</div>`;
    });

    html += `
        </div>
        <div class="heatmap-legend-bar">
          <span class="legend-text">Low Risk (0-30)</span>
          <div class="gradient-strip"></div>
          <span class="legend-text">Extreme Risk (85-100)</span>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Re-render all charts upon filter/simulation update
   */
  updateCharts() {
    this.initHourlyRiskChart();
    this.initCrimeCategoryChart();
    this.initSectorComparisonChart();
    this.renderTimeDayHeatmapGrid();
  }
}

// Global instance
window.tacticalCharts = new TacticalCharts();
