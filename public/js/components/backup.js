/**
 * Backup and Restore Management
 */

const Backup = {
  /**
   * Create a new backup
   */
  async create() {
    Events.push('info', 'Criando backup...');

    const result = await API.createBackup();

    if (result && result.success) {
      Events.push('success', `Backup criado: ${result.filename}`);
    } else {
      Events.push('danger', 'Erro ao criar backup');
    }
  },

  /**
   * Show backup list
   */
  async showList() {
    const backups = await API.listBackups();

    if (!backups || backups.length === 0) {
      Events.push('warning', 'Nenhum backup encontrado');
      return;
    }

    // Create a simple modal for backup list
    let html = `
      <div id="backup-modal" class="modal-overlay open" onclick="if(event.target === this) this.remove()">
        <div class="modal" style="max-width: 600px;">
          <div class="modal-header">
            <h3>Backups Disponíveis</h3>
            <button class="modal-close" onclick="document.getElementById('backup-modal').remove()" aria-label="Fechar">&times;</button>
          </div>
          <div class="modal-body">
            <table style="width: 100%; font-size: 0.875rem;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 8px;">Arquivo</th>
                  <th style="text-align: left; padding: 8px;">Tamanho</th>
                  <th style="text-align: left; padding: 8px;">Data</th>
                  <th style="text-align: right; padding: 8px;">Ações</th>
                </tr>
              </thead>
              <tbody>
    `;

    backups.forEach(backup => {
      const size = this.formatSize(backup.size);
      const date = new Date(backup.created).toLocaleString('pt-BR');

      html += `
        <tr>
          <td style="padding: 8px;">${backup.filename}</td>
          <td style="padding: 8px;">${size}</td>
          <td style="padding: 8px;">${date}</td>
          <td style="padding: 8px; text-align: right;">
            <a href="/api/config/backups/${backup.filename}" class="btn btn-sm btn-secondary" download>Download</a>
          </td>
        </tr>
      `;
    });

    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existing = document.getElementById('backup-modal');
    if (existing) existing.remove();

    // Add to body
    document.body.insertAdjacentHTML('beforeend', html);
  },

  /**
   * Format file size
   */
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
};

// Make available globally
window.Backup = Backup;