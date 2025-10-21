const twapi = require("@opecgame/twapi"); 

module.exports = (client, config) => {
    const { TARGET_GUILD, TARGET_CHANNEL, TMN_REGEX, TEST_USER_ID, extractGiftInput } = config;

    client.on('messageCreate', async (message) => {
        try {
            if (!message.guild || 
                message.author.id === client.user.id || 
                message.guild.id !== TARGET_GUILD || 
                message.channel.id !== TARGET_CHANNEL) 
            {
                if (message.author.id === TEST_USER_ID && message.content.trim() === '!test') {
                    await message.channel.send('บอทกำลังทำงานอยู่ครับ').catch(e => console.error('❌ ตอบ !test ไม่สำเร็จ:', e));
                    console.log(`✅ ตอบ !test ให้ ${message.author.tag}`);
                }
                return; 
            }

            const match = (message.content || '').match(TMN_REGEX);
            
            if (!match) return;
            
            const linkOrCode = extractGiftInput(match[1]); 
            const phoneUsed = process.env.TRUEWALLET_PHONE; 
            
            if (!phoneUsed) {
                console.error('❌ TRUEWALLET_PHONE ไม่ถูกตั้งค่าใน .env');
                return; 
            }

            console.log('====================================================');
            console.log(`🔎 พบลิงก์ Angpao: ${linkOrCode} (เบอร์: ${phoneUsed.slice(0, 3)}xxxxx${phoneUsed.slice(-2)})`); 
            
            try {
                let res;
                try {
                    res = await twapi(linkOrCode, phoneUsed); 
                } catch (e) {
                    console.error('❌ twapi call failed:', e.message);
                    return; 
                }

                const status = res?.status?.code || "UNKNOWN";
                const amount = Number(res?.data?.my_ticket?.amount_baht ?? 0);
                const messageFromApi = res?.message || 'No message';

                if (status === "SUCCESS") {
                    await message.channel.send(`ขอบคุณค้าบบ ได้มา ${amount.toLocaleString("th-TH")} บาท`).catch(e => console.error('❌ ส่งข้อความสำเร็จไม่สำเร็จ:', e));
                    console.log(`✅ รับสำเร็จ: ${amount} บาท`); 
                } else {
                    const errorDetail = messageFromApi.includes('ซองของขวัญถูกรับไปแล้ว') ? 'ซองถูกรับไปแล้ว' : messageFromApi;
                    await message.channel.send(`ไม่ได้อ่าาา`).catch(e => console.error('❌ ส่งข้อความล้มเหลวไม่สำเร็จ:', e));
                    console.warn(`❌ Redeem Failed. Status: ${status}. Message: ${errorDetail}`);
                }
            } catch (err) {
                console.error('❌ Redeem flow error (Unhandled):', err);
            }
        } catch (e) {
            console.error('❌ Global handler error:', e);
        }
    });
};