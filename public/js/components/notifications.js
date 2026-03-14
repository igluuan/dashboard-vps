/**
 * Notifications and Events System
 */

const Events = {
  activeEvents: new Map(),
  eventHistory: [],

  /**
   * Push a new event
   */
  push(type, message, key) {
    // Check if already active
    if (key && this.activeEvents.has(key)) {
      return;
    }

    // Add to history
    this.addHistory(type, message);

    if (key) {
      this.activeEvents.set(key, { type, message, timestamp: new Date() });
      this.updateBadge();
    }

    // Browser notification
    if (type === 'danger' || type === 'warning') {
      this.sendBrowserNotification(message);
    }
  },

  /**
   * Clear an active event
   */
  clear(key, resolutionMessage) {
    if (this.activeEvents.has(key)) {
      const event = this.activeEvents.get(key);
      this.activeEvents.delete(key);

      const msg = resolutionMessage || `${event.message} (Resolvido)`;
      this.addHistory('success', `✓ ${msg}`);
      this.updateBadge();
    }
  },

  /**
   * Add to history
   */
  addHistory(type, message) {
    this.eventHistory.unshift({
      type,
      message,
      timestamp: new Date()
    });

    if (this.eventHistory.length > 50) {
      this.eventHistory.pop();
    }

    this.render();
  },

  /**
   * Clear all history
   */
  clearHistory() {
    this.eventHistory = [];
    this.render();
  },

  /**
   * Render events to DOM
   */
  render() {
    const container = document.getElementById('events-log');
    if (!container) return;

    const html = this.eventHistory.map(e => {
      const time = e.timestamp.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      let icon = '';
      if (!e.message.startsWith('✓')) {
        if (e.type === 'danger') icon = '✕ ';
        else if (e.type === 'warning') icon = '⚠ ';
        else if (e.type === 'success') icon = '✓ ';
      }

      return `
        <div class="event-item">
            <span class="event-time">[${time}]</span>
            <span class="event-message ${e.type}">${icon}${Utils.escapeHtml(e.message)}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = html || '<div class="event-item text-muted">Nenhum evento</div>';
  },

  /**
   * Update badge count
   */
  updateBadge() {
    const badge = document.getElementById('event-badge');
    if (!badge) return;

    const count = this.activeEvents.size;
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },

  /**
   * Send browser notification
   */
  sendBrowserNotification(msg) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('VPS Dashboard', { body: msg });
    }
  },

  /**
   * Update alerts based on stats
   */
  updateAlerts(cpu, ram) {
    const warnThreshold = 70;
    const dangerThreshold = 85;

    // CPU check
    if (cpu >= dangerThreshold) {
      const msg = `CPU em ${cpu.toFixed(1)}%`;
      this.push('danger', `⚠ ${msg}`, 'cpu');
    } else if (cpu >= warnThreshold) {
      const msg = `CPU em ${cpu.toFixed(1)}%`;
      this.push('warning', `⚠ ${msg}`, 'cpu');
    } else {
      this.clear('cpu', 'CPU voltou ao normal');
    }

    // RAM check
    if (ram >= dangerThreshold) {
      const msg = `RAM em ${ram.toFixed(1)}%`;
      this.push('danger', `⚠ ${msg}`, 'ram');
    } else if (ram >= warnThreshold) {
      const msg = `RAM em ${ram.toFixed(1)}%`;
      this.push('warning', `⚠ ${msg}`, 'ram');
    } else {
      this.clear('ram', 'RAM voltou ao normal');
    }

    // Update banner
    this.updateBanner();
  },

  /**
   * Update alert banner
   */
  updateBanner() {
    const banner = document.getElementById('alert-banner');
    const alerts = [];

    this.activeEvents.forEach((event) => {
      alerts.push(event.message);
    });

    if (alerts.length > 0) {
      banner.textContent = '⚠ ' + alerts.join(' · ');
      banner.className = 'alert-banner show danger';
    } else {
      banner.className = 'alert-banner';
    }
  }
};

// Make available globally
window.Events = Events;