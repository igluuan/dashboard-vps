/**
 * Utility Functions
 */

const Utils = {
  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B/s';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB/s';
    return (bytes / 1048576).toFixed(2) + ' MB/s';
  },

  /**
   * Format uptime seconds to readable string
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  },

  /**
   * Get threshold class for values
   */
  getThresholdClass(value, warnThreshold = 70, dangerThreshold = 85) {
    if (value >= dangerThreshold) return 'danger';
    if (value >= warnThreshold) return 'warning';
    return '';
  },

  /**
   * Format percentage
   */
  formatPercent(value) {
    return value.toFixed(1) + '%';
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Format container ports
   */
  formatPorts(ports) {
    if (!ports || ports.length === 0) return '-';
    return ports
      .filter(p => p.PublicPort)
      .map(p => `${p.PublicPort}:${p.PrivatePort}`)
      .join(', ') || '-';
  },

  /**
   * Get current time for greeting
   */
  getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  },

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Generate element with class
   */
  createElement(tag, className, innerHTML = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
  },

  /**
   * Show element
   */
  show(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    el?.classList.remove('hidden');
  },

  /**
   * Hide element
   */
  hide(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    el?.classList.add('hidden');
  },

  /**
   * Toggle element visibility
   */
  toggle(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    el?.classList.toggle('hidden');
  }
};

// Make available globally
window.Utils = Utils;