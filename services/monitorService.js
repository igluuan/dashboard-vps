const si = require('systeminformation');
const notificationService = require('./notificationService');

class MonitorService {
    constructor() {
        this.interval = null;
        this.isMonitoring = false;
        this.lastAlerts = {
            cpu: 0,
            ram: 0,
            disk: 0
        };
        // Tempo mínimo entre alertas repetidos (em ms) - ex: 30 minutos
        this.alertCooldown = 30 * 60 * 1000; 
        
        // Configuração padrão de limites (será atualizada pelo server.js)
        this.thresholds = {
            cpu: { warning: 70, danger: 85 },
            ram: { warning: 70, danger: 85 },
            disk: { warning: 80, danger: 90 },
            enabled: true
        };
    }

    updateThresholds(newThresholds) {
        this.thresholds = newThresholds;
    }

    start(intervalMs = 60000) { // Default: verifica a cada 1 minuto
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        console.log(`Iniciando monitoramento de sistema (Intervalo: ${intervalMs}ms)...`);
        
        this.interval = setInterval(() => this.checkMetrics(), intervalMs);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isMonitoring = false;
        console.log('Monitoramento parado.');
    }

    async checkMetrics() {
        if (!this.thresholds.enabled) return;

        try {
            const cpu = await si.currentLoad();
            const mem = await si.mem();
            const disk = await si.fsSize(); // Retorna array de discos

            this.checkCpu(cpu.currentLoad);
            this.checkRam(mem.used, mem.total);
            if (disk && disk.length > 0) {
                this.checkDisk(disk[0].use); // Verifica o primeiro disco (geralmente root)
            }

        } catch (error) {
            console.error('Erro no monitoramento:', error);
        }
    }

    async checkCpu(load) {
        const now = Date.now();
        if (load >= this.thresholds.cpu.danger) {
            if (now - this.lastAlerts.cpu > this.alertCooldown) {
                await notificationService.notifyAll('Alerta de CPU Crítico', `Uso de CPU atingiu ${load.toFixed(1)}%!`, 'danger');
                this.lastAlerts.cpu = now;
            }
        } else if (load >= this.thresholds.cpu.warning) {
            if (now - this.lastAlerts.cpu > this.alertCooldown) {
                await notificationService.notifyAll('Aviso de CPU', `Uso de CPU está em ${load.toFixed(1)}%.`, 'warning');
                this.lastAlerts.cpu = now;
            }
        }
    }

    async checkRam(used, total) {
        const percent = (used / total) * 100;
        const now = Date.now();
        
        if (percent >= this.thresholds.ram.danger) {
            if (now - this.lastAlerts.ram > this.alertCooldown) {
                await notificationService.notifyAll('Alerta de RAM Crítico', `Uso de RAM atingiu ${percent.toFixed(1)}%!`, 'danger');
                this.lastAlerts.ram = now;
            }
        } else if (percent >= this.thresholds.ram.warning) {
            if (now - this.lastAlerts.ram > this.alertCooldown) {
                await notificationService.notifyAll('Aviso de RAM', `Uso de RAM está em ${percent.toFixed(1)}%.`, 'warning');
                this.lastAlerts.ram = now;
            }
        }
    }

    async checkDisk(percent) {
        const now = Date.now();
        
        if (percent >= this.thresholds.disk.danger) {
            if (now - this.lastAlerts.disk > this.alertCooldown) {
                await notificationService.notifyAll('Alerta de Disco Crítico', `Uso de Disco atingiu ${percent.toFixed(1)}%!`, 'danger');
                this.lastAlerts.disk = now;
            }
        } else if (percent >= this.thresholds.disk.warning) {
            if (now - this.lastAlerts.disk > this.alertCooldown) {
                await notificationService.notifyAll('Aviso de Disco', `Uso de Disco está em ${percent.toFixed(1)}%.`, 'warning');
                this.lastAlerts.disk = now;
            }
        }
    }
}

module.exports = new MonitorService();
