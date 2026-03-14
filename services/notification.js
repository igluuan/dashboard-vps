const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../notification-config.json');

// Default config
let config = {
    telegram: {
        enabled: false,
        botToken: '',
        chatId: ''
    },
    whatsapp: {
        enabled: false,
        apiUrl: 'https://api.callmebot.com/whatsapp.php',
        apiKey: '', // CallMeBot API Key
        phone: ''   // Phone number including country code
    },
    cooldown: 30 // minutes between same alerts
};

// Load config from file if exists
if (fs.existsSync(CONFIG_FILE)) {
    try {
        const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        config = { ...config, ...savedConfig };
    } catch (e) {
        console.error('Error loading notification config:', e);
    }
}

const saveConfig = () => {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving notification config:', e);
        return false;
    }
};

const sendTelegram = async (message) => {
    if (!config.telegram.enabled || !config.telegram.botToken || !config.telegram.chatId) {
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
        await axios.post(url, {
            chat_id: config.telegram.chatId,
            text: message,
            parse_mode: 'Markdown'
        });
        return true;
    } catch (error) {
        console.error('Telegram notification error:', error.message);
        return false;
    }
};

const sendWhatsapp = async (message) => {
    if (!config.whatsapp.enabled || !config.whatsapp.apiKey || !config.whatsapp.phone) {
        return false;
    }

    try {
        // Default implementation for CallMeBot (Free API for personal use)
        // URL: https://api.callmebot.com/whatsapp.php?phone=[phone]&text=[text]&apikey=[apikey]
        
        // Encode message for URL
        const encodedMessage = encodeURIComponent(message);
        
        let url = config.whatsapp.apiUrl;
        if (url.includes('callmebot')) {
            url = `${url}?phone=${config.whatsapp.phone}&text=${encodedMessage}&apikey=${config.whatsapp.apiKey}`;
            await axios.get(url);
        } else {
            // Generic webhook implementation (POST)
            await axios.post(url, {
                phone: config.whatsapp.phone,
                message: message,
                apikey: config.whatsapp.apiKey
            });
        }
        
        return true;
    } catch (error) {
        console.error('WhatsApp notification error:', error.message);
        return false;
    }
};

const sendNotification = async (title, message, level = 'info') => {
    const formattedMessage = `*${title}*\n\n${message}\n\nLevel: ${level}`;
    
    const results = {
        telegram: false,
        whatsapp: false
    };

    if (config.telegram.enabled) {
        results.telegram = await sendTelegram(formattedMessage);
    }

    if (config.whatsapp.enabled) {
        results.whatsapp = await sendWhatsapp(formattedMessage);
    }

    return results;
};

module.exports = {
    getConfig: () => config,
    updateConfig: (newConfig) => {
        config = { ...config, ...newConfig };
        return saveConfig();
    },
    sendNotification
};
