const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
require("dotenv").config();

const PRIMARY_NAME = "bot4seamuww";
const SECONDARY_NAME = "bot4seamuwwx";
const LOGIN_TIMEOUT_MS = Number(process.env.DISCORD_LOGIN_TIMEOUT_MS || 12000);
const RETRY_AFTER_FAIL_MS = Number(process.env.DISCORD_RETRY_AFTER_FAIL_MS || 20000);
const PEER_CHECK_INTERVAL_MS = Number(process.env.PEER_CHECK_INTERVAL_MS || 8000);
const PRIMARY_CHECK_TIMEOUT_MS = Number(process.env.PRIMARY_CHECK_TIMEOUT_MS || 4000);
const LOG_GUILD_ID = "1438723080246788239";
const LOG_CHANNEL_ID = "1438730644288176229";

function detectSelfName() {
  const raw = [
    process.env.APP_INSTANCE_NAME,
    process.env.RENDER_SERVICE_NAME,
    process.env.RENDER_EXTERNAL_HOSTNAME,
    process.env.RENDER_INTERNAL_HOSTNAME,
    process.env.URL,
    process.env.RENDER_GIT_COMMIT,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (raw.includes(SECONDARY_NAME)) return SECONDARY_NAME;
  if (raw.includes(PRIMARY_NAME)) return PRIMARY_NAME;

  const host = require("os").hostname().toLowerCase();
  if (host.includes(SECONDARY_NAME)) return SECONDARY_NAME;
  return PRIMARY_NAME;
}

const SELF_NAME = detectSelfName();
const IS_PRIMARY = SELF_NAME === PRIMARY_NAME;
const PEER_NAME = IS_PRIMARY ? SECONDARY_NAME : PRIMARY_NAME;
const PRIMARY_STATUS_URL = process.env.PRIMARY_BOT_STATUS_URL || `https://${PRIMARY_NAME}.onrender.com/__bot/status`;
const PEER_STATUS_URL = IS_PRIMARY
  ? `https://${SECONDARY_NAME}.onrender.com/__bot/status`
  : PRIMARY_STATUS_URL;

const runtime = {
  name: SELF_NAME,
  host: process.env.RENDER_EXTERNAL_HOSTNAME || `${SELF_NAME}.onrender.com`,
  role: IS_PRIMARY ? "primary" : "secondary",
  desiredRole: "standby",
  workingHost: "unknown",
  active: false,
  loginState: "idle", // idle | logging_in | ready | unavailable
  discordReady: false,
  discordUser: null,
  lastLoginAttemptAt: null,
  lastLoginSuccessAt: null,
  lastDisconnectAt: null,
  lastError: null,
  lastCommand: null,
  peer: {
    name: PEER_NAME,
    statusUrl: PEER_STATUS_URL,
    reachable: null,
    discordReady: null,
    active: null,
    role: null,
    workingHost: null,
    checkedAt: null,
    error: null,
  },
  logs: [],
  startedAt: new Date().toISOString(),
  getPublicStatus: null,
};

global.BOT_RUNTIME = runtime;

function pushLog(type, message, extra = null) {
  const item = {
    at: new Date().toISOString(),
    type,
    message,
    extra,
  };
  runtime.logs.unshift(item);
  if (runtime.logs.length > 60) runtime.logs.length = 60;
  const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${type}] ${message}${suffix}`);
}

function setLastError(err) {
  runtime.lastError = err ? String(err.message || err) : null;
}

function setLastCommand(command) {
  runtime.lastCommand = {
    at: new Date().toISOString(),
    command,
  };
}

function publicStatus() {
  return {
    name: runtime.name,
    host: runtime.host,
    role: runtime.role,
    desiredRole: runtime.desiredRole,
    active: runtime.active,
    workingHost: runtime.workingHost,
    loginState: runtime.loginState,
    discordReady: runtime.discordReady,
    discordUser: runtime.discordUser,
    lastLoginAttemptAt: runtime.lastLoginAttemptAt,
    lastLoginSuccessAt: runtime.lastLoginSuccessAt,
    lastDisconnectAt: runtime.lastDisconnectAt,
    lastError: runtime.lastError,
    lastCommand: runtime.lastCommand,
    peer: runtime.peer,
    startedAt: runtime.startedAt,
    now: new Date().toISOString(),
    uptimeMs: Date.now() - new Date(runtime.startedAt).getTime(),
    logs: runtime.logs.slice(0, 20),
  };
}
runtime.getPublicStatus = publicStatus;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.GuildMember, Partials.User],
});

process.on("unhandledRejection", (err) => {
  setLastError(err);
  pushLog("ERROR", "unhandledRejection", { error: String(err?.message || err) });
});
process.on("uncaughtException", (err) => {
  setLastError(err);
  pushLog("ERROR", "uncaughtException", { error: String(err?.message || err) });
});

require("./server");
const { db, admin } = require("./firebase");
require("./music")(client);
require("./welcome")(client);
require("./goodbye")(client);
require("./ticket")(client);
require("./addticket")(client);
require("./group")(client);
require("./room")(client);
require("./delete")(client);
require("./em")(client);
require("./verify")(client);
require("./invite")(client);
require("./private")(client);
require("./help")(client);
require("./sound")(client);
require("./fix")(client);
require("./move")(client);
require("./awaymove")(client);

/* ---------- helpers from original bot ---------- */
function buildReportEmbed() {
  const list = client.guilds.cache
    .map((g) => `**• ${g.name} | ${g.memberCount ?? "?"}**`)
    .join("\n")
    .slice(0, 3800);

  return new EmbedBuilder()
    .setTitle("Bot2x Tester")
    .setDescription(list || "ไม่มีเซิร์ฟเวอร์")
    .addFields({ name: "All Server", value: `**${client.guilds.cache.size}**`, inline: true })
    .setColor(0x7c3aed)
    .setTimestamp();
}

function buildGuildPanelEmbed(guild) {
  const me = guild.members.me;
  const joinedTs = me?.joinedTimestamp ? Math.floor(me.joinedTimestamp / 1000) : null;
  return new EmbedBuilder()
    .setTitle(`แผงควบคุม: ${guild.name}`)
    .setDescription("เลือกการทำงานจากปุ่มด้านล่าง หรือเลือกรับยศจากเมนู")
    .addFields(
      { name: "Guild", value: `${guild.name} \`(${guild.id})\``, inline: false },
      { name: "Members", value: `${guild.memberCount ?? "—"}`, inline: true },
      { name: "Bot Highest Role", value: `${me?.roles?.highest ?? "—"} (pos ${me?.roles?.highest?.position ?? "?"})`, inline: true },
      { name: "Bot joined at", value: joinedTs ? `<t:${joinedTs}:F> (<t:${joinedTs}:R>)` : "—", inline: false },
    )
    .setThumbnail(guild.iconURL({ size: 256 }) || client.user.displayAvatarURL({ size: 256 }))
    .setColor(0x7c3aed)
    .setTimestamp();
}

