/**
 * Navigation Management
 */

const Navigation = {
  currentView: 'overview',

  /**
   * Initialize navigation
   */
  init() {
    // Set initial view
    this.switchView('overview');
  },

  /**
   * Switch between views
   */
  switchView(viewName) {
    // Update current view
    this.currentView = viewName;

    // Update tab buttons
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      const target = tab.dataset.target;
      if (target === viewName) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      }
    });

    // Hide all view sections
    const viewSections = document.querySelectorAll('.view-section');
    viewSections.forEach(section => {
      section.classList.remove('active');
    });

    // Show target view
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Focus appropriate element for accessibility
    if (viewName === 'containers') {
      const filter = document.getElementById('container-filter');
      filter?.focus();
    } else if (viewName === 'services') {
      const filter = document.getElementById('service-filter');
      filter?.focus();
    }
  },

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboard(event) {
    // Don't trigger if in input/textarea
    const tag = event.target.tagName.toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

    // R - Refresh containers
    if (event.key.toLowerCase() === 'r' && !isInput) {
      event.preventDefault();
      Containers.load();
      Events.push('info', 'Containers atualizados');
    }

    // S - Refresh stats
    if (event.key.toLowerCase() === 's' && !isInput) {
      event.preventDefault();
      loadStats();
      Events.push('info', 'Estatísticas atualizadas');
    }

    // / - Focus search
    if (event.key === '/' && !isInput) {
      event.preventDefault();
      if (this.currentView === 'containers') {
        document.getElementById('container-filter')?.focus();
      } else if (this.currentView === 'services') {
        document.getElementById('service-filter')?.focus();
      }
    }

    // L or Esc - Close logs
    if ((event.key.toLowerCase() === 'l' || event.key === 'Escape') && !isInput) {
      event.preventDefault();
      const logsSection = document.getElementById('logs-section');
      if (logsSection?.classList.contains('active')) {
        Logs.close();
      } else if (document.getElementById('shortcuts-modal')?.classList.contains('open')) {
        Modal.close('shortcuts');
      }
    }

    // B - Bot logs
    if (event.key.toLowerCase() === 'b' && !isInput) {
      event.preventDefault();
      if (window.botContainerName) {
        Logs.openForBot('whatsapp');
      } else if (window.telegramBotContainerName) {
        Logs.openForBot('telegram');
      }
    }

    // ? - Show shortcuts
    if (event.key === '?' && !isInput) {
      event.preventDefault();
      Modal.open('shortcuts');
    }
  }
};

// Make available globally
window.Navigation = Navigation;