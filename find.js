const TARGET_GUILD_ID = '871405550703878187'; 
const TARGET_CHANNEL_IDS = [
    '1430028232920535090', 
    '1428647247779987578'
]; 
const NOTIFY_GUILD_ID = '1401622759582466229'; 

const MENTION_CONFIGS = {
    '<@&1428636454036176899>': '1430308350209560721', 
    '<@&1428636438815309834>': '1430308351958323210', 
    '<@&1428636298746396774>': '1430308353413742807', 
};

const ROLE_MENTION_REGEX = /<@&\d+>/g;

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        try {
            if (!message.guild || message.author.id === client.user.id) return;
            
            if (message.guild.id !== TARGET_GUILD_ID) return;
            
            if (!TARGET_CHANNEL_IDS.includes(message.channel.id)) return;

            for (const [TARGET_ROLE_MENTION, NOTIFY_CHANNEL_ID] of Object.entries(MENTION_CONFIGS)) {
                
                if (message.content.includes(TARGET_ROLE_MENTION)) {
                    
                    const notifyGuild = client.guilds.cache.get(NOTIFY_GUILD_ID);
                    if (!notifyGuild) {
                        console.error(`❌ ไม่พบกิลด์ปลายทาง: ${NOTIFY_GUILD_ID}`);
                        continue; 
                    }
                    const notifyChannel = notifyGuild.channels.cache.get(NOTIFY_CHANNEL_ID);
                    if (!notifyChannel) {
                        console.error(`❌ ไม่พบช่องปลายทาง: ${NOTIFY_CHANNEL_ID} สำหรับ Role ${TARGET_ROLE_MENTION}`);
                        continue; 
                    }

                    const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
                    
                    const cleanedContent = message.content
                        .replace(ROLE_MENTION_REGEX, '')
                        .trim();
                    
                    const notificationMessage = `<@${message.author.id}> : ${cleanedContent}\n[ ${messageLink} ]`;

                    await notifyChannel.send({ content: notificationMessage }).catch(e => {
                        console.error(`❌ ส่งข้อความแจ้งเตือน Role ${TARGET_ROLE_MENTION} ไม่สำเร็จ:`, e);
                    });

                    console.log(`✅ ส่งการแจ้งเตือน Role ${TARGET_ROLE_MENTION} จาก ${message.author.tag} ไปยังช่อง ${NOTIFY_CHANNEL_ID}`);
                    
                    break;
                }
            }
        } catch (e) {
            console.error('❌ Mention Detector Error:', e);
        }
    });
};