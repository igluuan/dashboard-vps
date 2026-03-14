/**
 * Authentication Management
 */

const Auth = {
  SESSION_TIMEOUT_MS: 8 * 60 * 60 * 1000, // 8 hours

  /**
   * Check authentication status
   */
  check() {
    const token = localStorage.getItem('dashboard_token');
    if (token) {
      this.showDashboard();
    } else {
      this.showLogin();
    }
  },

  /**
   * Show login screen
   */
  showLogin(message = null) {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('dashboard-content').classList.add('hidden');

    // Clear previous messages
    const errorEl = document.getElementById('login-error');
    errorEl.style.display = 'none';
    errorEl.classList.remove('show');

    if (message) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      errorEl.classList.add('show');
    }

    // Clear token input
    const input = document.getElementById('token-input');
    if (input) input.value = '';

    // Disconnect socket
    if (window.socket) {
      window.socket.disconnect();
      window.socket = null;
    }

    // Clear intervals
    clearInterval(window.statsInterval);
    clearInterval(window.containersInterval);
    clearInterval(window.servicesInterval);

    // Reset metrics history
    Charts.reset();
  },

  /**
   * Show dashboard
   */
  showDashboard() {
    // Check session timeout
    if (this.SESSION_TIMEOUT_MS > 0) {
      const loginTime = localStorage.getItem('login_time');
      if (loginTime && (Date.now() - parseInt(loginTime) > this.SESSION_TIMEOUT_MS)) {
        this.logout('Sessão expirada. Faça login novamente.');
        return;
      }
    }

    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('dashboard-content').classList.remove('hidden');

    // Request notification permission
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    // Initialize components
    this.initComponents();
  },

  /**
   * Initialize all dashboard components
   */
  initComponents() {
    // Initialize theme
    Theme.init();

    // Initialize charts
    Charts.init();

    // Initialize terminal
    Terminal.init();

    // Initialize logs
    Logs.init();

    // Initialize navigation
    Navigation.init();

    // Initialize socket
    Socket.init();

    // Load initial data
    Bots.loadConfig();
    loadStats();
    Containers.load();
    Services.load();

    // Start polling intervals
    window.statsInterval = setInterval(loadStats, 2000);
    window.containersInterval = setInterval(Containers.load, 5000);
    window.servicesInterval = setInterval(Services.load, 10000);

    // Set greeting
    const greeting = document.getElementById('greeting-text');
    if (greeting) {
      greeting.textContent = Utils.getGreeting();
    }
  },

  /**
   * Perform login
   */
  async login() {
    const errorEl = document.getElementById('login-error');
    errorEl.style.display = 'none';

    const token = document.getElementById('token-input').value;
    if (!token) {
      errorEl.textContent = 'Por favor, insira o token';
      errorEl.style.display = 'block';
      errorEl.classList.add('show');
      return;
    }

    const success = await API.login(token);

    if (success) {
      this.showDashboard();
    } else {
      errorEl.textContent = 'Token inválido';
      errorEl.style.display = 'block';
      errorEl.classList.add('show');
    }
  },

  /**
   * Logout
   */
  logout(message = null) {
    localStorage.removeItem('dashboard_token');
    localStorage.removeItem('login_time');
    this.showLogin(message);
  }
};

// Make available globally
window.Auth = Auth;