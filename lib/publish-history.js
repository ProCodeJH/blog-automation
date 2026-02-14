/**
 * BlogFlow - 발행 이력 관리
 * — JSON 파일 기반 발행 기록 저장/조회
 * — 중복 발행 방지 (F7)
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'publish-history.json');

// ─── 파일 I/O ───

function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readHistory() {
    ensureDir();
    if (!fs.existsSync(HISTORY_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch { return []; }
}

function writeHistory(records) {
    ensureDir();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(records, null, 2), 'utf8');
}

// ─── 이력 기록 ───

export function recordPublish({ platform, title, postUrl, method, elapsed, status = 'success', error = null }) {
    const records = readHistory();
    const record = {
        id: `pub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        platform,
        title: title?.substring(0, 100),
        postUrl,
        method,
        elapsed,
        status,
        error,
        publishedAt: new Date().toISOString(),
    };
    records.unshift(record); // 최신이 앞
    // 최대 500건 유지
    if (records.length > 500) records.length = 500;
    writeHistory(records);
    return record;
}

// ─── 이력 조회 ───

export function getHistory({ limit = 50, platform = null, status = null } = {}) {
    let records = readHistory();
    if (platform) records = records.filter(r => r.platform === platform);
    if (status) records = records.filter(r => r.status === status);
    return records.slice(0, limit);
}

// ─── 통계 ───

export function getStats() {
    const records = readHistory();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayPubs = records.filter(r => new Date(r.publishedAt) >= today && r.status === 'success');
    const weekPubs = records.filter(r => new Date(r.publishedAt) >= weekAgo && r.status === 'success');

    const platformCounts = {};
    records.filter(r => r.status === 'success').forEach(r => {
        platformCounts[r.platform] = (platformCounts[r.platform] || 0) + 1;
    });

    return {
        total: records.filter(r => r.status === 'success').length,
        totalFailed: records.filter(r => r.status === 'failed').length,
        today: todayPubs.length,
        thisWeek: weekPubs.length,
        byPlatform: platformCounts,
        lastPublish: records.find(r => r.status === 'success')?.publishedAt || null,
    };
}

// ─── 중복 발행 방지 (F7) ───

export function isDuplicate(title, platform, hoursWindow = 24) {
    const records = readHistory();
    const cutoff = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);
    return records.some(r =>
        r.platform === platform &&
        r.title === title?.substring(0, 100) &&
        r.status === 'success' &&
        new Date(r.publishedAt) >= cutoff
    );
}

// ─── 이력 삭제 ───

export function clearHistory() {
    writeHistory([]);
    return { success: true };
}
