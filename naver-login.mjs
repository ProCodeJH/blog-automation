/**
 * 네이버 로그인 스크립트
 * — 브라우저가 열리면 네이버 로그인 → 쿠키 자동 저장
 * — 한 번만 실행하면 이후 자동 발행 가능
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROFILE_DIR = path.resolve(__dirname, '.naver-chrome-profile');
const SESSION_FILE = path.resolve(__dirname, '.naver-session.json');
const ENV_FILE = path.resolve(__dirname, '.env.local');

const BLOG_ID = process.argv[2] || 'louispetergu';

async function main() {
    console.log('='.repeat(50));
    console.log('🔐 네이버 로그인');
    console.log(`   블로그: blog.naver.com/${BLOG_ID}`);
    console.log('='.repeat(50));
    console.log('');
    console.log('🌐 브라우저가 열립니다. 네이버 계정으로 로그인하세요.');
    console.log('   로그인 완료 후 자동으로 쿠키가 저장됩니다.');
    console.log('');

    if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
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

    console.log('🌐 네이버 로그인 페이지로 이동합니다...');
    await page.goto('https://nid.naver.com/nidlogin.login?mode=form&url=https%3A%2F%2Fblog.naver.com%2F', {
        waitUntil: 'networkidle2',
        timeout: 30000,
    });

    console.log('⏳ 네이버 로그인 대기 중... (최대 3분)');
    console.log('   브라우저에서 네이버 계정으로 로그인하세요!');

    // 로그인 완료 감지 — blog.naver.com 또는 naver.com 메인으로 리다이렉트
    try {
        await page.waitForFunction(
            () => {
                const url = window.location.href;
                return (
                    url.includes('blog.naver.com') ||
                    (url.includes('naver.com') && !url.includes('nidlogin'))
                );
            },
            { timeout: 180000, polling: 1000 }
        );
    } catch {
        console.log('⏰ 로그인 타임아웃. 브라우저를 닫습니다.');
        await browser.close();
        process.exit(1);
    }

    console.log('✅ 로그인 감지!');

    // 여러 네이버 페이지 방문하여 모든 도메인 쿠키 확보
    console.log('🔄 쿠키 확보를 위해 여러 페이지 방문...');

    // 1) naver.com 메인 — NID_AUT, NID_SES 확보
    try {
        await page.goto('https://www.naver.com/', { waitUntil: 'networkidle2', timeout: 15000 });
        await new Promise(r => setTimeout(r, 1000));
        console.log('  ✓ naver.com 방문');
    } catch (e) { console.log('  ⚠ naver.com:', e.message); }

    // 2) 블로그 홈
    try {
        await page.goto(`https://blog.naver.com/${BLOG_ID}`, { waitUntil: 'networkidle2', timeout: 15000 });
        await new Promise(r => setTimeout(r, 1000));
        console.log('  ✓ blog.naver.com 방문');
    } catch (e) { console.log('  ⚠ blog:', e.message); }

    // 3) 블로그 에디터 — postwrite 쿠키 확보
    try {
        await page.goto(`https://blog.naver.com/${BLOG_ID}/postwrite`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 2000));
        console.log('  ✓ blog postwrite 방문');
    } catch (e) { console.log('  ⚠ postwrite:', e.message); }

    // CDP로 모든 쿠키 추출 (HttpOnly 포함)
    const client = await page.createCDPSession();
    const { cookies: allCookies } = await client.send('Network.getAllCookies');

    // 네이버 관련 쿠키만 필터
    const cookies = allCookies.filter(c =>
        c.domain.includes('naver.com') || c.domain.includes('.naver.com')
    );
    console.log(`🍪 전체 쿠키 ${allCookies.length}개 중 네이버 쿠키 ${cookies.length}개 추출`);

    // 핵심 쿠키 확인
    const keyNames = ['NID_AUT', 'NID_SES', 'NID_JST', 'JSESSIONID', 'NNB'];
    for (const name of keyNames) {
        const found = cookies.find(c => c.name === name);
        console.log(`  ${found ? '✅' : '❌'} ${name}: ${found ? `[${found.domain}] ` + found.value.substring(0, 20) + '...' : 'NOT FOUND'}`);
    }

    const httpOnly = cookies.filter(c => c.httpOnly);
    console.log(`  🔒 HttpOnly 쿠키: ${httpOnly.map(c => c.name).join(', ')}`);

    // 쿠키 → 문자열
    const cookieString = cookies
        .map(c => `${c.name}=${c.value}`)
        .join('; ');

    // 쿠키 JSON 저장
    const cookieJsonFile = path.resolve(__dirname, '.naver-cookies.json');
    fs.writeFileSync(cookieJsonFile, JSON.stringify(cookies, null, 2));
    console.log(`📁 쿠키 JSON 저장: ${cookieJsonFile}`);

    // 세션 파일 저장
    const sessionData = {
        blogId: BLOG_ID,
        cookies: cookieString,
        lastLogin: new Date().toISOString(),
        loginMethod: 'puppeteer',
        cookieCount: cookies.length,
    };
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    console.log(`📁 세션 저장: ${SESSION_FILE}`);

    // .env.local에 쿠키 저장
    let envContent = '';
    if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, 'utf-8');
    }

    envContent = envContent
        .replace(/^NAVER_COOKIES=.*$/m, '')
        .replace(/^NAVER_BLOG_ID=.*$/m, '')
        .trim();

    envContent += `\n\n# 네이버 (자동 설정: ${new Date().toISOString()})\n`;
    envContent += `NAVER_BLOG_ID=${BLOG_ID}\n`;
    envContent += `NAVER_COOKIES=${cookieString}\n`;

    fs.writeFileSync(ENV_FILE, envContent.trim() + '\n');
    console.log(`📁 .env.local 업데이트 완료`);

    console.log('');
    console.log('='.repeat(50));
    console.log('✅ 네이버 로그인 완료!');
    console.log(`   blogId: ${BLOG_ID}`);
    console.log(`   쿠키: ${cookies.length}개 (HttpOnly 포함)`);
    console.log('   .env.local에 자동 저장됨');
    console.log('');
    console.log('🚀 이제 Next.js에서 네이버 자동 발행을 사용할 수 있습니다!');
    console.log('='.repeat(50));

    await browser.close();
}

main().catch(err => {
    console.error('❌ 에러:', err.message);
    process.exit(1);
});
