/**
 * API Communication Layer
 */

const API = {
  BASE_URL: '',

  /**
   * Get authentication token
   */
  getToken() {
    return localStorage.getItem('dashboard_token');
  },

  /**
   * Make authenticated fetch request
   */
  async fetch(url, options = {}) {
    const token = this.getToken();

    if (!options.headers) {
      options.headers = {};
    }
    options.headers['x-dashboard-token'] = token;
    options.headers['Content-Type'] = 'application/json';

    try {
      const response = await fetch(url, options);

      if (response.status === 401) {
        Auth.logout('Sessão expirada. Faça login novamente.');
        return null;
      }

      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      return null;
    }
  },

  /**
   * Get system statistics
   */
  async getStats() {
    const res = await this.fetch('/stats');
    if (!res) return null;
    return res.json();
  },

  /**
   * Get bot configuration
   */
  async getBotConfig() {
    const res = await this.fetch('/api/config');
    if (!res) return null;
    return res.json();
  },

  /**
   * Get WhatsApp bot status
   */
  async getBotStatus() {
    const res = await this.fetch('/api/bot/status');
    if (!res) return null;
    return res.json();
  },

  /**
   * Get Telegram bot status
   */
  async getTelegramBotStatus() {
    const res = await this.fetch('/api/bot/telegram/status');
    if (!res) return null;
    return res.json();
  },

  /**
   * Get Docker containers
   */
  async getContainers() {
    const res = await this.fetch('/api/containers');
    if (!res) return null;
    return res.json();
  },

  /**
   * Start container
   */
  async startContainer(id) {
    const res = await this.fetch(`/api/container/${id}/start`, { method: 'POST' });
    return res?.ok;
  },

  /**
   * Stop container
   */
  async stopContainer(id) {
    const res = await this.fetch(`/api/container/${id}/stop`, { method: 'POST' });
    return res?.ok;
  },

  /**
   * Restart container
   */
  async restartContainer(id) {
    const res = await this.fetch(`/api/container/${id}/restart`, { method: 'POST' });
    return res?.ok;
  },

  /**
   * Get services list
   */
  async getServices() {
    const res = await this.fetch('/api/services');
    if (!res) return null;
    return res.json();
  },

  /**
   * Control service
   */
  async controlService(name, action) {
    const res = await this.fetch(`/api/service/${name}/${action}`, { method: 'POST' });
    return res?.ok;
  },

  /**
   * Get service logs
   */
  async getServiceLogs(name, lines = 100, since = null) {
    let url = `/api/service/${name}/logs?lines=${lines}`;
    if (since) {
      url += `&since=${since}`;
    }
    const res = await this.fetch(url);
    if (!res) return null;
    return res.text();
  },

  /**
   * Execute terminal command
   */
  async executeCommand(command) {
    const res = await this.fetch('/api/terminal/exec', {
      method: 'POST',
      body: JSON.stringify({ command })
    });
    if (!res) return null;
    return res.json();
  },

  /**
   * Get alert configuration
   */
  async getAlertConfig() {
    const res = await this.fetch('/api/alerts/config');
    if (!res) return null;
    return res.json();
  },

  /**
   * Update alert configuration
   */
  async updateAlertConfig(config) {
    const res = await this.fetch('/api/alerts/config', {
      method: 'POST',
      body: JSON.stringify(config)
    });
    if (!res) return null;
    return res.json();
  },

  /**
   * Get current alert status
   */
  async getAlertStatus() {
    const res = await this.fetch('/api/alerts/status');
    if (!res) return null;
    return res.json();
  },

  /**
   * Create backup
   */
  async createBackup() {
    const res = await this.fetch('/api/config/backup');
    if (!res) return null;
    return res.json();
  },

  /**
   * List backups
   */
  async listBackups() {
    const res = await this.fetch('/api/config/backups');
    if (!res) return null;
    return res.json();
  },

  /**
   * Login user
   */
  async login(token) {
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (res.ok) {
        localStorage.setItem('dashboard_token', token);
        localStorage.setItem('login_time', Date.now());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }
};

// Make available globally
window.API = API;