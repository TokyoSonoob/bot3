// === CONFIGURATION (เฉพาะส่วนที่เกี่ยวข้องกับการจองเวลา) ===
const TARGET_GUILD_ID = '1301751195731230782';
const TARGET_ANNOUNCE_CHANNEL_ID = '1420428525395120178'; 
const MESSAGE_CONTENT = 'จองฮ้าฟฟฟฟ';

const TARGET_MILLISECOND_C1 = 1550;
const TARGET_MILLISECOND_C2 = TARGET_MILLISECOND_C1 - 100;
const TIME_REGEX = /พิมพ์ตอน\s*(\d{1,2}:\d{2})/i;
const MESSAGE_FETCH_LIMIT = 20;

// === HELPER FUNCTIONS ===
const scheduleExecution = (client, clientName, hour, minute, targetMS, threadId) => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(hour, minute, 0, targetMS);
    
    const delayMs = target.getTime() - now.getTime();
    const targetTimeFormatted = `${hour}:${minute}:00.${targetMS}`;

    if (delayMs <= 0) {
        return null; 
    }

    console.log(`[Timer Setup - ${clientName}] ⏱️ ตั้งเวลาส่งข้อความใน ${delayMs}ms (เวลาเป้าหมาย ${targetTimeFormatted})`);

    const timerId = setTimeout(async () => {
        const executionTime = new Date();
        
        try {
            const guild = client.guilds.cache.get(TARGET_GUILD_ID);
            let sendChannel = guild.channels.cache.get(threadId);

            if (!sendChannel || !sendChannel.messages) {
                console.error(`[Error - ${clientName}] ❌ ไม่พบ Thread ID ${threadId} เพื่อส่งข้อความ`);
                return;
            }

            await sendChannel.send(MESSAGE_CONTENT);
            
            const sendFinishTime = new Date();
            const executionDelta = sendFinishTime.getTime() - executionTime.getTime();

            console.log(`[Success - ${clientName}] ✅ ส่งข้อความ "${MESSAGE_CONTENT}" ไปยัง Thread: ${sendChannel.name} สำเร็จ!`);
            console.log(`[Latency - ${clientName}] 🚀 ใช้เวลาส่ง (Internal + Discord) ${executionDelta}ms`);
            
        } catch (e) {
            console.error(`[Error - ${clientName}] ❌ เกิดข้อผิดพลาดในการส่งข้อความ:`, e.message);
        }
    }, delayMs);

    return timerId;
};

// === MAIN CHECKER LOGIC ===
async function checkAndSetLatestTime(client1, client2, sourceEvent, todayTimers) {
    console.log(`\n--- เริ่มต้นการตรวจสอบกิจกรรมและรีเซ็ต Timer (Source: ${sourceEvent}) ---`);
    
    // *** การแก้ไขปัญหา TypeError: เพิ่มการตรวจสอบ Array ***
    if (Array.isArray(todayTimers)) {
        todayTimers.forEach(clearTimeout);
        todayTimers.length = 0; // รีเซ็ต Array
    } else {
        console.error("[ERROR] todayTimers ไม่ใช่ Array! ไม่สามารถเคลียร์ Timer ได้");
        return; 
    }
    // ******************************************************

    const guild = client1.guilds.cache.get(TARGET_GUILD_ID);
    if (!guild) {
        console.error(`[Error - Check] ❌ ไม่พบ Guild ID ${TARGET_GUILD_ID} ใน Cache`);
        return;
    }
    
    let parentChannel = guild.channels.cache.get(TARGET_ANNOUNCE_CHANNEL_ID);
    
    let channelsToScan = [];
    if (parentChannel && parentChannel.messages) {
        // Case 1: Standard Text Channel
        channelsToScan.push(parentChannel);
    } else if (parentChannel && parentChannel.threads) {
        // Case 2: Forum/Container Channel - สแกนทุก Thread ที่ใช้งานอยู่
        try {
            const fetchedThreads = await parentChannel.threads.fetch({ limit: 50 });
            channelsToScan = Array.from(fetchedThreads.threads.values());
            
            if (channelsToScan.length === 0) {
                 console.log('[Info - Check] ⚠️ ไม่พบ Thread ที่ใช้งานอยู่ภายใน Forum Channel');
            } else {
                 console.log(`[Info - Check] 🔄 พบ ${channelsToScan.length} Thread ที่ใช้งานอยู่ภายใน Forum Channel`);
            }
        } catch (threadFetchError) {
            console.error(`[Error - Check] ❌ ไม่สามารถ Fetch Threads จาก Channel ได้:`, threadFetchError.message);
            return;
        }
    } else {
        console.error(`[Error - Check] ❌ Channel ID ${TARGET_ANNOUNCE_CHANNEL_ID} ไม่ใช่ Text Channel หรือ Forum Channel ที่ถูกต้อง`);
        return;
    }
    
    const now = new Date();
    const todayDateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');

    const validTodayTargets = [];

    // --- Start Iteration Over Channels/Threads ---
    for (const channel of channelsToScan) {
        if (!channel.messages) continue; 
        
        try {
            const messages = await channel.messages.fetch({ limit: MESSAGE_FETCH_LIMIT });

            messages.forEach(message => {
                const messageDate = message.createdAt;
                const messageDateStr = messageDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');

                if (messageDateStr !== todayDateStr) return;

                const match = message.content.match(TIME_REGEX);
                if (!match) return;

                const timeString = match[1]; 
                const [hour, minute] = timeString.split(':').map(Number);
                
                if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                    const announceTime = new Date(now);
                    announceTime.setHours(hour, minute, 0, 0);

                    if (announceTime.getTime() > now.getTime()) {
                        validTodayTargets.push({ 
                            hour, 
                            minute, 
                            threadId: channel.id,
                            threadName: channel.name 
                        });
                        console.log(`[Found Target] 🔎 พบกิจกรรมที่ยังไม่ถึงเวลา ${timeString} ใน Thread: ${channel.name} (${channel.id})`);
                    }
                }
            });
        } catch (e) {
            console.error(`[Error - Fetch] ❌ ข้อผิดพลาดในการดึงข้อความจาก Channel/Thread ${channel.id}:`, e.message);
        }
    }
    // --- End Iteration ---
    
    if (validTodayTargets.length > 0) {
        console.log(`[Info - Check] 🔔 พบ ${validTodayTargets.length} เวลาประกาศที่ยังไม่ถึงวันนี้ กำลังตั้ง Timer...`);

        validTodayTargets.forEach(target => {
            const timerId1 = scheduleExecution(client1, 'Client 1', target.hour, target.minute, TARGET_MILLISECOND_C1, target.threadId);
            const timerId2 = scheduleExecution(client2, 'Client 2', target.hour, target.minute, TARGET_MILLISECOND_C2, target.threadId);
            
            if (timerId1) todayTimers.push(timerId1);
            if (timerId2) todayTimers.push(timerId2);
        });
        console.log(`[Success - Check] ✅ ตั้ง Timer ใหม่ทั้งหมด ${todayTimers.length} รายการสำหรับ ${validTodayTargets.length} กิจกรรมวันนี้สำเร็จ.`);
    } else {
        console.log('[Info - Check] ⚠️ ไม่พบเวลาประกาศที่ยังไม่ถึงวันนี้ หรือทุกกิจกรรมเลยเวลาไปแล้ว.');
    }
}


