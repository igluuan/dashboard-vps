/**
 * Settings Management
 */

const Settings = {
  /**
   * Initialize settings modal
   */
  init() {
    this.loadAlertsToForm();
  },

  /**
   * Load alert config to form
   */
  async loadAlertsToForm() {
    const config = await API.getAlertConfig();
    if (!config) return;

    document.getElementById('alert-cpu-warning').value = config.cpu.warning;
    document.getElementById('alert-cpu-danger').value = config.cpu.danger;
    document.getElementById('alert-ram-warning').value = config.ram.warning;
    document.getElementById('alert-ram-danger').value = config.ram.danger;
    document.getElementById('alert-disk-warning').value = config.disk.warning;
    document.getElementById('alert-disk-danger').value = config.disk.danger;
    document.getElementById('alert-enabled').checked = config.enabled;
  },

  /**
   * Save alert configuration
   */
  async saveAlerts() {
    const config = {
      cpu: {
        warning: parseInt(document.getElementById('alert-cpu-warning').value) || 70,
        danger: parseInt(document.getElementById('alert-cpu-danger').value) || 85
      },
      ram: {
        warning: parseInt(document.getElementById('alert-ram-warning').value) || 70,
        danger: parseInt(document.getElementById('alert-ram-danger').value) || 85
      },
      disk: {
        warning: parseInt(document.getElementById('alert-disk-warning').value) || 80,
        danger: parseInt(document.getElementById('alert-disk-danger').value) || 90
      },
      enabled: document.getElementById('alert-enabled').checked
    };

    await Events.saveConfig(config);
    Modal.close('settings');
  }
};

// Make available globally
window.Settings = Settings;