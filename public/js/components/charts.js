/**
 * Charts and Metrics Visualization
 */

const Charts = {
  chart: null,
  MAX_POINTS: 30,
  history: {
    cpu: [],
    ram: [],
    rx: [],
    tx: [],
  },

  /**
   * Initialize the chart
   */
  init() {
    const ctx = document.getElementById("metricsChart");
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const colors = Theme.getColors();

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: new Array(this.MAX_POINTS).fill(""),
        datasets: [
          {
            label: "CPU",
            data: [],
            borderColor: "#ff6b6b",
            backgroundColor: "rgba(255, 107, 107, 0.08)",
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
            yAxisID: "y",
          },
          {
            label: "RAM",
            data: [],
            borderColor: colors.accent,
            backgroundColor: "rgba(0, 212, 170, 0.08)",
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
            yAxisID: "y",
          },
          {
            label: "RX",
            data: [],
            borderColor: "#4ade80",
            backgroundColor: "transparent",
            borderDash: [4, 4],
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 1.5,
            yAxisID: "y1",
          },
          {
            label: "TX",
            data: [],
            borderColor: "#60a5fa",
            backgroundColor: "transparent",
            borderDash: [4, 4],
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 1.5,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: colors.textMuted,
              font: { size: 11, family: "'IBM Plex Sans', sans-serif" },
              boxWidth: 12,
              padding: 10,
              usePointStyle: true,
            },
          },
        },
        scales: {
          x: { display: false },
          y: {
            type: "linear",
            display: true,
            position: "left",
            beginAtZero: true,
            max: 100,
            grid: { color: colors.grid },
            ticks: {
              color: colors.textMuted,
              font: { size: 10, family: "'JetBrains Mono', monospace" },
              callback: (value) => value + "%",
            },
          },
          y1: {
            type: "linear",
            display: false,
            beginAtZero: true,
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  },

  /**
   * Update chart with new data
   */
  update(stats) {
    if (!this.chart) return;

    // Update history
    this.history.cpu.push(stats.cpu);
    this.history.ram.push(stats.ram);
    this.history.rx.push(stats.net_rx);
    this.history.tx.push(stats.net_tx);

    // Trim to max points
    if (this.history.cpu.length > this.MAX_POINTS) {
      this.history.cpu.shift();
      this.history.ram.shift();
      this.history.rx.shift();
      this.history.tx.shift();
    }

    // Update chart data
    this.chart.data.datasets[0].data = this.history.cpu;
    this.chart.data.datasets[1].data = this.history.ram;
    this.chart.data.datasets[2].data = this.history.rx;
    this.chart.data.datasets[3].data = this.history.tx;

    this.chart.update("none");
  },

  /**
   * Reset chart data
   */
  reset() {
    this.history = {
      cpu: [],
      ram: [],
      rx: [],
      tx: [],
    };

    if (this.chart) {
      this.chart.data.datasets.forEach((ds) => (ds.data = []));
      this.chart.update();
    }
  },

  /**
   * Update chart colors when theme changes
   */
  updateColors() {
    if (!this.chart) return;

    const colors = Theme.getColors();

    this.chart.options.plugins.legend.labels.color = colors.textMuted;
    this.chart.options.scales.y.grid.color = colors.grid;
    this.chart.options.scales.y.ticks.color = colors.textMuted;
    this.chart.data.datasets[1].borderColor = colors.accent;
    this.chart.data.datasets[1].backgroundColor = colors.accent + "15";

    this.chart.update();
  },
};

// Make available globally
window.Charts = Charts;
