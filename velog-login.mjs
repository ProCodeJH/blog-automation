/**
 * 벨로그 로그인 스크립트
 * — 브라우저가 열리면 로그인 → 쿠키 자동 저장
 * — 한 번만 실행하면 이후 GraphQL API로 자동 발행 가능
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COOKIE_FILE = path.resolve(__dirname, '.velog-cookies.json');
const SESSION_FILE = path.resolve(__dirname, '.velog-session.json');
const PROFILE_DIR = path.resolve(__dirname, '.velog-chrome-profile');

async function main() {
    console.log('='.repeat(50));
    console.log('🔐 벨로그 로그인');
    console.log('='.repeat(50));
    console.log('');
    console.log('🌐 브라우저가 열립니다.');
    console.log('   GitHub / Google / 이메일 중 원하는 방식으로 로그인하세요.');
    console.log('');

    if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-popup-blocking',
            '--window-size=1280,900',
        ],
        defaultViewport: { width: 1280, height: 900 },
        ignoreDefaultArgs: ['--enable-automation'],
        userDataDir: PROFILE_DIR,
    });

    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // 벨로그 메인 이동
    console.log('🌐 벨로그로 이동합니다...');
    try {
        await page.goto('https://velog.io/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });
    } catch (e) {
        console.log(`  ⚠️ 네비게이션: ${e.message} — 계속 진행`);
    }

    // SPA 로드 대기
    await new Promise(r => setTimeout(r, 3000));

    // 이미 로그인 되어 있는지 CDP 쿠키로 확인 (page.evaluate 대신)
    const client = await page.createCDPSession();
    const { cookies: initCookies } = await client.send('Network.getAllCookies');
    const hasToken = initCookies.some(c => c.name === 'access_token' && c.domain.includes('velog'));

    if (hasToken) {
        console.log('✅ 이미 로그인되어 있습니다! (access_token 발견)');
    } else {
        // 로그인 버튼 클릭 시도
        try {
            const buttons = await page.$$('button');
            for (const btn of buttons) {
                try {
                    const text = await page.evaluate(el => el.textContent, btn);
                    if (text.includes('로그인')) {
                        await btn.click();
                        console.log('  🔑 로그인 버튼 클릭...');
                        break;
                    }
                } catch { /* context destroyed — skip */ }
            }
        } catch { /* 수동 로그인 */ }

        console.log('⏳ 로그인 대기 중... (최대 3분)');
        console.log('   브라우저에서 로그인하세요!');

        // 로그인 완료 감지 — CDP 쿠키 폴링 (page.evaluate 대신 안정적)
        const deadline = Date.now() + 180000; // 3분
        let loggedIn = false;
        while (Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 3000));
            try {
                const { cookies: pollCookies } = await client.send('Network.getAllCookies');
                if (pollCookies.some(c => c.name === 'access_token' && c.domain.includes('velog'))) {
                    loggedIn = true;
                    break;
                }
            } catch { /* retry */ }
        }

        if (!loggedIn) {
            console.log('⏰ 로그인 타임아웃. 브라우저를 닫습니다.');
            await browser.close();
            process.exit(1);
        }
    }

    console.log('✅ 로그인 감지!');

    // 페이지 새로고침 후 안정화
    try {
        await page.goto('https://velog.io/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, 2000));

    // 모든 쿠키 추출
    const { cookies: allCookies } = await client.send('Network.getAllCookies');
    const cookies = allCookies.filter(c =>
        c.domain.includes('velog.io') || c.domain.includes('.velog.io')
    );

    console.log(`🍪 전체 쿠키 ${allCookies.length}개 중 벨로그 쿠키 ${cookies.length}개 추출`);

    const accessToken = cookies.find(c => c.name === 'access_token');
    const refreshToken = cookies.find(c => c.name === 'refresh_token');
    console.log(`  🔑 access_token: ${accessToken ? '✅ 있음' : '❌ 없음'}`);
    console.log(`  🔑 refresh_token: ${refreshToken ? '✅ 있음' : '❌ 없음'}`);

    if (!accessToken) {
        console.log('⚠️ access_token이 없습니다. 다시 로그인해주세요.');
        await browser.close();
        process.exit(1);
    }

    // 유저명 추출 (서버 사이드 fetch)
    let username = 'unknown';
    try {
        const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        const res = await fetch('https://v2.velog.io/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: cookieStr,
            },
            body: JSON.stringify({
                query: `{ currentUser { id username display_name } }`,
            }),
        });
        const userRes = await res.json();
        if (userRes?.data?.currentUser) {
            username = userRes.data.currentUser.username;
            console.log(`  👤 사용자: ${userRes.data.currentUser.display_name || username} (@${username})`);
        }
    } catch (e) {
        console.log('  ⚠️ 사용자 정보 조회 실패:', e.message);
    }

    // 쿠키 JSON 저장
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    console.log(`📁 쿠키 저장: ${COOKIE_FILE}`);

    // 세션 파일 저장
    const sessionData = {
        username,
        lastLogin: new Date().toISOString(),
        loginMethod: 'browser',
        cookieCount: cookies.length,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
    };
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    console.log(`📁 세션 저장: ${SESSION_FILE}`);

    console.log('');
    console.log('='.repeat(50));
    console.log('✅ 벨로그 로그인 완료!');
    console.log(`   사용자: @${username}`);
    console.log(`   쿠키: ${cookies.length}개 (access_token 포함)`);
    console.log('');
    console.log('🚀 이제 벨로그 자동 발행을 사용할 수 있습니다!');
    console.log('='.repeat(50));

    await browser.close();
}

main().catch(err => {
    console.error('❌ 에러:', err.message);
    process.exit(1);
});
