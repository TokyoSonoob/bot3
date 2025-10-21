// dm-responder.js

const repliedUsers = new Map();
const REPLY_DELAY_MS = 10000;
const REPLY_MESSAGE = "เดี๋ยวมาน้าา ตอนนี้ยังมะว่างง";

module.exports = (client) => {

    client.on('friendRequest', async (user) => {
        try {
            await user.accept();
            console.log(`✅ รับแอดเพื่อนจาก ${user.tag} แล้ว`);
        } catch (e) {
            console.error(`❌ Error รับแอดเพื่อนจาก ${user.tag}:`, e);
        }
    });

    client.on('messageCreate', async (message) => {
        if (!message.guild && message.author.id !== client.user.id) {
            
            const userId = message.author.id;

            if (repliedUsers.has(userId)) {
                return;
            }
            
            repliedUsers.set(userId, true);

            console.log(`⏱️ ได้รับ DM จาก ${message.author.tag} จะตอบกลับ (ครั้งแรก) ใน 10 วินาที...`);
            
            setTimeout(async () => {
                try {
                    await message.reply({ content: REPLY_MESSAGE });
                    console.log(`✅ ตอบกลับ DM หา ${message.author.tag} แล้ว`);
                } catch (e) {
                    console.error(`❌ Error ส่ง DM ตอบกลับหา ${message.author.tag}:`, e);
                    repliedUsers.delete(userId); 
                }
            }, REPLY_DELAY_MS);
        }
    });
};