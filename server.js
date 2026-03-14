require('dotenv').config();
const express = require("express");
const si = require("systeminformation");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const Docker = require("dockerode");
const { exec } = require("child_process");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

// Warning if default token
if (process.env.DASHBOARD_TOKEN === 'troque_aqui') {
    console.warn("WARNING: You are using the default DASHBOARD_TOKEN. Please change it in your .env file.");
}

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Serve backup files
app.use('/backups', express.static(path.join(__dirname, "backups")));

app.use(express.json());

// Auth Middleware
const requireAuth = (req, res, next) => {
    const token = req.headers['x-dashboard-token'];
    if (token === process.env.DASHBOARD_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// Login Endpoint
app.post("/auth/login", (req, res) => {
    const { token } = req.body;
    if (token === process.env.DASHBOARD_TOKEN) {
        res.json({ ok: true });
    } else {
        res.status(401).json({ error: "Token inválido" });
    }
});

// Apply auth middleware to all API routes
app.use("/stats", requireAuth);
app.use("/api", requireAuth);

// System Metrics
app.get("/stats", async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const disk = await si.fsSize();
    const net = await si.networkStats();
    const uptime = si.time();

    const netIface = net.find(i => i.iface !== "lo") || net[0];

    res.json({
      cpu: cpu.currentLoad,
      ram: (mem.used / mem.total) * 100,
      disk: disk[0] ? disk[0].use : 0,
      uptime: uptime.uptime,
      net_rx: netIface ? (netIface.rx_sec || 0) : 0,
      net_tx: netIface ? (netIface.tx_sec || 0) : 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Bot Config
app.get("/api/config", (req, res) => {
    res.json({ 
        botContainerName: process.env.BOT_CONTAINER_NAME || null,
        telegramBotContainerName: process.env.TELEGRAM_BOT_CONTAINER_NAME || null
    });
});

// WhatsApp Bot Status
app.get("/api/bot/status", async (req, res) => {
    const botName = process.env.BOT_CONTAINER_NAME;
    if (!botName) {
        return res.json({ found: false });
    }
    await checkContainerStatus(botName, res);
});

// Telegram Bot Status
app.get("/api/bot/telegram/status", async (req, res) => {
    const botName = process.env.TELEGRAM_BOT_CONTAINER_NAME;
    if (!botName) {
        return res.json({ found: false });
    }
    await checkContainerStatus(botName, res);
});

async function checkContainerStatus(botName, res) {
    try {
        const containers = await docker.listContainers({
            all: true,
            filters: { name: [botName] }
        });
        
        const botContainer = containers.find(c => c.Names.some(n => n.includes(botName)));

        if (botContainer) {
            res.json({
                found: true,
                state: botContainer.State,
                status: botContainer.Status,
                id: botContainer.Id
            });
        } else {
            res.json({ found: false });
        }
    } catch (error) {
        console.error("Bot status error:", error);
        res.status(500).json({ error: "Docker Error" });
    }
}

// Docker Containers
app.get("/api/containers", async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    res.json(containers);
  } catch (error) {
    console.error("Docker error:", error);
    res.status(500).json({ error: "Docker Error" });
  }
});

// Protected Services (cannot be stopped/restarted via dashboard)
const PROTECTED_SERVICES = ["ssh.service", "sshd.service", "systemd-journald.service", "systemd-udevd.service", "dashboard-vps.service", "docker.service"];

// Ignored Services (hidden from list to reduce noise)
const IGNORED_PATTERNS = [
    /^systemd-/,
    /^sys-/,
    /^dev-/,
    /^proc-/,
    /^run-/,
    /^user@/,     // user sessions
    /^getty@/,    // terminals
    /^serial-getty@/,
    /^modprobe@/,
    /^plymouth-/, // boot splash
    /^snap-/,     // snap mounts (optional, but usually noise)
    /^keyboard-/,
    /^alsa-/,     // audio
    /^dbus/,      // system bus
    /^kmod-/,
    /^polkit/,
    /^wpa_supplicant/
];

// List Services
app.get("/api/services", (req, res) => {
    exec("systemctl list-units --type=service --no-pager --output=json", (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: "Failed to list services" });
        }
        try {
            const units = JSON.parse(stdout);
            const services = units
                .filter(u => u.load === "loaded")
                .filter(u => {
                    // Filter out ignored patterns
                    if (IGNORED_PATTERNS.some(p => p.test(u.unit))) return false;
                    return true;
                })
                .map(u => ({
                    name: u.unit,
                    description: u.description,
                    load: u.load,
                    active: u.active,
                    sub: u.sub
                }));
            res.json(services);
        } catch (e) {
            console.error("Parse error:", e);
            res.status(500).json({ error: "Failed to parse systemd output" });
        }
    });
});

// Control Service
app.post("/api/service/:name/:action", (req, res) => {
    const { name, action } = req.params;
    
    // Sanitize name
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
        return res.status(400).send("Nome de serviço inválido");
    }

    // Validate action
    if (!["start", "stop", "restart"].includes(action)) {
        return res.status(400).send("Ação inválida");
    }

    // Check protected services
    if ((action === "stop" || action === "restart") && PROTECTED_SERVICES.includes(name)) {
        return res.status(403).send("Este serviço é protegido e não pode ser parado/reiniciado via dashboard");
    }

    exec(`systemctl ${action} ${name}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Service control error: ${error}`);
            return res.status(500).send(stderr || error.message);
        }
        res.send("ok");
    });
});

