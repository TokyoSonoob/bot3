const twapi = require("@opecgame/twapi");

module.exports = (client, config) => {
    const { TARGET_GUILD, TARGET_CHANNEL, TMN_REGEX, TEST_USER_ID, extractGiftInput } = config;

    // ❗ ตั้งหลายเบอร์ได้ที่นี่
    const PHONE_LIST = [
        process.env.TRUEWALLET_PHONE_1,
        process.env.TRUEWALLET_PHONE_2
    ].filter(Boolean); // กรองเบอร์ที่ undefined ออก

    client.on('messageCreate', async (message) => {
        try {
            if (!message.guild ||
                message.author.id === client.user.id ||
                message.guild.id !== TARGET_GUILD ||
                message.channel.id !== TARGET_CHANNEL) 
            {
                // คำสั่ง test ใช้ได้เหมือนเดิม แต่ไม่ส่งข้อความกลับแล้ว
                if (message.author.id === TEST_USER_ID && message.content.trim() === '!test') {
                    console.log(`🧪 TEST OK — Bot is running (from ${message.author.tag})`);
                }
                return;
            }

            const match = (message.content || '').match(TMN_REGEX);
            if (!match) return;

            const linkOrCode = extractGiftInput(match[1]);
            console.log("====================================================");
            console.log(`🔎 Found Angpao link: ${linkOrCode}`);

            // ❗ ถ้าไม่มีเบอร์เลยให้แจ้งใน log
            if (PHONE_LIST.length === 0) {
                console.error("❌ No TRUEWALLET_PHONE_1 / TRUEWALLET_PHONE_2 set in .env");
                return;
            }

            let redeemed = false;

            // 🔁 ลองทีละเบอร์จนกว่าจะสำเร็จ
            for (const phone of PHONE_LIST) {
                try {
                    console.log(`📲 Trying redeem with phone: ${phone}`);

                    const res = await twapi(linkOrCode, phone).catch(e => {
                        console.error(`❌ TWAPI error for ${phone}:`, e.message);
                        return null;
                    });

                    if (!res) continue;

                    const status = res?.status?.code || "UNKNOWN";
                    const amount = Number(res?.data?.my_ticket?.amount_baht ?? 0);
                    const msgApi = res?.message || '';

                    if (status === "SUCCESS") {
                        console.log(`🎉 SUCCESS! Phone ${phone} received: ${amount} Baht`);
                        redeemed = true;
                        break; // สำเร็จแล้ว ไม่ต้องลองเบอร์อื่น
                    } else {
                        console.warn(`⚠️ Failed for ${phone}: ${msgApi}`);
                    }

                } catch (err) {
                    console.error(`❌ Error during redeem loop for ${phone}:`, err.message);
                }
            }

            if (!redeemed) {
                console.warn("❌ All phones failed to redeem this angpao.");
            }

        } catch (e) {
            console.error("❌ Global handler error:", e);
        }
    });
};
