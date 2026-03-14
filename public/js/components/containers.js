/**
 * Docker Containers Management
 */

const Containers = {
  containers: [],
  filteredContainers: [],

  /**
   * Load containers from API
   */
  async load() {
    const data = await API.getContainers();
    if (!data) return;

    this.containers = data;
    this.filteredContainers = data;
    this.render();
  },

  /**
   * Render containers list
   */
  render() {
    this.renderTable();
    this.renderMobileCards();
  },

  /**
   * Render desktop table
   */
  renderTable() {
    const tbody = document.querySelector('#containers-table tbody');
    if (!tbody) return;

    if (this.filteredContainers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align: center; padding: 32px;">Nenhum container encontrado</td></tr>';
      return;
    }

    const html = this.filteredContainers.map(container => {
      const names = container.Names.map(n => n.replace(/^\//, '')).join(', ');
      const image = container.Image.substring(0, 40) + (container.Image.length > 40 ? '...' : '');
      const ports = Utils.formatPorts(container.Ports);
      const state = container.State;
      const statusClass = state === 'running' ? 'running' : state === 'exited' ? 'exited' : 'other';

      return `
        <tr>
            <td><strong>${Utils.escapeHtml(names)}</strong></td>
            <td class="text-muted mono" title="${Utils.escapeHtml(container.Image)}">${Utils.escapeHtml(image)}</td>
            <td class="text-muted">${Utils.escapeHtml(ports)}</td>
            <td class="text-muted text-sm">${Utils.escapeHtml(container.Status)}</td>
            <td>
                <div class="flex gap-sm">
                    ${state !== 'running' ? `<button class="btn btn-sm btn-success" onclick="Containers.start('${container.Id}')" title="Iniciar">▶</button>` : ''}
                    ${state === 'running' ? `<button class="btn btn-sm btn-danger" onclick="Containers.stop('${container.Id}')" title="Parar">■</button>` : ''}
                    <button class="btn btn-sm btn-warning" onclick="Containers.restart('${container.Id}')" title="Reiniciar">↻</button>
                    <button class="btn btn-sm btn-secondary" onclick="Logs.openForContainer('${container.Id}', '${Utils.escapeHtml(names)}')" title="Logs">📋</button>
                </div>
            </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = html;
  },

  /**
   * Render mobile cards
   */
  renderMobileCards() {
    const container = document.getElementById('mobile-containers');
    if (!container) return;

    if (this.filteredContainers.length === 0) {
      container.innerHTML = '<div class="text-muted" style="text-align: center; padding: 32px;">Nenhum container encontrado</div>';
      return;
    }

    const html = this.filteredContainers.map(container => {
      const names = container.Names.map(n => n.replace(/^\//, '')).join(', ');
      const state = container.State;
      const statusClass = state === 'running' ? 'running' : state === 'exited' ? 'exited' : 'other';

      return `
        <div class="container-card card">
            <div class="flex justify-between items-center mb-md">
                <strong>${Utils.escapeHtml(names)}</strong>
                <span class="status-badge ${statusClass}">
                    <span class="status-dot ${state === 'running' ? 'pulse' : ''}"></span>
                    ${state}
                </span>
            </div>
            <div class="text-sm text-muted mb-md">
                <div>${Utils.escapeHtml(container.Image.substring(0, 50))}</div>
                <div>${Utils.escapeHtml(container.Status)}</div>
            </div>
            <div class="card-actions">
                ${state !== 'running' ? `<button class="btn btn-sm btn-success" onclick="Containers.start('${container.Id}')">Iniciar</button>` : ''}
                ${state === 'running' ? `<button class="btn btn-sm btn-danger" onclick="Containers.stop('${container.Id}')">Parar</button>` : ''}
                <button class="btn btn-sm btn-warning" onclick="Containers.restart('${container.Id}')">Reiniciar</button>
                <button class="btn btn-sm btn-secondary" onclick="Logs.openForContainer('${container.Id}', '${Utils.escapeHtml(names)}')">Logs</button>
            </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  },

  /**
   * Filter containers by name
   */
  filter() {
    const query = document.getElementById('container-filter')?.value.toLowerCase() || '';

    this.filteredContainers = this.containers.filter(container => {
      const names = container.Names.map(n => n.replace(/^\//, '')).join(' ').toLowerCase();
      return names.includes(query);
    });

    this.render();
  },

  /**
   * Start container
   */
  async start(id) {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '...';

    const success = await API.startContainer(id);

    if (success) {
      Events.push('success', 'Container iniciado');
      await this.load();
    } else {
      Events.push('danger', 'Erro ao iniciar container');
    }
  },

  /**
   * Stop container
   */
  async stop(id) {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '...';

    const success = await API.stopContainer(id);

    if (success) {
      Events.push('success', 'Container parado');
      await this.load();
    } else {
      Events.push('danger', 'Erro ao parar container');
    }
  },

  /**
   * Restart container
   */
  async restart(id) {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '...';

    const success = await API.restartContainer(id);

    if (success) {
      Events.push('success', 'Container reiniciado');
      await this.load();
    } else {
      Events.push('danger', 'Erro ao reiniciar container');
    }
  }
};

// Make available globally
window.Containers = Containers;