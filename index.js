require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');

const PRIMARY_NAME = 'bot3seamuww';
const SECONDARY_NAME = 'bot3seamuwwx';
const PRIMARY_STATUS_URL = process.env.PRIMARY_BOT_STATUS_URL || 'https://bot3seamuww.onrender.com/__bot/status';
const PEER_STATUS_TIMEOUT_MS = Number(process.env.PEER_STATUS_TIMEOUT_MS || 4000);
const DISCORD_LOGIN_TIMEOUT_MS = Number(process.env.DISCORD_LOGIN_TIMEOUT_MS || 12000);
const FAIL_RETRY_COOLDOWN_MS = Number(process.env.FAIL_RETRY_COOLDOWN_MS || 45000);
const PEER_POLL_INTERVAL_MS = Number(process.env.PEER_POLL_INTERVAL_MS || 7000);
const PRIMARY_RECOVERY_GRACE_MS = Number(process.env.PRIMARY_RECOVERY_GRACE_MS || 12000);

const SELF_NAME = detectSelfName();
const IS_PRIMARY = SELF_NAME === PRIMARY_NAME;
const PEER_NAME = IS_PRIMARY ? SECONDARY_NAME : PRIMARY_NAME;
const PEER_STATUS_URL = IS_PRIMARY
  ? (process.env.SECONDARY_BOT_STATUS_URL || 'https://bot3seamuwwx.onrender.com/__bot/status')
  : PRIMARY_STATUS_URL;

const client1 = new Client();
const client2 = new Client();

const todayTimers = [];
const TARGET_GUILD = '770902518238019594';
const TARGET_CHANNEL = '1439273473930170409';
const TMN_REGEX = /(https?:\/\/gift\.truemoney\.com\/campaign\/(\?v=)?[\w\-_]+)/i;
const TEST_USER_ID = '849964668177088562';

function extractGiftInput(input) {
  const raw = (input || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (/(^|\.)gift\.truemoney\.com$/i.test(u.hostname) && (!!u.searchParams.get('v') || !!u.pathname.split('/').pop())) {
      return raw;
    }
  } catch {}
  const code = raw.replace(/[^A-Za-z0-9]/g, '');
  return code.length >= 8 ? code : null;
}

