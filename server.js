require('dotenv').config();
const express = require("express");
const si = require("systeminformation");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const Docker = require("dockerode");

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
    res.json({ botContainerName: process.env.BOT_CONTAINER_NAME || null });
});

// Bot Status
app.get("/api/bot/status", async (req, res) => {
    const botName = process.env.BOT_CONTAINER_NAME;
    if (!botName) {
        return res.json({ found: false });
    }

    try {
        const containers = await docker.listContainers({
            all: true,
            filters: { name: [botName] }
        });
        
        // Find the specific container by name (Docker returns all matches, e.g. "whatsapp-bot-1")
        // We look for one that includes the name
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
});

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

  socket.on("logs", async (containerId) => {
    // Stop any previous stream for this socket
    if (currentStream) {
        currentStream.destroy();
        currentStream = null;
    }

    try {
      const container = docker.getContainer(containerId);
      const stream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 50 // Get last 50 lines initially
      });

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
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
