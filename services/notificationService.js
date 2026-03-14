const axios = require('axios');

class NotificationService {
    constructor() {
        this.config = {
            telegram: {
                enabled: false,
                botToken: process.env.TELEGRAM_BOT_TOKEN,
                chatId: process.env.TELEGRAM_CHAT_ID
            },
            whatsapp: {
                enabled: false,
                apiUrl: process.env.WHATSAPP_API_URL,
                authKey: process.env.WHATSAPP_AUTH_KEY, // Opcional, para cabeçalho de auth
                targetNumber: process.env.WHATSAPP_TARGET_NUMBER
            }
        };
    }

    updateConfig(newConfig) {
        if (newConfig.telegram) {
            this.config.telegram = { ...this.config.telegram, ...newConfig.telegram };
        }
        if (newConfig.whatsapp) {
            this.config.whatsapp = { ...this.config.whatsapp, ...newConfig.whatsapp };
        }
    }

    getConfig() {
        return this.config;
    }

    async sendTelegram(message) {
        if (!this.config.telegram.enabled || !this.config.telegram.botToken || !this.config.telegram.chatId) {
            return false;
        }

        try {
            const url = `https://api.telegram.org/bot${this.config.telegram.botToken}/sendMessage`;
            await axios.post(url, {
                chat_id: this.config.telegram.chatId,
                text: message,
                parse_mode: 'Markdown'
            });
            return true;
        } catch (error) {
            console.error('Erro ao enviar Telegram:', error.message);
            return false;
        }
    }

    async sendWhatsApp(message) {
        if (!this.config.whatsapp.enabled || !this.config.whatsapp.apiUrl) {
            return false;
        }

        try {
            // Exemplo genérico de payload. Adaptar conforme a API de WhatsApp utilizada (Evolution, Z-API, etc)
            // Assumindo um formato comum de { number, message } ou { phone, text }
            const payload = {
                number: this.config.whatsapp.targetNumber, // ou phone
                phone: this.config.whatsapp.targetNumber,
                message: message,
                text: message
            };

            const headers = {};
            if (this.config.whatsapp.authKey) {
                headers['Authorization'] = this.config.whatsapp.authKey;
                headers['apikey'] = this.config.whatsapp.authKey; // Alguns usam apikey
            }

            await axios.post(this.config.whatsapp.apiUrl, payload, { headers });
            return true;
        } catch (error) {
            console.error('Erro ao enviar WhatsApp:', error.message);
            return false;
        }
    }

    async notifyAll(title, message, level = 'info') {
        const icon = level === 'danger' ? '🚨' : level === 'warning' ? '⚠️' : 'ℹ️';
        const formattedMessage = `*${icon} VPS Dashboard - ${title}*\n\n${message}`;

        const results = await Promise.allSettled([
            this.sendTelegram(formattedMessage),
            this.sendWhatsApp(formattedMessage) // Envia o mesmo texto formatado (WhatsApp tbm suporta Markdown básico)
        ]);

        return results;
    }
}

module.exports = new NotificationService();
