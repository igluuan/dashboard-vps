/**
 * VPS Dashboard - Main Application
 */

// Socket connection management
const Socket = {
  socket: null,
  isConnected: false,

  /**
   * Initialize socket connection
   */
  init() {
    if (this.socket) return;

    const token = localStorage.getItem('dashboard_token');

    this.socket = io({
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      ConnectionStatus.set('connected');

      // Reload data on reconnection
      loadStats();
      Containers.load();
      Services.load();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      ConnectionStatus.set('disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
      if (err.message === 'Unauthorized') {
        this.socket.disconnect();
        Auth.logout('Sessão expirada. Faça login novamente.');
      } else {
        ConnectionStatus.set('disconnected');
      }
    });

    // Reconnection attempts
    this.socket.io.on('reconnect_attempt', () => {
      ConnectionStatus.set('reconnecting');
    });
  },

  /**
   * Get socket instance
   */
  getSocket() {
    return this.socket;
  }
};

// Make socket available globally
window.socket = null;

// Get socket from Socket module
Object.defineProperty(window, 'socket', {
  get() { return Socket.socket; },
  set(val) { Socket.socket = val; }
});

// Connection Status Management
const ConnectionStatus = {
  set(status) {
    const el = document.getElementById('connection-status');
    const text = document.getElementById('conn-text');

    if (!el) return;

    el.style.display = 'flex';
    el.className = '';

    if (status === 'connected') {
      el.classList.add('connected');
      text.textContent = 'Conectado';
    } else if (status === 'reconnecting') {
      el.classList.add('reconnecting');
      text.textContent = 'Reconectando...';
    } else {
      el.classList.add('disconnected');
      text.textContent = 'Desconectado';
    }
  }
};

// Modal Management
const Modal = {
  open(id) {
    const modal = document.getElementById(`${id}-modal`);
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  },

  close(id) {
    const modal = document.getElementById(`${id}-modal`);
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }
};

// Make Modal available globally
window.Modal = Modal;

/**
 * Load system statistics
 */
async function loadStats() {
  const stats = await API.getStats();
  if (!stats) return;

  // Update uptime
  document.getElementById('uptime').textContent = Utils.formatUptime(stats.uptime);

  // Update CPU
  const cpuEl = document.getElementById('cpu-val');
  cpuEl.textContent = Utils.formatPercent(stats.cpu);
  updateStatCard('stat-cpu', stats.cpu);

  // Update RAM
  const ramEl = document.getElementById('ram-val');
  ramEl.textContent = Utils.formatPercent(stats.ram);
  updateStatCard('stat-ram', stats.ram);

  // Update Disk
  const diskEl = document.getElementById('disk-val');
  diskEl.textContent = Utils.formatPercent(stats.disk);
  updateStatCard('stat-disk', stats.disk);

  // Update network
  document.getElementById('net-rx').textContent = Utils.formatBytes(stats.net_rx);
  document.getElementById('net-tx').textContent = Utils.formatBytes(stats.net_tx);

  // Update chart
  Charts.update(stats);

  // Update alerts
  Events.updateAlerts(stats.cpu, stats.ram);

  // Update bot status periodically
  Bots.loadBotStatus();
  Bots.loadTelegramBotStatus();
}

/**
 * Update stat card styling based on value
 */
function updateStatCard(id, value) {
  const card = document.getElementById(id);
  if (!card) return;

  // Remove existing classes
  card.classList.remove('warning', 'danger');

  if (value >= 85) {
    card.classList.add('danger');
  } else if (value >= 70) {
    card.classList.add('warning');
  }
}

// Keyboard event listener
document.addEventListener('keydown', (e) => {
  Navigation.handleKeyboard(e);
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  Auth.check();

  // Handle form submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      Auth.login();
    });
  }

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(modal => {
        modal.classList.remove('open');
      });
    }
  });
});

// Request notification permission on dashboard show
const originalShowDashboard = Auth.showDashboard;
Auth.showDashboard = function() {
  originalShowDashboard.apply(this, arguments);

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
};