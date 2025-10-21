const axios = require('axios');

const TARGET_GUILD_ID = '871405550703878187';
const TARGET_CHANNEL_ID = '1430028232920535090';
const NOTIFY_GUILD_ID = '1401622759582466229'; 
const NOTIFY_CHANNEL_ID = '1401627069393272912'; 
const URL_TO_FETCH = 'https://raw.githubusercontent.com/TokyoSonoob/bot3/refs/heads/main/word.txt';
const INTERVAL_MS = 5 * 60 * 1000;

async function fetchAndSend(client) {
    let fetchedText;
    let sentMessage;

    try {
        const response = await axios.get(URL_TO_FETCH);
        fetchedText = (response.data || '').trim();
        if (!fetchedText) {
            console.warn(`⚠️ Warning: ไม่พบข้อความใน ${URL_TO_FETCH}`);
            return;
        }
    } catch (e) {
        console.error(`❌ Error fetching URL ${URL_TO_FETCH}:`, e.message);
        return;
    }

    try {
        const targetGuild = client.guilds.cache.get(TARGET_GUILD_ID);
        const targetChannel = targetGuild?.channels.cache.get(TARGET_CHANNEL_ID);

        if (!targetChannel) {
            console.error(`❌ Error: ไม่พบช่องเป้าหมาย ${TARGET_CHANNEL_ID} ในกิลด์ ${TARGET_GUILD_ID}`);
            return;
        }
        
        sentMessage = await targetChannel.send(fetchedText);
        console.log(`✅ ส่งข้อความสำเร็จไปยัง ${targetChannel.name}: ${fetchedText.substring(0, 50)}...`);

    } catch (e) {
        console.error('❌ Error sending message to target channel:', e);
        return;
    }

    try {
        const notifyGuild = client.guilds.cache.get(NOTIFY_GUILD_ID);
        const notifyChannel = notifyGuild?.channels.cache.get(NOTIFY_CHANNEL_ID);

        if (!notifyChannel) {
            console.error(`❌ Error: ไม่พบช่องแจ้งเตือน ${NOTIFY_CHANNEL_ID} ในกิลด์ ${NOTIFY_GUILD_ID}`);
            return;
        }

        const messageLink = sentMessage.url;
        const notificationContent = `${fetchedText.substring(0, 500)}\n[ ${messageLink} ]`;
        
        await notifyChannel.send(notificationContent);
        console.log(`✅ แจ้งเตือนการส่งสำเร็จไปยัง ${notifyChannel.name}`);

    } catch (e) {
        console.error('❌ Error sending notification message:', e);
    }
}

module.exports = (client) => {
    client.once('ready', () => {
        fetchAndSend(client);
        setInterval(() => fetchAndSend(client), INTERVAL_MS);
        console.log(`⏱️ Word Sender: ตั้งเวลาการส่งข้อความใหม่ทุกๆ ${INTERVAL_MS / 60000} นาที`);
    });
};