function detectSelfName() {
  const raw = [
    process.env.APP_INSTANCE_NAME,
    process.env.RENDER_SERVICE_NAME,
    process.env.RENDER_EXTERNAL_HOSTNAME,
    process.env.RENDER_INTERNAL_HOSTNAME,
    process.env.HOSTNAME,
    process.env.RENDER_INSTANCE_ID,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (raw.includes(SECONDARY_NAME)) return SECONDARY_NAME;
  if (raw.includes(PRIMARY_NAME)) return PRIMARY_NAME;
  return PRIMARY_NAME;
}

function nowIso() {
  return new Date().toISOString();
}

const state = {
  startedAt: Date.now(),
  name: SELF_NAME,
  host: process.env.RENDER_EXTERNAL_HOSTNAME || process.env.HOSTNAME || '-',
  role: IS_PRIMARY ? 'primary' : 'secondary',
  peerName: PEER_NAME,
  peerStatusUrl: PEER_STATUS_URL,
  desiredRole: IS_PRIMARY ? 'active' : 'standby',
  activeWorker: 'none',
  statusText: 'starting',
  shouldRun: false,
  modulesLoaded: false,
  loginState: 'idle',
  discordReachable: false,
  discordReady: false,
  userTag: '-',
  lastCommand: null,
  lastCommandAt: null,
  lastError: null,
  lastLoginAttemptAt: null,
  lastLoginSuccessAt: null,
  lastReadyAt: null,
  lastDisconnectAt: null,
  nextRetryAt: null,
  peer: {
    reachable: null,
    activeWorker: 'unknown',
    discordReady: null,
    lastCheckedAt: null,
    error: null,
  },
  logs: [],
};

global.BOT3_STATE = state;

function pushLog(type, message, extra = null) {
  const item = { at: nowIso(), type, message, extra };
  state.logs.unshift(item);
  if (state.logs.length > 60) state.logs.length = 60;
  const line = `[${item.at}] [${type}] ${message}`;
  if (type === 'ERROR') console.error(line);
  else console.log(line);
}

function setLastError(err) {
  const text = err ? String(err.message || err) : null;
  state.lastError = text;
  if (text) pushLog('ERROR', text);
}

function safeDestroy(client, label) {
  try {
    if (client && client.destroy) client.destroy();
  } catch (err) {
    pushLog('WARN', `${label} destroy failed`, { error: String(err.message || err) });
  }
}

require('./server');

function attachClientTracking(client, label) {
  client.on('ready', () => {
    state.loginState = 'ready';
    state.discordReachable = true;
    state.discordReady = true;
    state.userTag = client.user?.tag || '-';
    state.lastLoginSuccessAt = nowIso();
    state.lastReadyAt = nowIso();
    state.lastError = null;
    pushLog('DISCORD', `${label} ready as ${state.userTag}`);
  });

  client.on('messageCreate', (message) => {
    state.lastCommand = {
      channelId: message.channelId,
      author: message.author?.tag || message.author?.id || '-',
      content: String(message.content || '').slice(0, 300),
    };
    state.lastCommandAt = nowIso();
  });

  const down = (why) => {
    state.discordReady = false;
    state.discordReachable = false;
    state.userTag = '-';
    state.lastDisconnectAt = nowIso();
    pushLog('DISCORD', `${label} ${why}`);
  };

  client.on('disconnect', () => down('disconnect'));
  client.on('shardDisconnect', () => down('shardDisconnect'));
  client.on('error', (err) => {
    setLastError(err);
    down('error');
  });
}

attachClientTracking(client1, 'client1');
attachClientTracking(client2, 'client2');

function loadModulesOnce() {
  if (state.modulesLoaded) return;
  const config = {
    TARGET_GUILD,
    TARGET_CHANNEL,
    TMN_REGEX,
    TEST_USER_ID,
    extractGiftInput,
    todayTimers,
  };
  require('./money')(client1, config);
  require('./find')(client1, config);
  require('./word')(client1, config);
  state.modulesLoaded = true;
  pushLog('SYSTEM', 'โหลดโมดูล money/find/word แล้ว');
}

async function loginClientWithTimeout(client, token, label) {
  if (!token) throw new Error(`${label} token missing`);
  return await Promise.race([
    client.login(token),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} login timeout after ${DISCORD_LOGIN_TIMEOUT_MS}ms`)), DISCORD_LOGIN_TIMEOUT_MS)),
  ]);
}

async function startDiscordWorkers() {
  if (state.loginState === 'logging_in' || state.discordReady) return;

  const now = Date.now();
  if (state.nextRetryAt && now < state.nextRetryAt) {
    state.statusText = 'cooldown_after_failed_login';
    return;
  }

  state.shouldRun = true;
  state.loginState = 'logging_in';
  state.discordReachable = false;
  state.discordReady = false;
  state.lastLoginAttemptAt = nowIso();
  state.statusText = 'trying_discord_login';
  pushLog('DISCORD', 'กำลังพยายาม login Discord');

  try {
    await loginClientWithTimeout(client2, process.env.BOT_TOKEN2, 'BOT_TOKEN2');
    await loginClientWithTimeout(client1, process.env.BOT_TOKEN, 'BOT_TOKEN');
    loadModulesOnce();
    state.activeWorker = state.name;
    state.statusText = 'running';
    pushLog('SYSTEM', `${state.name} เริ่มทำงานจริงแล้ว`);
  } catch (err) {
    setLastError(err);
    state.loginState = 'unavailable';
    state.discordReachable = false;
    state.discordReady = false;
    state.statusText = 'discord_unavailable';
    state.activeWorker = 'none';
    state.nextRetryAt = Date.now() + FAIL_RETRY_COOLDOWN_MS;
    safeDestroy(client1, 'client1');
    safeDestroy(client2, 'client2');
    pushLog('SYSTEM', 'เข้า Discord ไม่ได้ภายในเวลาที่กำหนด ถือว่าใช้ไม่ได้ทันที');
  }
}

function stopDiscordWorkers(reason) {
  if (!state.discordReady && state.loginState !== 'logging_in' && !state.shouldRun) {
    state.activeWorker = state.peer.activeWorker === PEER_NAME ? PEER_NAME : 'none';
    return;
  }
  state.shouldRun = false;
  state.loginState = 'standby';
  state.discordReady = false;
  state.discordReachable = false;
  state.userTag = '-';
  state.statusText = 'standby';
  state.lastDisconnectAt = nowIso();
  state.activeWorker = state.peer.activeWorker === PEER_NAME ? PEER_NAME : 'none';
  safeDestroy(client1, 'client1');
  safeDestroy(client2, 'client2');
  pushLog('SYSTEM', reason || 'เข้าสู่โหมด standby');
}

async function fetchPeerStatus() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PEER_STATUS_TIMEOUT_MS);
  try {
    const response = await fetch(PEER_STATUS_URL, {
      signal: controller.signal,
      headers: { 'cache-control': 'no-cache' },
    });
    if (!response.ok) throw new Error(`peer status http ${response.status}`);
    const data = await response.json();
    state.peer = {
      reachable: true,
      activeWorker: data.activeWorker || 'unknown',
      discordReady: !!data.discordReady,
      lastCheckedAt: nowIso(),
      error: null,
    };
    return data;
  } catch (err) {
    state.peer = {
      reachable: false,
      activeWorker: 'unknown',
      discordReady: false,
      lastCheckedAt: nowIso(),
      error: String(err.message || err),
    };
    return null;
  } finally {
    clearTimeout(timer);
  }
}

let primaryRecoverySince = null;

async function evaluateFailover() {
  const peer = await fetchPeerStatus();

  if (IS_PRIMARY) {
    state.desiredRole = 'active';
    if (state.discordReady) {
      state.activeWorker = PRIMARY_NAME;
      state.statusText = 'running_as_primary';
      return;
    }
    await startDiscordWorkers();
    state.activeWorker = state.discordReady ? PRIMARY_NAME : (peer?.activeWorker || 'none');
    return;
  }

  state.desiredRole = 'standby';

  if (peer?.discordReady && peer?.activeWorker === PRIMARY_NAME) {
    primaryRecoverySince = null;
    stopDiscordWorkers(`${PRIMARY_NAME} พร้อมใช้งานอยู่ จึงให้อีกตัวนิ่งไว้`);
    state.activeWorker = PRIMARY_NAME;
    return;
  }

  const primaryLooksHealthy = !!peer?.discordReady;
  if (primaryLooksHealthy) {
    if (!primaryRecoverySince) primaryRecoverySince = Date.now();
    if (Date.now() - primaryRecoverySince >= PRIMARY_RECOVERY_GRACE_MS) {
      stopDiscordWorkers(`${PRIMARY_NAME} กลับมาพร้อมแล้ว จึงคืนงานให้ตัวหลัก`);
      state.activeWorker = PRIMARY_NAME;
      return;
    }
  } else {
    primaryRecoverySince = null;
  }

  await startDiscordWorkers();
  state.activeWorker = state.discordReady ? SECONDARY_NAME : 'none';
  if (!state.discordReady && state.loginState === 'unavailable') {
    state.statusText = 'secondary_waiting_primary_or_retry';
  }
}

setInterval(() => {
  evaluateFailover().catch((err) => setLastError(err));
}, PEER_POLL_INTERVAL_MS);

evaluateFailover().catch((err) => setLastError(err));

process.on('unhandledRejection', (err) => setLastError(err));
process.on('uncaughtException', (err) => setLastError(err));
