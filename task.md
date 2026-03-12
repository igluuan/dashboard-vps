Um dashboard com **dark mode, monitoramento/controle de containers e logs em tempo real** pode ser estruturado em quatro módulos: coleta de dados, controle de serviços/containers, streaming de logs e interface web.

&#x20;

***

# Arquitetura recomendada

```
VPS
├ backend (Node.js)
│  ├ coleta métricas do sistema
│  ├ controla Docker e serviços
│  ├ streaming de logs
│  └ WebSocket
│
├ frontend (React / HTML)
│  ├ dashboard dark mode
│  ├ lista de containers
│  ├ controle start/stop/restart
│  └ visualização de logs
│
└ Docker / Systemd
```

Tecnologias comuns:

Backend

- Node.js
- Express
- dockerode (controle Docker)
- systeminformation (métricas)
- socket.io (tempo real)

Frontend

- React ou HTML simples
- Tailwind CSS (dark mode fácil)
- Chart.js ou ECharts

***

# 1. Monitoramento do servidor

Biblioteca:

```
systeminformation
```

Exemplo de endpoint:

```
import si from "systeminformation"

app.get("/api/system", async (req,res)=>{
  const cpu = await si.currentLoad()
  const mem = await si.mem()
  const disk = await si.fsSize()

  res.json({
    cpu: cpu.currentLoad.toFixed(1),
    ram: (mem.used/mem.total*100).toFixed(1),
    disk: disk[0].use.toFixed(1)
  })
})
```

Exibir no dashboard:

```
CPU   23%
RAM   61%
DISK  40%
UPTIME 2d 13h
```

***

# 2. Monitoramento de containers Docker

Biblioteca:

```
dockerode
```

Instalação:

```
npm install dockerode
```

Listar containers:

```
import Docker from "dockerode"

const docker = new Docker({ socketPath: "/var/run/docker.sock" })

app.get("/api/containers", async (req,res)=>{
  const containers = await docker.listContainers({ all:true })
  res.json(containers)
})
```

Resultado:

```
bot-telegram     running
api-server       running
redis            stopped
nginx            running
```

***

# 3. Controle de containers

Endpoints de controle:

```
app.post("/api/container/:id/start", async (req,res)=>{
  const container = docker.getContainer(req.params.id)
  await container.start()
  res.send("started")
})

app.post("/api/container/:id/stop", async (req,res)=>{
  const container = docker.getContainer(req.params.id)
  await container.stop()
  res.send("stopped")
})
```

No dashboard:

```
bot-telegram
[ start ] [ stop ] [ restart ]
```

***

# 4. Controle de serviços (systemd)

Executar comandos do Linux.

Exemplo:

```
import { exec } from "child_process"

app.post("/api/service/:name/restart",(req,res)=>{
  exec(`systemctl restart ${req.params.name}`)
  res.send("ok")
})
```

Serviços exibidos:

```
nginx
redis
postgres
docker
```

***

# 5. Logs em tempo real

Logs podem ser transmitidos via **WebSocket**.

Exemplo com Docker:

```
io.on("connection", socket => {

  socket.on("logs", async (containerId)=>{
    const container = docker.getContainer(containerId)

    const stream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true
    })

    stream.on("data", data=>{
      socket.emit("log", data.toString())
    })
  })

})
```

No dashboard:

```
[ LOGS bot-telegram ]

13:02 bot iniciado
13:03 conexão telegram ok
13:04 mensagem recebida
13:04 erro timeout
```

***

# 6. Dark Mode

Com Tailwind CSS:

```
dark:bg-zinc-900
dark:text-zinc-100
```

Estrutura visual comum:

```
----------------------------------
 VPS Dashboard
----------------------------------

CPU      32%
RAM      58%
DISK     41%

Containers
----------------------------------
bot-telegram   running  [logs]
api-server     running  [logs]
redis          stopped  [start]

Logs
----------------------------------
stream em tempo real
```

