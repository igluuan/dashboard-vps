/**
 * Systemd Services Management
 */

const Services = {
  services: [],
  filteredServices: [],
  currentLogService: null,

  /**
   * Load services from API
   */
  async load() {
    const data = await API.getServices();
    if (!data) return;

    this.services = data;
    this.filteredServices = data;
    this.render();
  },

  /**
   * Render services list
   */
  render() {
    const container = document.getElementById('services-list');
    if (!container) return;

    if (this.filteredServices.length === 0) {
      container.innerHTML = '<div class="text-muted" style="text-align: center; padding: 32px;">Nenhum serviço encontrado</div>';
      return;
    }

    const html = this.filteredServices.map(service => {
      const isActive = service.active === 'active';
      const statusClass = isActive ? 'active' : service.sub === 'failed' ? 'failed' : 'inactive';
      const description = service.description || 'Sem descrição';

      return `
        <div class="card" style="padding: 12px;">
            <div class="flex justify-between items-center mb-sm">
                <strong class="mono" style="font-size: 0.875rem;">${Utils.escapeHtml(service.name)}</strong>
                <span class="status-badge ${statusClass}">
                    <span class="status-dot ${isActive ? 'pulse' : ''}"></span>
                    ${service.sub || service.active}
                </span>
            </div>
            <div class="text-sm text-muted mb-md" style="line-height: 1.4;">${Utils.escapeHtml(description)}</div>
            <div class="service-actions" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px;">
                <button class="btn btn-sm btn-success" onclick="Services.control('${Utils.escapeHtml(service.name)}', 'start')" ${!isActive ? '' : 'disabled'}>Iniciar</button>
                <button class="btn btn-sm btn-danger" onclick="Services.control('${Utils.escapeHtml(service.name)}', 'stop')" ${isActive ? '' : 'disabled'}>Parar</button>
                <button class="btn btn-sm btn-warning" onclick="Services.control('${Utils.escapeHtml(service.name)}', 'restart')">Reiniciar</button>
                <button class="btn btn-sm btn-secondary" style="grid-column: span 3;" onclick="Logs.openForService('${Utils.escapeHtml(service.name)}')">Ver Logs</button>
            </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  },

  /**
   * Filter services by name
   */
  filter() {
    const query = document.getElementById('service-filter')?.value.toLowerCase() || '';

    this.filteredServices = this.services.filter(service => {
      return service.name.toLowerCase().includes(query);
    });

    this.render();
  },

  /**
   * Control service (start/stop/restart)
   */
  async control(name, action) {
    const success = await API.controlService(name, action);

    if (success) {
      let msg = '';
      if (action === 'start') msg = `Serviço ${name} iniciado`;
      else if (action === 'stop') msg = `Serviço ${name} parado`;
      else if (action === 'restart') msg = `Serviço ${name} reiniciado`;

      Events.push('success', msg);
      await this.load();
    } else {
      Events.push('danger', `Erro ao ${action === 'start' ? 'iniciar' : action === 'stop' ? 'parar' : 'reiniciar'} serviço`);
    }
  }
};

// Make available globally
window.Services = Services;