// Terminal Exec
app.post("/api/terminal/exec", (req, res) => {
    const { command } = req.body;
    
    if (!command || typeof command !== 'string') {
        return res.status(400).send("Comando inválido");
    }

    // Basic security check (optional, but good practice even for admin)
    // For now, we allow everything since it's an admin dashboard, but maybe block 'rm -rf /' or interactive commands
    if (command.trim().startsWith("rm -rf /")) {
        return res.status(403).send("Comando perigoso bloqueado");
    }

    const child = exec(command, { cwd: '/root' }, (error, stdout, stderr) => {
        // We don't return 500 on command error because the command might just fail (e.g. ls non-existent)
        // We return the output regardless
        res.json({
            stdout: stdout || "",
            stderr: stderr || "",
            error: error ? error.message : null
        });
    });
});

// Service Logs
app.get("/api/service/:name/logs", (req, res) => {
    const { name } = req.params;
    const lines = req.query.lines || 100;
    const since = req.query.since; // e.g. "10m", "1h"

    // Sanitize name
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
        return res.status(400).send("Nome de serviço inválido");
    }

    let cmd = `journalctl -u ${name} -n ${lines} --no-pager --output=short`;
    if (since) {
        // Sanitize since (simple alphanumeric check)
        if (/^[a-zA-Z0-9\s]+$/.test(since)) {
            cmd += ` --since "${since} ago"`;
        }
    }

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Journalctl error: ${error}`);
            return res.status(500).send(stderr || error.message);
        }
        res.send(stdout);
    });
});

// Start Container
app.post("/api/container/:id/start", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.start();
    res.send("started");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Stop Container
app.post("/api/container/:id/stop", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.stop();
    res.send("stopped");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Restart Container
app.post("/api/container/:id/restart", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.restart();
    res.send("restarted");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Alert Configuration - with defaults
const ALERT_CONFIG = {
  cpu: {
    warning: parseFloat(process.env.ALERT_CPU_WARNING) || 70,
    danger: parseFloat(process.env.ALERT_CPU_DANGER) || 85
  },
  ram: {
    warning: parseFloat(process.env.ALERT_RAM_WARNING) || 70,
    danger: parseFloat(process.env.ALERT_RAM_DANGER) || 85
  },
  disk: {
    warning: parseFloat(process.env.ALERT_DISK_WARNING) || 80,
    danger: parseFloat(process.env.ALERT_DISK_DANGER) || 90
  },
  enabled: true
};

// Get alert configuration
app.get("/api/alerts/config", requireAuth, (req, res) => {
  res.json(ALERT_CONFIG);
});

// Update alert configuration
app.post("/api/alerts/config", requireAuth, (req, res) => {
  const { cpu, ram, disk, enabled } = req.body;

  if (cpu) {
    if (cpu.warning !== undefined) ALERT_CONFIG.cpu.warning = Math.min(100, Math.max(0, cpu.warning));
    if (cpu.danger !== undefined) ALERT_CONFIG.cpu.danger = Math.min(100, Math.max(0, cpu.danger));
  }

  if (ram) {
    if (ram.warning !== undefined) ALERT_CONFIG.ram.warning = Math.min(100, Math.max(0, ram.warning));
    if (ram.danger !== undefined) ALERT_CONFIG.ram.danger = Math.min(100, Math.max(0, ram.danger));
  }

  if (disk) {
    if (disk.warning !== undefined) ALERT_CONFIG.disk.warning = Math.min(100, Math.max(0, disk.warning));
    if (disk.danger !== undefined) ALERT_CONFIG.disk.danger = Math.min(100, Math.max(0, disk.danger));
  }

  if (enabled !== undefined) ALERT_CONFIG.enabled = enabled;

  res.json(ALERT_CONFIG);
});

// Get current alert status based on metrics
app.get("/api/alerts/status", requireAuth, async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const disk = await si.fsSize();

    const alerts = [];

    if (cpu.currentLoad >= ALERT_CONFIG.cpu.danger) {
      alerts.push({ type: 'danger', metric: 'cpu', value: cpu.currentLoad, threshold: ALERT_CONFIG.cpu.danger });
    } else if (cpu.currentLoad >= ALERT_CONFIG.cpu.warning) {
      alerts.push({ type: 'warning', metric: 'cpu', value: cpu.currentLoad, threshold: ALERT_CONFIG.cpu.warning });
    }

    const ramPercent = (mem.used / mem.total) * 100;
    if (ramPercent >= ALERT_CONFIG.ram.danger) {
      alerts.push({ type: 'danger', metric: 'ram', value: ramPercent, threshold: ALERT_CONFIG.ram.danger });
    } else if (ramPercent >= ALERT_CONFIG.ram.warning) {
      alerts.push({ type: 'warning', metric: 'ram', value: ramPercent, threshold: ALERT_CONFIG.ram.warning });
    }

    if (disk[0]) {
      if (disk[0].use >= ALERT_CONFIG.disk.danger) {
        alerts.push({ type: 'danger', metric: 'disk', value: disk[0].use, threshold: ALERT_CONFIG.disk.danger });
      } else if (disk[0].use >= ALERT_CONFIG.disk.warning) {
        alerts.push({ type: 'warning', metric: 'disk', value: disk[0].use, threshold: ALERT_CONFIG.disk.warning });
      }
    }

    res.json({
      alerts,
      config: ALERT_CONFIG,
      metrics: {
        cpu: cpu.currentLoad,
        ram: ramPercent,
        disk: disk[0]?.use || 0
      }
    });
  } catch (error) {
    console.error("Alert status error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// WebSocket Auth
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token === process.env.DASHBOARD_TOKEN) {
        next();
    } else {
        next(new Error("Unauthorized"));
    }
});

// WebSocket for Logs
io.on("connection", (socket) => {
  console.log("Client connected");

  let currentStream = null;

  socket.on("logs", async (data) => {
    const containerId = typeof data === 'string' ? data : data.id;
    const since = (typeof data === 'object' && data.since) ? data.since : null; // timestamp in seconds

    // Stop any previous stream for this socket
    if (currentStream) {
        currentStream.destroy();
        currentStream = null;
    }

    try {
      const container = docker.getContainer(containerId);
      const options = {
        follow: true,
        stdout: true,
        stderr: true,
        tail: 50
      };

      if (since) {
        options.since = Math.floor(Date.now() / 1000) - (parseInt(since) * 60); // since is in minutes
        // If since is provided, we might want to fetch more lines or ignore tail?
        // Docker API uses 'since' as unix timestamp.
        // If 'since' is used, 'tail' might conflict if we want *all* logs since then.
        // Let's keep tail default unless specified otherwise.
      }

      const stream = await container.logs(options);

      currentStream = stream;

      stream.on("data", (data) => {
        socket.emit("log", data.toString());
      });

      stream.on("end", () => {
        currentStream = null;
      });

    } catch (error) {
      console.error("Log stream error:", error);
      socket.emit("log", "Error streaming logs: " + error.message);
    }
  });

  socket.on("stop_logs", () => {
    if (currentStream) {
        currentStream.destroy();
        currentStream = null;
    }
  });

  socket.on("disconnect", () => {
    if (currentStream) {
        currentStream.destroy();
    }
  });
});

const PORT = process.env.PORT || 4000;

// Backup Configuration
const fs = require('fs');

// Create backups directory if not exists
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate backup
app.get("/api/config/backup", requireAuth, async (req, res) => {
  try {
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      env: {},
      docker: {},
      services: []
    };

    // Read .env file (exclude sensitive values)
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          // Mask sensitive values
          if (key.includes('TOKEN') || key.includes('PASSWORD') || key.includes('SECRET')) {
            backup.env[key] = '***HIDDEN***';
          } else {
            backup.env[key] = valueParts.join('=').trim();
          }
        }
      });
    }

    // Get Docker containers info
    const containers = await docker.listContainers({ all: true });
    backup.docker.containers = containers.map(c => ({
      name: c.Names[0]?.replace('/', ''),
      image: c.Image,
      state: c.State,
      status: c.Status
    }));

    // Get systemd services (filtered)
    exec("systemctl list-units --type=service --no-pager --output=json", (error, stdout) => {
      if (!error) {
        try {
          const units = JSON.parse(stdout);
          backup.services = units
            .filter(u => u.load === 'loaded')
            .map(u => ({
              name: u.unit,
              active: u.active,
              sub: u.sub
            }));
        } catch (e) {}
      }

      // Generate filename
      const filename = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      const filepath = path.join(BACKUP_DIR, filename);

      fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

      res.json({
        success: true,
        filename,
        filepath: `/backups/${filename}`,
        timestamp: backup.timestamp
      });
    });
  } catch (error) {
    console.error("Backup error:", error);
    res.status(500).json({ error: "Erro ao criar backup" });
  }
});

// List backups
app.get("/api/config/backups", requireAuth, (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const filepath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(filepath);
        return {
          filename: f,
          size: stats.size,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.created - a.created);

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar backups" });
  }
});

// Download backup
app.get("/api/config/backups/:filename", requireAuth, (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "Backup não encontrado" });
  }

  res.download(filepath, filename);
});

// Restore from backup (preview - no actual restore for safety)
app.post("/api/config/restore", requireAuth, (req, res) => {
  // For safety, we don't automatically restore
  // Instead, we provide a preview of what would be restored
  const { config } = req.body;

  if (!config) {
    return res.status(400).json({ error: "Configuração inválida" });
  }

  // Validate backup structure
  if (!config.timestamp || !config.version) {
    return res.status(400).json({ error: "Formato de backup inválido" });
  }

  res.json({
    success: true,
    message: "Preview mode - restauração real precisa ser confirmada",
    preview: {
      timestamp: config.timestamp,
      containerCount: config.docker?.containers?.length || 0,
      serviceCount: config.services?.length || 0
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
