/**
 * 티스토리 로그인 스크립트
 * — 브라우저가 열리면 카카오 로그인 → 쿠키 자동 저장
 * — 한 번만 실행하면 이후 자동 발행 가능
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROFILE_DIR = path.resolve(__dirname, 'lib/platforms/../../.tistory-chrome-profile');
const SESSION_FILE = path.resolve(__dirname, '.tistory-session.json');
const ENV_FILE = path.resolve(__dirname, '.env.local');

const BLOG_ID = process.argv[2] || 'irestory';

async function main() {
    console.log('='.repeat(50));
    console.log('🔐 티스토리 로그인 (카카오)');
    console.log(`   블로그: ${BLOG_ID}.tistory.com`);
    console.log('='.repeat(50));
    console.log('');
    console.log('🌐 브라우저가 열립니다. 카카오 계정으로 로그인하세요.');
    console.log('   로그인 완료 후 자동으로 쿠키가 저장됩니다.');
    console.log('');

    // Chrome 프로필 디렉토리
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

    // 카카오 팝업 새 탭도 감지
    browser.on('targetcreated', async (target) => {
        const newPage = await target.page();
        if (newPage) {
            console.log('  📌 새 탭/팝업 감지:', target.url());
        }
    });

    // 티스토리 로그인 → 카카오 리다이렉트 직접 이동
    console.log('🌐 카카오 로그인 페이지로 직접 이동합니다...');
    await page.goto('https://www.tistory.com/auth/login?redirectUrl=https%3A%2F%2Fwww.tistory.com%2F', {
        waitUntil: 'networkidle2',
        timeout: 30000,
    });

    // 카카오 로그인 버튼이 보이면 자동 클릭
    try {
        const kakaoBtn = await page.$('a.btn_login, a[href*="kakao"], .link_kakao, a[class*="kakao"]');
        if (kakaoBtn) {
            console.log('  🔑 카카오 로그인 버튼 클릭...');
            // 팝업이 아닌 같은 페이지에서 이동하도록 target 변경
            await page.evaluate(() => {
                const link = document.querySelector('a.btn_login, a[href*="kakao"], .link_kakao, a[class*="kakao"]');
                if (link) {
                    link.removeAttribute('target');
                    link.click();
                }
            });
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch { /* 수동 로그인 */ }

    console.log('⏳ 카카오 로그인 대기 중... (최대 2분)');
    console.log('   브라우저에서 카카오 계정으로 로그인하세요!');

    // 로그인 완료 감지 — tistory.com 메인이나 manage로 리다이렉트
    try {
        await page.waitForFunction(
            () => {
                const url = window.location.href;
                return (
                    url.includes('tistory.com/manage') ||
                    (url.includes('tistory.com') && !url.includes('/auth/') && !url.includes('accounts.kakao'))
                );
            },
            { timeout: 120000, polling: 1000 }
        );
    } catch {
        // 팝업으로 로그인된 경우, 모든 페이지 확인
        const pages = await browser.pages();
        let loggedIn = false;
        for (const p of pages) {
            const url = p.url();
            if (url.includes('tistory.com') && !url.includes('/auth/')) {
                loggedIn = true;
                break;
            }
        }
        if (!loggedIn) {
            console.log('⏰ 로그인 타임아웃. 브라우저를 닫습니다.');
            await browser.close();
            process.exit(1);
        }
    }

    console.log('✅ 로그인 감지!');

    // 블로그 관리 페이지로 이동해서 쿠키 확인
    await page.goto(`https://${BLOG_ID}.tistory.com/manage`, {
        waitUntil: 'networkidle2',
        timeout: 15000,
    });

    await new Promise(r => setTimeout(r, 2000));

    // 모든 쿠키 추출 (CDP로 HttpOnly 포함!)
    const client = await page.createCDPSession();
    const { cookies: allCookies } = await client.send('Network.getAllCookies');

    // tistory 관련 쿠키만 필터
    const cookies = allCookies.filter(c =>
        c.domain.includes('tistory.com') || c.domain.includes('.tistory.com')
    );
    console.log(`🍪 전체 쿠키 ${allCookies.length}개 중 티스토리 쿠키 ${cookies.length}개 추출`);

    // HttpOnly 쿠키 확인
    const httpOnly = cookies.filter(c => c.httpOnly);
    console.log(`  🔒 HttpOnly 쿠키: ${httpOnly.map(c => c.name).join(', ')}`);

    // 쿠키 → 문자열 (name=value; 형식)
    const cookieString = cookies
        .map(c => `${c.name}=${c.value}`)
        .join('; ');

    // 전체 쿠키 JSON도 저장 (setCookie에 사용)
    const cookieJsonFile = path.resolve(__dirname, '.tistory-cookies.json');
    fs.writeFileSync(cookieJsonFile, JSON.stringify(cookies, null, 2));
    console.log(`📁 쿠키 JSON 저장: ${cookieJsonFile}`);

    // 세션 파일 저장
    const sessionData = {
        blogId: BLOG_ID,
        lastLogin: new Date().toISOString(),
        loginMethod: 'kakao-puppeteer',
        cookieCount: cookies.length,
    };
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    console.log(`📁 세션 저장: ${SESSION_FILE}`);

    // .env.local에 쿠키 저장
    let envContent = '';
    if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, 'utf-8');
    }

    // 기존 TISTORY_ 변수 제거 후 추가
    envContent = envContent
        .replace(/^TISTORY_COOKIES=.*$/m, '')
        .replace(/^TISTORY_BLOG_ID=.*$/m, '')
        .trim();

    envContent += `\n\n# 티스토리 (자동 설정: ${new Date().toISOString()})\n`;
    envContent += `TISTORY_BLOG_ID=${BLOG_ID}\n`;
    envContent += `TISTORY_COOKIES=${cookieString}\n`;

    fs.writeFileSync(ENV_FILE, envContent.trim() + '\n');
    console.log(`📁 .env.local 업데이트 완료`);

    console.log('');
    console.log('='.repeat(50));
    console.log('✅ 티스토리 로그인 완료!');
    console.log(`   blogId: ${BLOG_ID}`);
    console.log(`   쿠키: ${cookies.length}개 (HttpOnly 포함)`);
    console.log('   .env.local에 자동 저장됨');
    console.log('');
    console.log('🚀 이제 Next.js에서 티스토리 자동 발행을 사용할 수 있습니다!');
    console.log('='.repeat(50));

    await browser.close();
}

main().catch(err => {
    console.error('❌ 에러:', err.message);
    process.exit(1);
});
