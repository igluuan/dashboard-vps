# CLAUDE.md

Este arquivo oferece orientações ao Claude Code (claude.ai/code) ao trabalhar com o código deste repositório.

## Visão Geral do Projeto

Dashboard para monitoramento e gerenciamento de um servidor VPS. Fornece métricas do sistema em tempo real, gerenciamento de containers Docker, controle de serviços systemd, execução de terminal e monitoramento de status de bots (WhatsApp/Telegram).

## Comandos

```bash
# Instalar dependências
npm install

# Iniciar o servidor
node server.js

# Nenhum script de teste definido
```

O servidor roda na porta 4000 por padrão (configurável via PORT no .env).

## Arquitetura

- **Backend**: Express.js + Socket.IO em `server.js`
- **Frontend**: SPA Vanilla JS em `public/`
  - Arquitetura de componentes modulares (`public/js/components/`)
  - Funções utilitárias (`public/js/utils/`)
  - CSS personalizado com design tokens (`public/css/`)

### Endpoints da API

- `GET /stats` - Métricas do sistema (CPU, RAM, disco, rede, uptime)
- `GET /api/containers` - Listar containers Docker
- `POST /api/container/:id/:action` - Iniciar/parar/reiniciar containers
- `GET /api/services` - Listar serviços systemd
- `POST /api/service/:name/:action` - Controlar serviços (start/stop/restart)
- `GET /api/service/:name/logs` - Logs do serviço via journalctl
- `POST /api/terminal/exec` - Executar comandos do terminal
- `GET /api/bot/status` - Status do container do bot WhatsApp
- `GET /api/bot/telegram/status` - Status do container do bot Telegram
- `WebSocket /socket.io` - Streaming de logs de containers em tempo real

### Autenticação

Autenticação baseada em token via header `X-Dashboard-Token`. Token configurado via variável de ambiente `DASHBOARD_TOKEN`. Token padrão no .env.example é `troque_aqui` (deve ser alterado em produção).

### Serviços Protegidos

Não podem ser parados/reiniciados via dashboard: ssh, sshd, systemd-journald, systemd-udevd, dashboard-vps, docker.

## Variáveis de Ambiente

- `DASHBOARD_TOKEN` - Token de autenticação (obrigatório)
- `PORT` - Porta do servidor (padrão: 4000)
- `BOT_CONTAINER_NAME` - Nome do container do bot WhatsApp
- `TELEGRAM_BOT_CONTAINER_NAME` - Nome do container do bot Telegram