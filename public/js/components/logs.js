/**
 * Logs Viewer
 */

const Logs = {
  allLines: [],
  filteredLines: [],
  currentFilter: '',
  currentTarget: null,
  socket: null,

  /**
   * Initialize
   */
  init() {
    this.container = document.getElementById('logs-container');
  },

  /**
   * Open logs for a container
   */
  async openForContainer(containerId, name) {
    this.currentTarget = { type: 'container', id: containerId, name };

    Navigation.switchView('logs');
    document.getElementById('logs-title').textContent = name;

    this.allLines = [];
    this.currentFilter = '';
    this.render();

    // Connect to socket for live logs
    this.connectSocket(containerId);
  },

  /**
   * Open logs for a service
   */
  async openForService(name) {
    const since = document.getElementById('log-time-filter')?.value;
    this.currentTarget = { type: 'service', name, since };

    Navigation.switchView('logs');
    document.getElementById('logs-title').textContent = name;

    const logs = await API.getServiceLogs(name, 200, since || null);
    if (logs) {
      this.allLines = logs.split('\n').filter(line => line.trim());
    } else {
      this.allLines = ['Erro ao carregar logs'];
    }

    this.currentFilter = '';
    this.render();
  },

  /**
   * Open logs for bot
   */
  openForBot(botType) {
    const name = botType === 'telegram'
      ? window.telegramBotContainerName
      : window.botContainerName;

    if (name) {
      this.openForService(name);
    }
  },

  /**
   * Connect to socket for live container logs
   */
  connectSocket(containerId) {
    // Disconnect existing socket
    if (this.socket) {
      this.socket.disconnect();
    }

    const token = localStorage.getItem('dashboard_token');
    this.socket = io({
      auth: { token },
      reconnection: true
    });

    this.socket.on('connect', () => {
      this.socket.emit('logs', { id: containerId, since: 60 });
    });

    this.socket.on('log', (data) => {
      const lines = data.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          this.allLines.push(line);
          if (this.allLines.length > 500) {
            this.allLines.shift();
          }
        }
      });
      this.render();
    });

    this.socket.on('disconnect', () => {
      this.allLines.push('[Desconectado]');
      this.render();
    });
  },

  /**
   * Stop streaming logs
   */
  stopStreaming() {
    if (this.socket) {
      this.socket.emit('stop_logs');
      this.socket.disconnect();
      this.socket = null;
    }
  },

  /**
   * Reload logs with time filter
   */
  async reloadWithFilter() {
    if (this.currentTarget?.type === 'service') {
      const { name } = this.currentTarget;
      const since = document.getElementById('log-time-filter')?.value;

      const logs = await API.getServiceLogs(name, 200, since || null);
      if (logs) {
        this.allLines = logs.split('\n').filter(line => line.trim());
        this.render();
      }
    }
  },

  /**
   * Filter logs
   */
  filter() {
    const query = document.getElementById('log-filter')?.value.toLowerCase() || '';
    this.currentFilter = query;
    this.render();
  },

  /**
   * Render logs
   */
  render() {
    if (!this.container) return;

    const filter = this.currentFilter.toLowerCase();

    this.filteredLines = filter
      ? this.allLines.filter(line => line.toLowerCase().includes(filter))
      : this.allLines;

    const html = this.filteredLines.map(line => {
      let className = 'logs-line';

      if (line.toLowerCase().includes('error') || line.toLowerCase().includes('fail')) {
        className += ' error';
      } else if (line.toLowerCase().includes('warn')) {
        className += ' warning';
      }

      return `<div class="${className}">${Utils.escapeHtml(line)}</div>`;
    }).join('');

    this.container.innerHTML = html || '<div class="text-muted">Aguardando logs...</div>';

    // Scroll to bottom
    this.container.scrollTop = this.container.scrollHeight;
  },

  /**
   * Copy logs to clipboard
   */
  copy() {
    const text = this.filteredLines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      Events.push('success', 'Logs copiados para a área de transferência');
    }).catch(() => {
      Events.push('danger', 'Erro ao copiar logs');
    });
  },

  /**
   * Close logs view
   */
  close() {
    this.stopStreaming();
    Navigation.switchView('overview');
  }
};

// Make available globally
window.Logs = Logs;