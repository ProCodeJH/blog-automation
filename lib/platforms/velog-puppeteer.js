/**
 * BlogFlow - Velog Puppeteer 발행 모듈
 * — headless: false (Cloudflare Turnstile 우회 필수)
 * — Quill + CodeMirror 하이브리드 에디터
 * — 쿠키 기반 인증
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COOKIE_FILE = path.resolve(__dirname, '../../.velog-cookies.json');
const SESSION_FILE = path.resolve(__dirname, '../../.velog-session.json');
const PROFILE_DIR = path.resolve(__dirname, '../../.velog-chrome-profile');
const GRAPHQL_URL = 'https://v3.velog.io/graphql';

// ─── 쿠키 로드 ───

function loadCookies() {
    if (!fs.existsSync(COOKIE_FILE)) {
        return { cookies: null, error: '벨로그 쿠키 없음. `node velog-login.mjs` 실행 필요.' };
    }
    let cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
    const now = Date.now() / 1000;
    cookies = cookies.filter(c => !c.expires || c.expires === -1 || c.expires > now);
    const accessToken = cookies.find(c => c.name === 'access_token');
    if (!accessToken) {
        return { cookies: null, error: 'access_token 없음. `node velog-login.mjs` 재실행 필요.' };
    }
    return { cookies, accessToken: accessToken.value, error: null };
}

// ─── HTML to Markdown ───

function htmlToMarkdown(html) {
    if (!html) return '';
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<h([1-4])[^>]*>(.*?)<\/h\1>/gi, (_, n, t) => '#'.repeat(+n) + ' ' + t + '\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
        .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<\/?[uo]l[^>]*>/gi, '\n')
        .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) =>
            c.split('\n').map(l => '> ' + l.trim()).join('\n'))
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ─── Puppeteer 발행 ───

export async function publishToVelog({ post }) {
    console.log(`[Velog] 발행 시작: "${post.title?.substring(0, 30)}"`);
    const startTime = Date.now();

    const { cookies, error } = loadCookies();
    if (error) return { success: false, error };

    let body = post.content || '';
    if (body.includes('<') && body.includes('>')) {
        body = htmlToMarkdown(body);
    }

    let browser;
    try {
        // ★ headless: false — Cloudflare Turnstile 필수
        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1280,900',
                '--window-position=50,50',
            ],
            defaultViewport: { width: 1280, height: 900 },
            protocolTimeout: 60000,
            ignoreDefaultArgs: ['--enable-automation'],
            userDataDir: PROFILE_DIR,
        });

        const page = await browser.newPage();
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // 쿠키 주입
        const validCookies = cookies.filter(c => c.name && c.value && c.domain).map(c => ({
            name: c.name, value: c.value, domain: c.domain,
            path: c.path || '/', httpOnly: c.httpOnly || false,
            secure: c.secure || false, sameSite: c.sameSite || 'Lax',
        }));
        await page.setCookie(...validCookies);

        // 글쓰기 페이지
        console.log('[Velog] 글쓰기 페이지 이동...');
        await page.goto('https://velog.io/write', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 4000));

        if (!page.url().includes('/write')) {
            await browser.close();
            return { success: false, error: '세션 만료. `node velog-login.mjs` 재실행 필요.' };
        }

        // (1) 제목 입력
        console.log('[Velog] 제목 입력...');
        const titleEl = await page.waitForSelector('textarea[placeholder="제목을 입력하세요"]', { timeout: 10000 });
        await titleEl.click();
        await titleEl.type(post.title || '제목 없음', { delay: 30 });

        await new Promise(r => setTimeout(r, 500));

        // (2) 태그 입력
        const tags = (post.tags || []).filter(Boolean);
        if (tags.length > 0) {
            console.log(`[Velog] 태그 입력: ${tags.join(', ')}`);
            try {
                const tagInput = await page.waitForSelector('input[placeholder="태그를 입력하세요"]', { timeout: 5000 });
                for (const tag of tags) {
                    await tagInput.click();
                    await tagInput.type(tag, { delay: 30 });
                    await page.keyboard.press('Enter');
                    await new Promise(r => setTimeout(r, 300));
                }
            } catch { }
        }

        // (3) 본문 입력 (CodeMirror)
        console.log('[Velog] 본문 입력...');
        const bodySet = await page.evaluate((content) => {
            const cm = document.querySelector('.CodeMirror');
            if (cm && cm.CodeMirror) {
                cm.CodeMirror.setValue(content);
                return true;
            }
            return false;
        }, body);

        if (!bodySet) {
            const cmEl = await page.$('.CodeMirror');
            if (cmEl) {
                await cmEl.click();
                await new Promise(r => setTimeout(r, 300));
                await page.keyboard.type(body, { delay: 3 });
            }
        }
        console.log('[Velog] 본문 입력 완료');

        await new Promise(r => setTimeout(r, 1000));

        // (4) "출간하기" 버튼 클릭 (에디터 → 모달)
        console.log('[Velog] 출간하기 버튼 클릭...');
        const btns1 = await page.$$('button');
        for (const btn of btns1) {
            const text = await page.evaluate(el => el.textContent.trim(), btn);
            if (text === '출간하기') {
                await btn.click();
                break;
            }
        }

        // 모달 대기
        await new Promise(r => setTimeout(r, 3000));

        // (5) Cloudflare Turnstile 통과 대기
        console.log('[Velog] Cloudflare Turnstile 통과 대기...');
        let turnstilePassed = false;
        for (let i = 0; i < 30; i++) {
            // 출간하기 버튼이 활성화되어 있는지 확인
            const btnState = await page.evaluate(() => {
                const buttons = [...document.querySelectorAll('button')];
                const pubBtns = buttons.filter(b => b.textContent.trim() === '출간하기');
                const modalBtn = pubBtns[pubBtns.length - 1];
                if (!modalBtn) return 'not_found';
                return modalBtn.disabled ? 'disabled' : 'enabled';
            });

            if (btnState === 'enabled') {
                // Cloudflare 위젯이 없거나 통과됨
                const hasCfFail = await page.evaluate(() =>
                    document.body.innerHTML.includes('확인 실패')
                );
                if (!hasCfFail) {
                    turnstilePassed = true;
                    console.log('[Velog] ✅ Turnstile 통과');
                    break;
                }
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        if (!turnstilePassed) {
            console.log('[Velog] ⚠️ Turnstile 통과 타임아웃 — 클릭 시도 계속');
        }

        // (6) 모달 "출간하기" 클릭 (마지막 버튼)
        console.log('[Velog] 모달 출간하기 클릭...');
        const btns2 = await page.$$('button');
        let lastPub = null;
        for (const btn of btns2) {
            const text = await page.evaluate(el => el.textContent.trim(), btn);
            if (text === '출간하기') lastPub = btn;
        }
        if (lastPub) {
            await lastPub.click();
            console.log('[Velog] ✅ 출간하기 클릭!');
        }

        // 발행 완료 대기
        await new Promise(r => setTimeout(r, 3000));
        try {
            await page.waitForFunction(
                () => !window.location.href.includes('/write'),
                { timeout: 20000 }
            );
        } catch {
            console.log('[Velog] URL 변경 타임아웃');
        }

        const finalUrl = page.url();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const isPublished = !finalUrl.includes('/write');

        console.log(`[Velog] 최종 URL: ${finalUrl}`);
        console.log(`[Velog] ${isPublished ? '✅ 발행 완료' : '⚠️ 발행 실패'} (${elapsed}s)`);

        await browser.close();

        let username = 'unknown';
        try { username = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')).username || 'unknown'; } catch { }

        return {
            success: isPublished,
            postUrl: isPublished ? finalUrl : `https://velog.io/@${username}`,
            platform: 'velog',
            method: 'puppeteer',
            elapsed: `${elapsed}s`,
            message: isPublished ? '✅ 벨로그에 발행되었습니다!' : '⚠️ Cloudflare 인증 실패. 브라우저에서 직접 확인해주세요.',
        };
    } catch (e) {
        console.error('[Velog] 발행 실패:', e.message);
        if (browser) await browser.close();
        return { success: false, error: `벨로그 발행 실패: ${e.message}` };
    }
}

// ─── 연결 테스트 ───

export async function testVelogConnection() {
    const { cookies, error } = loadCookies();
    if (error) return { success: false, error };

    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    try {
        const res = await fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookieString },
            body: JSON.stringify({ query: '{ currentUser { id username display_name } }' }),
        });
        const buf = await res.arrayBuffer();
        const data = JSON.parse(Buffer.from(buf).toString('utf-8'));

        if (!data?.data?.currentUser) {
            return { success: false, error: '세션 만료. `node velog-login.mjs` 재실행 필요.' };
        }
        return {
            success: true,
            username: data.data.currentUser.username,
            displayName: data.data.currentUser.display_name || data.data.currentUser.username,
        };
    } catch (e) {
        return { success: false, error: `연결 실패: ${e.message}` };
    }
}
