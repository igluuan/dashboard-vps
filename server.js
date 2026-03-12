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

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// System Metrics
app.get("/stats", async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const disk = await si.fsSize();
    const uptime = si.time();

    res.json({
      cpu: cpu.currentLoad,
      ram: (mem.used / mem.total) * 100,
      disk: disk[0] ? disk[0].use : 0,
      uptime: uptime.uptime
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
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

// WebSocket for Logs
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("logs", async (containerId) => {
    try {
      const container = docker.getContainer(containerId);
      const stream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 50 // Get last 50 lines initially
      });

      stream.on("data", (data) => {
        socket.emit("log", data.toString());
      });

      socket.on("disconnect", () => {
        stream.destroy(); // Stop streaming when client disconnects
      });
    } catch (error) {
      console.error("Log stream error:", error);
      socket.emit("log", "Error streaming logs: " + error.message);
    }
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
