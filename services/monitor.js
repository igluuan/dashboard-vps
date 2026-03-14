const si = require('systeminformation');
const notificationService = require('./notification');

let monitorInterval = null;
const CHECK_INTERVAL = 60 * 1000; // 1 minute
const ALERT_COOLDOWN = 30 * 60 * 1000; // 30 minutes

// Alert state tracking to prevent spam
const alertState = {
    cpu: { lastAlert: 0, active: false },
    ram: { lastAlert: 0, active: false },
    disk: { lastAlert: 0, active: false }
};

// Thresholds (can be updated from server.js env/config)
let thresholds = {
    cpu: 85,
    ram: 85,
    disk: 90
};

const updateThresholds = (newThresholds) => {
    thresholds = { ...thresholds, ...newThresholds };
};

const checkMetrics = async () => {
    try {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const disk = await si.fsSize();

        const now = Date.now();

        // CPU Check
        if (cpu.currentLoad >= thresholds.cpu) {
            if (!alertState.cpu.active || (now - alertState.cpu.lastAlert > ALERT_COOLDOWN)) {
                await notificationService.sendNotification(
                    '⚠️ Alerta de CPU',
                    `Uso de CPU atingiu ${cpu.currentLoad.toFixed(1)}% (Limite: ${thresholds.cpu}%)`,
                    'danger'
                );
                alertState.cpu.lastAlert = now;
                alertState.cpu.active = true;
            }
        } else {
            if (alertState.cpu.active) {
                await notificationService.sendNotification(
                    '✅ CPU Normalizado',
                    `Uso de CPU voltou para ${cpu.currentLoad.toFixed(1)}%`,
                    'success'
                );
                alertState.cpu.active = false;
            }
        }

        // RAM Check
        const ramPercent = (mem.used / mem.total) * 100;
        if (ramPercent >= thresholds.ram) {
            if (!alertState.ram.active || (now - alertState.ram.lastAlert > ALERT_COOLDOWN)) {
                await notificationService.sendNotification(
                    '⚠️ Alerta de RAM',
                    `Uso de RAM atingiu ${ramPercent.toFixed(1)}% (Limite: ${thresholds.ram}%)`,
                    'danger'
                );
                alertState.ram.lastAlert = now;
                alertState.ram.active = true;
            }
        } else {
            if (alertState.ram.active) {
                await notificationService.sendNotification(
                    '✅ RAM Normalizado',
                    `Uso de RAM voltou para ${ramPercent.toFixed(1)}%`,
                    'success'
                );
                alertState.ram.active = false;
            }
        }

        // Disk Check
        if (disk && disk[0]) {
            if (disk[0].use >= thresholds.disk) {
                if (!alertState.disk.active || (now - alertState.disk.lastAlert > ALERT_COOLDOWN)) {
                    await notificationService.sendNotification(
                        '⚠️ Alerta de Disco',
                        `Uso de Disco atingiu ${disk[0].use.toFixed(1)}% (Limite: ${thresholds.disk}%)`,
                        'danger'
                    );
                    alertState.disk.lastAlert = now;
                    alertState.disk.active = true;
                }
            } else {
                if (alertState.disk.active) {
                    await notificationService.sendNotification(
                        '✅ Disco Normalizado',
                        `Uso de Disco voltou para ${disk[0].use.toFixed(1)}%`,
                        'success'
                    );
                    alertState.disk.active = false;
                }
            }
        }

    } catch (error) {
        console.error('Error in monitor service:', error);
    }
};

const start = () => {
    if (monitorInterval) return;
    
    console.log('Starting system monitor...');
    // Initial check
    checkMetrics();
    
    // Schedule
    monitorInterval = setInterval(checkMetrics, CHECK_INTERVAL);
};

const stop = () => {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
        console.log('System monitor stopped');
    }
};

module.exports = {
    start,
    stop,
    updateThresholds
};