function buildGuildSelectRow() {
  const guilds = [...client.guilds.cache.values()]
    .sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0))
    .slice(0, 25);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("pick_guild_invite")
    .setPlaceholder("เลือกเซิร์ฟเวอร์เพื่อเปิดแผงควบคุม")
    .addOptions(
      guilds.map((g) => ({
        label: g.name.slice(0, 100),
        value: g.id,
        description: `Members: ${g.memberCount ?? "—"}`.slice(0, 100),
      }))
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildGuildActionRow(guildId) {
  const makeInvite = new ButtonBuilder()
    .setCustomId(`inv_make_invite:${guildId}`)
    .setLabel("สร้างลิงก์ถาวร")
    .setStyle(ButtonStyle.Success);

  const botInfo = new ButtonBuilder()
    .setCustomId(`inv_bot_info:${guildId}`)
    .setLabel("ข้อมูลบอท")
    .setStyle(ButtonStyle.Secondary);

  const leaveGuild = new ButtonBuilder()
    .setCustomId(`inv_leave_guild:${guildId}`)
    .setLabel("ให้ออกจากเซิร์ฟเวอร์นี้")
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(makeInvite, botInfo, leaveGuild);
}

function buildRoleSelectRow(guild) {
  const rolesArr = [...guild.roles.cache.values()]
    .filter((r) => r.id !== guild.id && !r.managed && r.editable)
    .sort((a, b) => b.position - a.position)
    .slice(0, 25);

  if (rolesArr.length === 0) return null;

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`inv_pick_role:${guild.id}`)
    .setPlaceholder("เลือกยศเพื่อรับ")
    .addOptions(
      rolesArr.map((r) => ({
        label: r.name.slice(0, 100),
        value: r.id,
        description: `pos ${r.position}`.slice(0, 100),
      }))
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildConfirmLeaveRow(guildId) {
  const yes = new ButtonBuilder()
    .setCustomId(`inv_leave_yes:${guildId}`)
    .setLabel("ยืนยันออก")
    .setStyle(ButtonStyle.Danger);

  const no = new ButtonBuilder()
    .setCustomId(`inv_leave_no:${guildId}`)
    .setLabel("ยกเลิก")
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(yes, no);
}

function findInviteChannel(guild) {
  const me = guild.members.me;
  const canInvite = (ch) =>
    ch?.isTextBased?.() &&
    ch.viewable &&
    me?.permissionsIn(ch)?.has(PermissionsBitField.Flags.CreateInstantInvite);

  if (guild.systemChannel && canInvite(guild.systemChannel)) return guild.systemChannel;
  return guild.channels.cache.find((ch) => ch.type === ChannelType.GuildText && canInvite(ch)) || null;
}

async function upsertLogMessage() {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const ref = db.collection("botLog").doc("presenceReport");
    const snap = await ref.get();
    const embed = buildReportEmbed();
    const components = [buildGuildSelectRow()];

    if (snap.exists && snap.data()?.messageId) {
      const msg = await channel.messages.fetch(snap.data().messageId).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed], components });
        return;
      }
    }

    const sent = await channel.send({ embeds: [embed], components });
    await ref.set(
      {
        guildId: LOG_GUILD_ID,
        channelId: LOG_CHANNEL_ID,
        messageId: sent.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error("upsertLogMessage error:", e);
  }
}

