/**
 * 쿠키 자동 갱신 스크립트
 * — Chrome 프로필을 이용해 headless로 사이트 방문 → 세션 연장 → 쿠키 재저장
 * — Windows 작업 스케줄러로 12시간마다 실행 권장
 * 
 * 사용법: node refresh-cookies.mjs
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_FILE = path.resolve(__dirname, '.env.local');

async function refreshNaver() {
    const PROFILE_DIR = path.resolve(__dirname, '.naver-chrome-profile');
    const SESSION_FILE = path.resolve(__dirname, '.naver-session.json');
    const COOKIE_FILE = path.resolve(__dirname, '.naver-cookies.json');

    if (!fs.existsSync(PROFILE_DIR)) {
        console.log('⚠️ 네이버 Chrome 프로필 없음. 먼저 node naver-login.mjs 실행');
        return false;
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
            defaultViewport: { width: 1280, height: 900 },
            ignoreDefaultArgs: ['--enable-automation'],
            userDataDir: PROFILE_DIR,
        });

        const page = await browser.newPage();
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // 블로그 방문하여 세션 유지
        const session = fs.existsSync(SESSION_FILE)
            ? JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
            : { blogId: 'louispetergu' };

        console.log(`[네이버] blog.naver.com/${session.blogId} 방문 중...`);
        await page.goto(`https://blog.naver.com/${session.blogId}`, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });
        await new Promise(r => setTimeout(r, 2000));

        // 로그인 상태 확인
        const isLoggedIn = await page.evaluate(() => {
            return document.body.innerHTML.includes('로그아웃') ||
                document.body.innerHTML.includes('GNB_LOGOUT') ||
                document.querySelector('.gnb_my') !== null;
        });

        if (!isLoggedIn) {
            console.log('❌ [네이버] 세션 만료 — 수동 재로그인 필요: node naver-login.mjs');
            await browser.close();
            return false;
        }

        // CDP로 쿠키 추출
        const client = await page.createCDPSession();
        const { cookies: allCookies } = await client.send('Network.getAllCookies');
        const cookies = allCookies.filter(c => c.domain.includes('naver.com'));

        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        // 파일 업데이트
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
        fs.writeFileSync(SESSION_FILE, JSON.stringify({
            ...session,
            cookies: cookieString,
            lastLogin: new Date().toISOString(),
            lastRefresh: new Date().toISOString(),
            cookieCount: cookies.length,
        }, null, 2));

        // .env.local 업데이트
        updateEnv('NAVER_BLOG_ID', session.blogId);
        updateEnv('NAVER_COOKIES', cookieString);

        console.log(`✅ [네이버] 쿠키 갱신 완료! (${cookies.length}개)`);
        await browser.close();
        return true;
    } catch (e) {
        console.error(`❌ [네이버] 갱신 실패: ${e.message}`);
        if (browser) await browser.close();
        return false;
    }
}

async function refreshTistory() {
    const PROFILE_DIR = path.resolve(__dirname, '.tistory-chrome-profile');
    const SESSION_FILE = path.resolve(__dirname, '.tistory-session.json');
    const COOKIE_FILE = path.resolve(__dirname, '.tistory-cookies.json');

    if (!fs.existsSync(PROFILE_DIR)) {
        console.log('⚠️ 티스토리 Chrome 프로필 없음. 먼저 node tistory-login.mjs 실행');
        return false;
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
            defaultViewport: { width: 1280, height: 900 },
            ignoreDefaultArgs: ['--enable-automation'],
            userDataDir: PROFILE_DIR,
        });

        const page = await browser.newPage();
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        const session = fs.existsSync(SESSION_FILE)
            ? JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
            : { blogId: 'irestory' };

        console.log(`[티스토리] ${session.blogId}.tistory.com 방문 중...`);
        await page.goto(`https://${session.blogId}.tistory.com/manage`, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });
        await new Promise(r => setTimeout(r, 2000));

        // 로그인 상태 확인
        const url = page.url();
        if (url.includes('/auth/') || url.includes('accounts.kakao')) {
            console.log('❌ [티스토리] 세션 만료 — 수동 재로그인 필요: node tistory-login.mjs');
            await browser.close();
            return false;
        }

        // CDP로 쿠키 추출
        const client = await page.createCDPSession();
        const { cookies: allCookies } = await client.send('Network.getAllCookies');
        const cookies = allCookies.filter(c => c.domain.includes('tistory.com'));

        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        // 파일 업데이트
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
        fs.writeFileSync(SESSION_FILE, JSON.stringify({
            ...session,
            lastLogin: session.lastLogin,
            lastRefresh: new Date().toISOString(),
            cookieCount: cookies.length,
        }, null, 2));

        updateEnv('TISTORY_BLOG_ID', session.blogId);
        updateEnv('TISTORY_COOKIES', cookieString);

        console.log(`✅ [티스토리] 쿠키 갱신 완료! (${cookies.length}개)`);
        await browser.close();
        return true;
    } catch (e) {
        console.error(`❌ [티스토리] 갱신 실패: ${e.message}`);
        if (browser) await browser.close();
        return false;
    }
}

function updateEnv(key, value) {
    let content = '';
    if (fs.existsSync(ENV_FILE)) {
        content = fs.readFileSync(ENV_FILE, 'utf-8');
    }
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
    } else {
        content = content.trim() + `\n${key}=${value}\n`;
    }
    fs.writeFileSync(ENV_FILE, content);
}

// ── Main ──
async function main() {
    console.log('🔄 쿠키 자동 갱신 시작...', new Date().toLocaleString());
    console.log('='.repeat(50));

    const naverOk = await refreshNaver();
    const tistoryOk = await refreshTistory();

    console.log('');
    console.log('='.repeat(50));
    console.log(`결과: 네이버 ${naverOk ? '✅' : '❌'} | 티스토리 ${tistoryOk ? '✅' : '❌'}`);

    if (!naverOk || !tistoryOk) {
        console.log('⚠️ 실패한 플랫폼은 수동 재로그인이 필요합니다.');
    } else {
        console.log('🎉 모든 쿠키 갱신 완료!');
    }

    console.log('='.repeat(50));
}

main().catch(e => {
    console.error('❌ 전체 에러:', e.message);
    process.exit(1);
});
