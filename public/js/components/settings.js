/**
 * Settings Management
 */

const Settings = {
  /**
   * Initialize settings modal
   */
  init() {
    this.loadAlertsToForm();
    this.loadNotificationsToForm();
  },

  /**
   * Switch tabs
   */
  switchTab(tabName) {
    // Hide all tabs
    document.getElementById('settings-tab-alerts').classList.add('hidden');
    document.getElementById('settings-tab-notifications').classList.add('hidden');
    
    // Deactivate buttons
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => b.classList.remove('active'));

    // Show selected
    document.getElementById(`settings-tab-${tabName}`).classList.remove('hidden');
    
    // Activate button (simple logic, assuming order)
    if (tabName === 'alerts') btns[0].classList.add('active');
    if (tabName === 'notifications') btns[1].classList.add('active');
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
   * Load notification config to form
   */
  async loadNotificationsToForm() {
    const config = await API.getNotificationConfig();
    if (!config) return;

    // Telegram
    if (config.telegram) {
        document.getElementById('telegram-enabled').checked = config.telegram.enabled;
        document.getElementById('telegram-token').value = config.telegram.botToken || '';
        document.getElementById('telegram-chat-id').value = config.telegram.chatId || '';
    }

    // WhatsApp
    if (config.whatsapp) {
        document.getElementById('whatsapp-enabled').checked = config.whatsapp.enabled;
        document.getElementById('whatsapp-url').value = config.whatsapp.apiUrl || '';
        document.getElementById('whatsapp-auth').value = config.whatsapp.authKey || '';
        document.getElementById('whatsapp-number').value = config.whatsapp.targetNumber || '';
    }
  },

  /**
   * Save alert configuration
   */
  async saveAlerts() {
    const alertConfig = {
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

    const notifConfig = {
        telegram: {
            enabled: document.getElementById('telegram-enabled').checked,
            botToken: document.getElementById('telegram-token').value,
            chatId: document.getElementById('telegram-chat-id').value
        },
        whatsapp: {
            enabled: document.getElementById('whatsapp-enabled').checked,
            apiUrl: document.getElementById('whatsapp-url').value,
            authKey: document.getElementById('whatsapp-auth').value,
            targetNumber: document.getElementById('whatsapp-number').value
        }
    };

    await API.updateAlertConfig(alertConfig);
    await API.updateNotificationConfig(notifConfig);

    // Refresh local cache/state
    Events.alertConfig = alertConfig;
    Events.push('success', 'Configurações salvas com sucesso');
    
    Modal.close('settings');
  },

  /**
   * Test Notification
   */
  async testNotification(type) {
    // Save current state first implicitly to backend? 
    // Or just send current form values? 
    // Ideally backend should use saved config, so let's save first or warn user.
    // For simplicity, let's assume user saved first or we send form values in test (but endpoint uses stored config).
    // Let's force save first.
    
    const notifConfig = {
        telegram: {
            enabled: document.getElementById('telegram-enabled').checked,
            botToken: document.getElementById('telegram-token').value,
            chatId: document.getElementById('telegram-chat-id').value
        },
        whatsapp: {
            enabled: document.getElementById('whatsapp-enabled').checked,
            apiUrl: document.getElementById('whatsapp-url').value,
            authKey: document.getElementById('whatsapp-auth').value,
            targetNumber: document.getElementById('whatsapp-number').value
        }
    };
    
    // Update config momentarily for test
    await API.updateNotificationConfig(notifConfig);

    Events.push('info', `Enviando teste para ${type}...`);
    const result = await API.testNotification(type);
    
    if (result && result.success) {
        Events.push('success', `Teste de ${type} enviado com sucesso!`);
    } else {
        Events.push('danger', `Falha ao enviar teste de ${type}. Verifique as credenciais.`);
    }
  }
};

// Make available globally
window.Settings = Settings;