// === EXPORT MODULE (Event Listeners) ===
module.exports = (client1, client2, todayTimers) => {
    
    // เริ่มการตรวจสอบครั้งแรกหลังจาก ready event ใน index.js
    setTimeout(() => {
        // ตรวจสอบว่า client2 พร้อมหรือไม่ ก่อนที่จะรัน Logic
        if (client2.user) {
            checkAndSetLatestTime(client1, client2, 'Initial Run', todayTimers);
        } else {
            console.log("[Info] Client 2 ยังไม่พร้อม, ข้ามการตรวจสอบครั้งแรก");
        }
    }, 1000); 

    // 1. ตรวจสอบเมื่อมีข้อความใหม่ (ใน Channel หลัก หรือ Thread)
    client1.on('messageCreate', (message) => {
        // ต้องแน่ใจว่าทั้งสอง client พร้อม
        if (!client2.user || message.author.id === client1.user.id || message.guildId !== TARGET_GUILD_ID) return;
        
        if (message.channelId === TARGET_ANNOUNCE_CHANNEL_ID || message.channel.parentId === TARGET_ANNOUNCE_CHANNEL_ID) {
            checkAndSetLatestTime(client1, client2, 'messageCreate', todayTimers);
        }
    });

    // 2. ตรวจสอบเมื่อมีการแก้ไขข้อความ (ใน Channel หลัก หรือ Thread)
    client1.on('messageUpdate', (oldMessage, newMessage) => {
        if (!client2.user || newMessage.author.id === client1.user.id || newMessage.guildId !== TARGET_GUILD_ID) return;

        if (newMessage.channelId === TARGET_ANNOUNCE_CHANNEL_ID || newMessage.channel.parentId === TARGET_ANNOUNCE_CHANNEL_ID) {
            checkAndSetLatestTime(client1, client2, 'messageUpdate', todayTimers);
        }
    });

    // 3. ตรวจสอบเมื่อมีการสร้าง Thread ใหม่ (Post ใหม่ใน Forum)
    client1.on('threadCreate', (thread) => {
        if (!client2.user || thread.guildId !== TARGET_GUILD_ID || thread.parentId !== TARGET_ANNOUNCE_CHANNEL_ID) return;
        
        checkAndSetLatestTime(client1, client2, 'threadCreate', todayTimers);
    });

    // 4. ตรวจสอบเมื่อมีการแก้ไข/ปิด Thread (รวมถึงการแก้ไขชื่อ Thread ที่อาจมีเวลาอยู่)
    client1.on('threadUpdate', (oldThread, newThread) => {
        if (!client2.user || newThread.guildId !== TARGET_GUILD_ID || newThread.parentId !== TARGET_ANNOUNCE_CHANNEL_ID) return;

        checkAndSetLatestTime(client1, client2, 'threadUpdate', todayTimers);
    });
};
