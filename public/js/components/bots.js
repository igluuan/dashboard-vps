/**
 * Bot Status Management (WhatsApp & Telegram)
 */

const Bots = {
  botContainerName: null,
  botContainerId: null,
  botPreviousState: null,

  telegramBotContainerName: null,
  telegramBotContainerId: null,
  telegramBotPreviousState: null,

  /**
   * Load bot configuration
   */
  async loadConfig() {
    const config = await API.getBotConfig();
    if (!config) return;

    if (config.botContainerName) {
      this.botContainerName = config.botContainerName;
      Utils.show('bot-card');
      await this.loadBotStatus();
    }

    if (config.telegramBotContainerName) {
      this.telegramBotContainerName = config.telegramBotContainerName;
      Utils.show('telegram-card');
      await this.loadTelegramBotStatus();
    }
  },

  /**
   * Load WhatsApp bot status
   */
  async loadBotStatus() {
    if (!this.botContainerName) return;

    const status = await API.getBotStatus();
    if (!status) return;

    const indicator = document.getElementById('bot-indicator');
    const details = document.getElementById('bot-details');
    const restartBtn = document.getElementById('bot-restart-btn');

    if (!status.found) {
      details.textContent = 'Container não encontrado';
      if (indicator) indicator.style.backgroundColor = '#6c757d';
      return;
    }

    this.botContainerId = status.id;
    details.textContent = status.status;

    // Update indicator color
    if (indicator) {
      indicator.style.backgroundColor = status.state === 'running' ? '#00d4aa' : '#ff4757';
    }

    // Check for state changes
    if (this.botPreviousState && this.botPreviousState !== status.state) {
      if (status.state === 'running') {
        Events.push('success', 'WhatsApp Bot iniciado');
      } else if (status.state === 'exited') {
        Events.push('danger', 'WhatsApp Bot parado');
      }
    }

    this.botPreviousState = status.state;

    // Enable/disable restart button
    if (restartBtn) {
      restartBtn.disabled = status.state !== 'running';
    }
  },

  /**
   * Load Telegram bot status
   */
  async loadTelegramBotStatus() {
    if (!this.telegramBotContainerName) return;

    const status = await API.getTelegramBotStatus();
    if (!status) return;

    const indicator = document.getElementById('telegram-indicator');
    const details = document.getElementById('telegram-details');
    const restartBtn = document.getElementById('telegram-restart-btn');

    if (!status.found) {
      details.textContent = 'Container não encontrado';
      if (indicator) indicator.style.backgroundColor = '#6c757d';
      return;
    }

    this.telegramBotContainerId = status.id;
    details.textContent = status.status;

    // Update indicator color
    if (indicator) {
      indicator.style.backgroundColor = status.state === 'running' ? '#24a1de' : '#ff4757';
    }

    // Check for state changes
    if (this.telegramBotPreviousState && this.telegramBotPreviousState !== status.state) {
      if (status.state === 'running') {
        Events.push('success', 'Telegram Bot iniciado');
      } else if (status.state === 'exited') {
        Events.push('danger', 'Telegram Bot parado');
      }
    }

    this.telegramBotPreviousState = status.state;

    // Enable/disable restart button
    if (restartBtn) {
      restartBtn.disabled = status.state !== 'running';
    }
  },

  /**
   * Restart bot
   */
  async restartBot(botType) {
    let containerId, containerName;

    if (botType === 'whatsapp') {
      containerId = this.botContainerId;
      containerName = this.botContainerName;
    } else if (botType === 'telegram') {
      containerId = this.telegramBotContainerId;
      containerName = this.telegramBotContainerName;
    }

    if (!containerId) {
      Events.push('danger', 'Container não encontrado');
      return;
    }

    Events.push('info', `${botType === 'whatsapp' ? 'WhatsApp' : 'Telegram'} Bot reiniciando...`);

    const success = await API.restartContainer(containerId);

    if (success) {
      Events.push('success', `${botType === 'whatsapp' ? 'WhatsApp' : 'Telegram'} Bot reiniciado`);

      // Reload status after delay
      setTimeout(() => {
        if (botType === 'whatsapp') {
          this.loadBotStatus();
        } else {
          this.loadTelegramBotStatus();
        }
      }, 3000);
    } else {
      Events.push('danger', 'Erro ao reiniciar bot');
    }
  }
};

// Make bot container names available globally for logs
window.botContainerName = null;
window.telegramBotContainerName = null;

// Patch loadConfig to set global variables
const originalLoadConfig = Bots.loadConfig;
Bots.loadConfig = async function() {
  const result = await originalLoadConfig.apply(this, arguments);
  window.botContainerName = this.botContainerName;
  window.telegramBotContainerName = this.telegramBotContainerName;
  return result;
};

// Make available globally
window.Bots = Bots;