async function safeEditReply(interaction, data) {
  try {
    return await interaction.editReply(data);
  } catch (e1) {
    try {
      return await interaction.followUp({ ...data, ephemeral: true });
    } catch (e2) {
      console.error("safeEditReply error:", e1?.message || e1, e2?.message || e2);
    }
  }
}

/* ---------- failover logic ---------- */
let loginPromise = null;
let manageLoopRunning = false;

function updateWorkingHost() {
  if (IS_PRIMARY) {
    runtime.workingHost = runtime.discordReady ? PRIMARY_NAME : (runtime.peer.active ? runtime.peer.name || SECONDARY_NAME : "none");
  } else {
    runtime.workingHost = runtime.peer.discordReady ? PRIMARY_NAME : (runtime.discordReady ? SECONDARY_NAME : "none");
  }
}

function markIdle(reason = "standby") {
  runtime.active = false;
  runtime.desiredRole = "standby";
  if (!runtime.discordReady) runtime.loginState = "idle";
  updateWorkingHost();
  pushLog("STATE", `เข้าสถานะรอ`, { reason });
}

async function stopDiscord(reason = "standby") {
  if (!client.isReady() && client.ws.status === 0) {
    runtime.discordReady = false;
    runtime.discordUser = null;
    runtime.loginState = "idle";
    runtime.active = false;
    updateWorkingHost();
    return;
  }
  try {
    await client.destroy();
  } catch (_) {}
  runtime.discordReady = false;
  runtime.discordUser = null;
  runtime.lastDisconnectAt = new Date().toISOString();
  runtime.loginState = "idle";
  runtime.active = false;
  updateWorkingHost();
  pushLog("DISCORD", "หยุดการทำงาน Discord", { reason });
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "cache-control": "no-cache" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function checkPeerStatus() {
  if (IS_PRIMARY) {
    runtime.peer.checkedAt = new Date().toISOString();
    runtime.peer.reachable = true;
    runtime.peer.role = "secondary";
    runtime.peer.error = null;
    return runtime.peer;
  }

  try {
    const data = await fetchJsonWithTimeout(PRIMARY_STATUS_URL, PRIMARY_CHECK_TIMEOUT_MS);
    runtime.peer.reachable = true;
    runtime.peer.discordReady = !!data.discordReady;
    runtime.peer.active = !!data.active;
    runtime.peer.role = data.role || "primary";
    runtime.peer.workingHost = data.workingHost || null;
    runtime.peer.checkedAt = new Date().toISOString();
    runtime.peer.error = null;
    return runtime.peer;
  } catch (error) {
    runtime.peer.reachable = false;
    runtime.peer.discordReady = false;
    runtime.peer.active = false;
    runtime.peer.role = "primary";
    runtime.peer.workingHost = null;
    runtime.peer.checkedAt = new Date().toISOString();
    runtime.peer.error = String(error.message || error);
    return runtime.peer;
  } finally {
    updateWorkingHost();
  }
}

async function loginDiscord() {
  if (runtime.discordReady) return true;
  if (loginPromise) return loginPromise;

  loginPromise = (async () => {
    runtime.lastLoginAttemptAt = new Date().toISOString();
    runtime.loginState = "logging_in";
    runtime.desiredRole = "active";
    runtime.active = true;
    setLastError(null);
    pushLog("DISCORD", "กำลังลอง login Discord", { timeoutMs: LOGIN_TIMEOUT_MS });

    let readyHandler;
    let errorHandler;
    let timeoutId;

    try {
      await Promise.race([
        new Promise((resolve, reject) => {
          readyHandler = () => resolve(true);
          errorHandler = (err) => reject(err || new Error("Discord login failed"));
          client.once(Events.ClientReady, readyHandler);
          client.once(Events.Error, errorHandler);
          timeoutId = setTimeout(() => reject(new Error(`Discord login timeout after ${LOGIN_TIMEOUT_MS}ms`)), LOGIN_TIMEOUT_MS);
          client.login(process.env.token).catch(reject);
        }),
      ]);

      runtime.discordReady = true;
      runtime.discordUser = client.user?.tag || client.user?.username || null;
      runtime.lastLoginSuccessAt = new Date().toISOString();
      runtime.loginState = "ready";
      runtime.active = true;
      updateWorkingHost();
      pushLog("DISCORD", "เข้า Discord สำเร็จ", { user: runtime.discordUser });
      return true;
    } catch (error) {
      setLastError(error);
      runtime.discordReady = false;
      runtime.discordUser = null;
      runtime.loginState = "unavailable";
      runtime.active = false;
      runtime.lastDisconnectAt = new Date().toISOString();
      updateWorkingHost();
      pushLog("DISCORD", "เข้า Discord ไม่ได้", { error: String(error.message || error) });
      try { await client.destroy(); } catch (_) {}
      return false;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (readyHandler) client.off(Events.ClientReady, readyHandler);
      if (errorHandler) client.off(Events.Error, errorHandler);
      loginPromise = null;
    }
  })();

  return loginPromise;
}

async function ensurePrimaryBehavior() {
  runtime.desiredRole = "active";
  if (runtime.discordReady) {
    runtime.active = true;
    updateWorkingHost();
    return;
  }
  const ok = await loginDiscord();
  if (!ok) {
    runtime.active = false;
    runtime.desiredRole = "active";
    updateWorkingHost();
  }
}

async function ensureSecondaryBehavior() {
  const peer = await checkPeerStatus();

  if (peer.reachable && peer.discordReady) {
    runtime.desiredRole = "standby";
    if (runtime.discordReady) await stopDiscord("primary-ready");
    else markIdle("primary-ready");
    runtime.active = false;
    updateWorkingHost();
    return;
  }

  runtime.desiredRole = "active";
  const ok = await loginDiscord();
  if (!ok) {
    runtime.active = false;
    updateWorkingHost();
  }
}

async function manageRoleLoop() {
  if (manageLoopRunning) return;
  manageLoopRunning = true;
  pushLog("SYSTEM", "เริ่ม failover manager", { self: SELF_NAME, role: runtime.role });

  while (true) {
    try {
      if (IS_PRIMARY) await ensurePrimaryBehavior();
      else await ensureSecondaryBehavior();
    } catch (error) {
      setLastError(error);
      pushLog("ERROR", "manage loop error", { error: String(error.message || error) });
    }

    const waitMs = runtime.discordReady ? PEER_CHECK_INTERVAL_MS : RETRY_AFTER_FAIL_MS;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

/* ---------- discord events ---------- */
client.once(Events.ClientReady, async () => {
  runtime.discordReady = true;
  runtime.discordUser = client.user?.tag || client.user?.username || null;
  runtime.loginState = "ready";
  runtime.active = true;
  runtime.lastLoginSuccessAt = new Date().toISOString();
  updateWorkingHost();
  pushLog("DISCORD", `Logged in as ${runtime.discordUser}`);
  await upsertLogMessage();
});

client.on(Events.GuildCreate, async () => {
  if (runtime.discordReady) await upsertLogMessage();
});
client.on(Events.GuildDelete, async () => {
  if (runtime.discordReady) await upsertLogMessage();
});

client.on(Events.InteractionCreate, async (interaction) => {
  const interactionName = interaction.commandName || interaction.customId || interaction.type;
  setLastCommand(interactionName);

  if (interaction.isStringSelectMenu() && interaction.customId === "pick_guild_invite") {
    const guildId = interaction.values?.[0];
    const targetGuild = client.guilds.cache.get(guildId);
    if (!targetGuild) {
      return interaction.reply({ content: "❌ ไม่พบเซิร์ฟเวอร์เป้าหมาย", ephemeral: true });
    }
    const embed = buildGuildPanelEmbed(targetGuild);
    const buttons = buildGuildActionRow(guildId);
    const roleRow = buildRoleSelectRow(targetGuild);
    const components = roleRow ? [buttons, roleRow] : [buttons];
    return interaction.reply({ embeds: [embed], components, ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("inv_pick_role:")) {
    const guildId = interaction.customId.split(":")[1];
    const roleId = interaction.values?.[0];
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return interaction.reply({ content: "❌ ไม่พบเซิร์ฟเวอร์เป้าหมาย", ephemeral: true });
    }

    const me = guild.members.me;
    if (!me?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: "❌ บอทไม่มีสิทธิ์ Manage Roles ในเซิร์ฟเวอร์นี้", ephemeral: true });
    }

    const role = await guild.roles.fetch(roleId).catch(() => null);
    if (!role || !role.editable || role.managed || role.id === guild.id) {
      return interaction.reply({ content: "❌ ยศนี้ไม่สามารถมอบได้", ephemeral: true });
    }

    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: "❌ คุณไม่ได้เป็นสมาชิกของเซิร์ฟเวอร์นี้", ephemeral: true });
    }

    if (me.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
      return interaction.reply({ content: "❌ ลำดับยศของคุณสูงกว่าหรือเท่ากับบอท", ephemeral: true });
    }

    if (member.roles.cache.has(role.id)) {
      const embed = new EmbedBuilder()
        .setTitle("คุณมียศนี้อยู่แล้ว")
        .setDescription(`${role} อยู่ในรายชื่อยศของคุณแล้ว`)
        .setColor(0xf59e0b)
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      await member.roles.add(role, `Self pick via panel: ${interaction.user.tag}`);
      const embed = new EmbedBuilder()
        .setTitle("มอบยศสำเร็จ")
        .setDescription(`ได้รับยศ ${role} ใน **${guild.name}** แล้ว`)
        .setColor(0x22c55e)
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (e) {
      console.error("grant role error:", e);
      return interaction.reply({ content: "❌ มอบยศไม่สำเร็จ (ตรวจสิทธิ์/ลำดับยศ)", ephemeral: true });
    }
  }

  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith("inv_make_invite:")) {
    await interaction.deferUpdate().catch(() => {});
    const guildId = interaction.customId.split(":")[1];
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return safeEditReply(interaction, { content: "❌ ไม่พบเซิร์ฟเวอร์เป้าหมาย", components: [] });

    const ch = findInviteChannel(guild);
    if (!ch) {
      const embed = new EmbedBuilder()
        .setTitle("สร้างลิงก์เชิญไม่สำเร็จ")
        .setDescription(`บอทต้องมีสิทธิ์ **Create Invite** ใน **${guild.name}**`)
        .setColor(0xef4444);
      const components = [buildGuildActionRow(guildId)];
      const roleRow = buildRoleSelectRow(guild);
      if (roleRow) components.push(roleRow);
      return safeEditReply(interaction, { embeds: [embed], components });
    }

    try {
      const invite = await ch.createInvite({ maxAge: 0, maxUses: 0, unique: true });
      const url = invite.url ?? `https://discord.gg/${invite.code}`;
      const embed = new EmbedBuilder()
        .setTitle("ลิงก์เชิญถาวร")
        .setDescription(`[กดดิวะ](${url})`)
        .setColor(0x10b981)
        .setTimestamp();
      const components = [buildGuildActionRow(guildId)];
      const roleRow = buildRoleSelectRow(guild);
      if (roleRow) components.push(roleRow);
      return safeEditReply(interaction, { embeds: [embed], components });
    } catch (e) {
      console.error("createInvite error:", e);
      const embed = new EmbedBuilder()
        .setTitle("สร้างลิงก์เชิญไม่สำเร็จ")
        .setDescription(`ตรวจสอบสิทธิ์ **Create Invite** ใน **${guild.name}**`)
        .setColor(0xef4444);
      const components = [buildGuildActionRow(guildId)];
      const roleRow = buildRoleSelectRow(guild);
      if (roleRow) components.push(roleRow);
      return safeEditReply(interaction, { embeds: [embed], components });
    }
  }

  if (interaction.customId.startsWith("inv_bot_info:")) {
    await interaction.deferUpdate().catch(() => {});
    const guildId = interaction.customId.split(":")[1];
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return safeEditReply(interaction, { content: "❌ ไม่พบเซิร์ฟเวอร์เป้าหมาย", components: [] });

    const me = guild.members.me || (await guild.members.fetch(client.user.id).catch(() => null));
    if (!me) return safeEditReply(interaction, { content: "❌ ไม่พบข้อมูลบอทในเซิร์ฟเวอร์นี้", components: [] });

    const roles = me.roles.cache.filter((r) => r.id !== guild.id).sort((a, b) => b.position - a.position);
    const topRoles = roles.first(5).map((r) => `${r} (${r.position})`).join(", ") || "—";
    const joinedTs = me.joinedTimestamp ? Math.floor(me.joinedTimestamp / 1000) : null;
    const check = (flag) => (me.permissions.has(flag) ? "✅" : "❌");
    const permsSummary = [
      `${check(PermissionsBitField.Flags.Administrator)} Administrator`,
      `${check(PermissionsBitField.Flags.ManageGuild)} Manage Guild`,
      `${check(PermissionsBitField.Flags.ManageRoles)} Manage Roles`,
      `${check(PermissionsBitField.Flags.ManageChannels)} Manage Channels`,
      `${check(PermissionsBitField.Flags.ViewAuditLog)} View Audit Log`,
      `${check(PermissionsBitField.Flags.CreateInstantInvite)} Create Invite`,
    ].join(" • ");

    const embed = new EmbedBuilder()
      .setTitle(`ข้อมูลบอทใน ${guild.name}`)
      .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
      .setColor(me.roles.highest?.color || 0x7c3aed)
      .addFields(
        { name: "Display Name", value: me.displayName || "—", inline: true },
        { name: "เข้าร่วม", value: joinedTs ? `<t:${joinedTs}:F> (<t:${joinedTs}:R>)` : "—", inline: false },
        { name: "Highest Role", value: `${me.roles.highest ?? "—"} (pos ${me.roles.highest?.position ?? "?"})`, inline: false },
        { name: "จำนวนยศ", value: `${roles.size}`, inline: true },
        { name: "ยศบนสุด", value: topRoles, inline: false },
        { name: "สิทธิ์หลัก", value: permsSummary, inline: false },
      )
      .setFooter({ text: `Guild ID: ${guild.id}` })
      .setTimestamp();

    const components = [buildGuildActionRow(guildId)];
    const roleRow = buildRoleSelectRow(guild);
    if (roleRow) components.push(roleRow);

    return safeEditReply(interaction, { embeds: [embed], components });
  }

  if (interaction.customId.startsWith("inv_leave_guild:")) {
    await interaction.deferUpdate().catch(() => {});
    const guildId = interaction.customId.split(":")[1];
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return safeEditReply(interaction, { content: "❌ ไม่พบเซิร์ฟเวอร์เป้าหมาย", components: [] });

    const embed = new EmbedBuilder()
      .setTitle("ยืนยันการออกจากเซิร์ฟเวอร์")
      .setDescription(`**ต้องการให้บอทออกจาก ${guild.name} ป่าว**`)
      .setColor(0xf59e0b);

    const row = buildConfirmLeaveRow(guildId);
    return safeEditReply(interaction, { embeds: [embed], components: [row] });
  }

  if (interaction.customId.startsWith("inv_leave_no:")) {
    await interaction.deferUpdate().catch(() => {});
    const guildId = interaction.customId.split(":")[1];
    const guild = client.guilds.cache.get(guildId);
    const embed = guild ? buildGuildPanelEmbed(guild) : new EmbedBuilder().setTitle("เลือกเซิร์ฟเวอร์ใหม่").setColor(0x7c3aed);
    const buttons = buildGuildActionRow(guildId);
    const roleRow = guild ? buildRoleSelectRow(guild) : null;
    const components = roleRow ? [buttons, roleRow] : [buttons];
    return safeEditReply(interaction, { embeds: [embed], components });
  }

  if (interaction.customId.startsWith("inv_leave_yes:")) {
    await interaction.deferUpdate().catch(() => {});
    const guildId = interaction.customId.split(":")[1];
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return safeEditReply(interaction, { content: "❌ ไม่พบเซิร์ฟเวอร์เป้าหมาย", components: [] });

    try {
      await guild.leave();
      await upsertLogMessage();
      const embed = new EmbedBuilder()
        .setTitle("ออกจากเซิร์ฟเวอร์แล้ว")
        .setDescription(`บอทได้ออกจาก **${guild.name}** เรียบร้อย`)
        .setColor(0x22c55e);
      return safeEditReply(interaction, { embeds: [embed], components: [] });
    } catch (e) {
      console.error("leave guild error:", e);
      const embed = new EmbedBuilder()
        .setTitle("ออกจากเซิร์ฟเวอร์ไม่สำเร็จ")
        .setDescription(`ไม่สามารถออกจาก **${guild.name}** ได้`)
        .setColor(0xef4444);
      return safeEditReply(interaction, { embeds: [embed], components: [] });
    }
  }
});

client.on("shardDisconnect", () => {
  runtime.discordReady = false;
  runtime.discordUser = null;
  runtime.lastDisconnectAt = new Date().toISOString();
  runtime.loginState = "unavailable";
  runtime.active = false;
  updateWorkingHost();
  pushLog("DISCORD", "Discord disconnected");
});

client.on("error", (error) => {
  setLastError(error);
  pushLog("ERROR", "discord client error", { error: String(error.message || error) });
});

pushLog("SYSTEM", "Booting bot", { self: SELF_NAME, peer: PEER_NAME, primaryUrl: PRIMARY_STATUS_URL });
manageRoleLoop();
