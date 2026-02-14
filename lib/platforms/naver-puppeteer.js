/**
 * 네이버 블로그 Puppeteer 기반 자동 발행
 * — headless Chrome으로 SmartEditor ONE 직접 제어
 * — Chrome 프로필로 쿠키 영구 유지
 * 
 * 셀렉터 분석 결과 (2026-02-11):
 *   제목: .se-title-text (DIV, contenteditable)
 *   본문: .se-text-paragraph (P, contenteditable inherit)
 *   발행: .publish_btn__m9KHH → button text "발행"
 *   저장: .save_btn__bzc5B → button text "저장"
 *   사진: .se-image-toolbar-button (파일 업로드)
 */
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NAVER_BLOG_URL = 'https://blog.naver.com';
const TIMEOUT = 30000;

// Chrome 프로필 저장 경로
const PROFILE_DIR = path.resolve(__dirname, '../../.naver-chrome-profile');
const SESSION_FILE = path.resolve(__dirname, '../../.naver-session.json');

// ─── 세션 관리 ───

/**
 * 저장된 세션 정보 로드
 */
function loadSession() {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        }
    } catch { /* ignore */ }
    return null;
}

/**
 * 세션 정보 저장
 */
function saveSession(data) {
    try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify({
            ...data,
            lastUpdated: new Date().toISOString(),
        }, null, 2));
    } catch (e) {
        console.error('[Naver] 세션 저장 실패:', e.message);
    }
}

/**
 * 쿠키 문자열 → Puppeteer 쿠키 객체 배열
 */
function parseCookies(cookieStr) {
    if (!cookieStr) return [];
    return cookieStr.split(';').map(c => c.trim()).filter(Boolean).map(c => {
        const [name, ...rest] = c.split('=');
        return {
            name: name.trim(),
            value: rest.join('=').trim(),
            domain: '.naver.com',
            path: '/',
            httpOnly: true,
            secure: true,
        };
    });
}

// ─── 브라우저 시작 ───

/**
 * Puppeteer 기본 옵션
 */
function getLaunchOptions(headless, useProfile) {
    const opts = {
        headless: headless ? 'new' : false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-popup-blocking',
            '--window-size=1280,900',
        ],
        defaultViewport: { width: 1280, height: 900 },
        protocolTimeout: 60000,
        ignoreDefaultArgs: ['--enable-automation'],
    };

    if (useProfile) {
        // 프로필 디렉토리가 없으면 생성
        if (!fs.existsSync(PROFILE_DIR)) {
            fs.mkdirSync(PROFILE_DIR, { recursive: true });
        }
        opts.userDataDir = PROFILE_DIR;
    }

    return opts;
}

/**
 * 봇 탐지 우회 설정
 */
async function setupAntiDetect(page) {
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
    });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // ★ 불필요 리소스 차단 (속도 최적화)
    await page.setRequestInterception(true);
    const BLOCKED_DOMAINS = ['google-analytics', 'googletagmanager', 'facebook', 'doubleclick', 'adsense'];
    page.on('request', req => {
        const url = req.url();
        const type = req.resourceType();
        if (['image', 'font', 'media'].includes(type) || BLOCKED_DOMAINS.some(d => url.includes(d))) {
            req.abort();
        } else {
            req.continue();
        }
    });
}

/**
 * 브라우저 시작
 * @param {Object} opts
 * @param {string} [opts.cookies] — 쿠키 문자열 (프로필 모드에서도 폴백으로 주입)
 * @param {boolean} [opts.headless=true]
 * @param {boolean} [opts.useProfile=true] — Chrome 프로필 사용 여부
 */
async function launchBrowser(opts = {}) {
    const { cookies, headless = true, useProfile = true } = opts;

    const browser = await puppeteer.launch(getLaunchOptions(headless, useProfile));
    const page = await browser.newPage();
    await setupAntiDetect(page);

    // 1. 먼저 naver.com으로 이동 (쿠키 도메인 설정용)
    try {
        await page.goto('https://www.naver.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
        console.log('[Naver] naver.com 접속 에러:', e.message);
    }

    // 2. CDP를 사용하여 쿠키 직접 주입 (HttpOnly 포함, 도메인 정확)
    const cdpCookieFile = path.resolve(__dirname, '../../.naver-cookies.json');
    let cdpInjected = false;
    try {
        if (fs.existsSync(cdpCookieFile)) {
            const cdpCookies = JSON.parse(fs.readFileSync(cdpCookieFile, 'utf-8'));
            const client = await page.createCDPSession();

            // Network.setCookies는 도메인이 정확하게 설정된 쿠키를 브라우저에 주입
            const cookiesToSet = cdpCookies.filter(c => c.name && c.value && c.domain).map(c => ({
                name: c.name,
                value: c.value,
                domain: c.domain,
                path: c.path || '/',
                httpOnly: !!c.httpOnly,
                secure: !!c.secure,
                sameSite: c.sameSite === 'None' ? 'None' : c.sameSite === 'Lax' ? 'Lax' : 'Lax',
                expires: c.expires && c.expires > 0 ? c.expires : undefined,
            }));

            if (cookiesToSet.length > 0) {
                await client.send('Network.setCookies', { cookies: cookiesToSet });
                cdpInjected = true;
                console.log(`[Naver] CDP 쿠키 ${cookiesToSet.length}개 주입 완료`);

                // 주입 후 naver.com 새로고침으로 쿠키 적용
                await page.goto('https://www.naver.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
                await new Promise(r => setTimeout(r, 1000));
            }

            await client.detach();
        }
    } catch (e) {
        console.log('[Naver] CDP 쿠키 로드 실패:', e.message);
    }

    // 3. 문자열 쿠키 폴백 (page.setCookie 사용)
    if (!cdpInjected && cookies) {
        try {
            await page.setCookie(...parseCookies(cookies));
            console.log('[Naver] 문자열 쿠키 주입 완료');
        } catch (e) {
            console.log('[Naver] 쿠키 주입 실패:', e.message);
        }
    }

    return { browser, page };
}

/**
 * 로그인 상태 체크
 */
async function isLoggedIn(page) {
    const url = page.url();
    return !url.includes('nidlogin') && !url.includes('login.naver');
}

// ─── 네이버 로그인 (최초 1회) ───

/**
 * 네이버 로그인 — 브라우저를 열어서 사용자가 직접 로그인
 * Chrome 프로필에 쿠키가 저장되어 이후 자동 유지
 * 
 * @returns {{ success: boolean, blogId?: string, error?: string }}
 */
export async function naverLogin() {
    let browser;
    try {
        console.log('[Naver] 🔐 로그인 브라우저 열기...');
        console.log('[Naver] 브라우저가 열리면 네이버에 로그인해주세요.');
        console.log('[Naver] 로그인 완료 후 자동으로 감지됩니다.\n');

        const { browser: b, page } = await launchBrowser({
            headless: false, // 화면 보이기
            useProfile: true,
        });
        browser = b;

        // 네이버 로그인 페이지로 이동
        await page.goto('https://nid.naver.com/nidlogin.login', {
            waitUntil: 'networkidle2',
            timeout: TIMEOUT,
        });

        // 이미 로그인된 상태인지 확인
        if (await isLoggedIn(page)) {
            console.log('[Naver] ✅ 이미 로그인된 상태입니다!');
        } else {
            // 사용자가 로그인할 때까지 대기 (최대 5분)
            console.log('[Naver] ⏳ 로그인 대기 중... (최대 5분)');

            let loggedIn = false;
            for (let i = 0; i < 60; i++) { // 5초 * 60 = 5분
                await new Promise(r => setTimeout(r, 5000));

                const currentUrl = page.url();
                if (!currentUrl.includes('nidlogin') && !currentUrl.includes('login.naver')) {
                    loggedIn = true;
                    break;
                }
            }

            if (!loggedIn) {
                return { success: false, error: '로그인 시간 초과 (5분)' };
            }
            console.log('[Naver] ✅ 로그인 감지!');
        }

        // blogId 추출
        await page.goto('https://m.blog.naver.com/', {
            waitUntil: 'networkidle2',
            timeout: TIMEOUT,
        });
        await new Promise(r => setTimeout(r, 2000));

        const finalUrl = page.url();
        const match = finalUrl.match(/blog\.naver\.com\/([a-zA-Z0-9_]+)/);
        const blogId = match ? match[1] : null;

        // 세션 정보 저장
        saveSession({
            blogId,
            loggedIn: true,
            loginMethod: 'chrome-profile',
            profileDir: PROFILE_DIR,
        });

        console.log(`[Naver] 🎉 로그인 완료! blogId: ${blogId}`);
        console.log(`[Naver] 프로필 저장 위치: ${PROFILE_DIR}`);
        console.log('[Naver] 이제 브라우저를 닫습니다. 이후 자동으로 쿠키가 유지됩니다.\n');

        return { success: true, blogId };

    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        if (browser) await browser.close();
    }
}

// ─── 세션 Keep-Alive ───

let keepAliveInterval = null;

/**
 * 세션 유지 — 30분마다 네이버에 접속하여 쿠키 갱신
 */
export function startKeepAlive(intervalMs = 30 * 60 * 1000) {
    if (keepAliveInterval) {
        console.log('[Naver] Keep-alive 이미 실행 중');
        return;
    }

    console.log(`[Naver] 🔄 Keep-alive 시작 (${intervalMs / 60000}분 간격)`);

    keepAliveInterval = setInterval(async () => {
        try {
            const { browser, page } = await launchBrowser({ headless: true, useProfile: true });
            await page.goto('https://blog.naver.com', {
                waitUntil: 'domcontentloaded',
                timeout: 15000,
            });

            const loggedIn = await isLoggedIn(page);
            console.log(`[Naver] Keep-alive: ${loggedIn ? '✅ 세션 유지' : '❌ 로그아웃됨'} — ${new Date().toLocaleTimeString()}`);

            if (!loggedIn) {
                saveSession({ ...loadSession(), loggedIn: false });
            }

            await browser.close();
        } catch (e) {
            console.error('[Naver] Keep-alive 에러:', e.message);
        }
    }, intervalMs);
}

/**
 * Keep-alive 중지
 */
export function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        console.log('[Naver] Keep-alive 중지');
    }
}

// ─── 자동 발행 ───

/**
 * 네이버 블로그에 자동 발행
 * @param {Object} opts
 * @param {string} [opts.cookies] — 쿠키 문자열 (프로필 모드에서는 선택)
 * @param {string} opts.blogId — 블로그 ID
 * @param {string} opts.title — 제목  
 * @param {string} opts.content — 본문 (plain text → 줄바꿈은 Enter로 처리)
 * @param {string[]} opts.tags — 태그 배열
 * @param {string[]} [opts.images] — 로컬 이미지 파일 경로 배열
 * @param {boolean} [opts.headless=true]
 * @param {boolean} [opts.useProfile=true] — Chrome 프로필 사용
 */
export async function publishToNaverPuppeteer(opts) {
    const { cookies, blogId, title, content, tags = [], images = [], headless = true, useProfile = true } = opts;

    if (!blogId || !title || !content) {
        return { success: false, error: '필수 파라미터 누락 (blogId, title, content)' };
    }

    // 프로필 모드가 아닌데 쿠키도 없으면 실패
    if (!useProfile && !cookies) {
        return { success: false, error: '쿠키가 필요합니다. 프로필 모드를 사용하거나 쿠키를 제공해주세요.' };
    }

    let browser;
    try {
        const result = await launchBrowser({ cookies, headless, useProfile });
        browser = result.browser;
        const page = result.page;

        // ===== STEP 1: 에디터 접속 (필요시 인라인 로그인) =====
        console.log('[Naver] 1/7 에디터 접속...');

        // ★ 다이얼로그 자동 dismiss (임시저장 복구 팝업 등)
        page.on('dialog', async dialog => {
            console.log(`[Naver] 다이얼로그 감지: "${dialog.message()}" → 취소`);
            await dialog.dismiss();
        });

        try {
            await page.goto(`${NAVER_BLOG_URL}/${blogId}/postwrite`, {
                waitUntil: 'domcontentloaded',
                timeout: TIMEOUT,
            });
        } catch (navErr) {
            console.log(`[Naver] 네비게이션: ${navErr.message} — 계속 진행`);
        }

        // 로그인 체크 — 실패 시 인라인 로그인 시도
        if (!await isLoggedIn(page)) {
            console.log('[Naver] 로그인 필요 — 인라인 로그인 시도...');

            // 1. 네이버 로그인 페이지에서 자동 로그인 대기
            try {
                // 로그인 페이지에서 이미 있을 수 있음 (리다이렉트)
                const currentUrl = page.url();
                if (!currentUrl.includes('nidlogin')) {
                    await page.goto('https://nid.naver.com/nidlogin.login', {
                        waitUntil: 'domcontentloaded',
                        timeout: 15000,
                    });
                }

                // Chrome 프로필의 자동 로그인 대기 (최대 30초)
                console.log('[Naver] 자동 로그인 대기 중... (최대 30초)');
                for (let i = 0; i < 30; i++) {
                    await new Promise(r => setTimeout(r, 1000));
                    const url = page.url();
                    // 로그인 성공하면 naver.com 으로 리다이렉트
                    if (!url.includes('nidlogin') && !url.includes('login.naver')) {
                        console.log('[Naver] ✅ 자동 로그인 성공!');
                        break;
                    }
                    if (i === 29) {
                        console.log('[Naver] ⏰ 자동 로그인 타임아웃');
                    }
                }
            } catch (loginErr) {
                console.log(`[Naver] 로그인 시도 에러: ${loginErr.message}`);
            }

            // 2. 로그인 후 에디터 페이지 다시 접속
            try {
                await page.goto(`${NAVER_BLOG_URL}/${blogId}/postwrite`, {
                    waitUntil: 'domcontentloaded',
                    timeout: TIMEOUT,
                });
            } catch (navErr) {
                console.log(`[Naver] 에디터 재접속: ${navErr.message}`);
            }

            // 3. 최종 로그인 확인
            if (!await isLoggedIn(page)) {
                await saveScreenshot(page, 'login_failed');
                return { success: false, error: '로그인 필요. naver-login.mjs를 실행하여 Chrome 프로필에 로그인 정보를 저장하세요.' };
            }
        }
        await new Promise(r => setTimeout(r, 1000));

        // ===== STEP 2: 작성 중 팝업 처리 (취소 클릭) =====
        console.log('[Naver] 2/7 팝업 처리...');
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.textContent.trim() === '취소') {
                    btn.click();
                    return;
                }
            }
        });
        await new Promise(r => setTimeout(r, 1500));

        // ===== STEP 3: 제목 입력 =====
        console.log('[Naver] 3/7 제목 입력...');
        const titleEl = await page.waitForSelector('.se-title-text', { timeout: TIMEOUT });
        await titleEl.click();
        await new Promise(r => setTimeout(r, 300));
        const titleP = await page.$('.se-title-text .se-text-paragraph');
        if (titleP) {
            await titleP.click();
        }
        await page.keyboard.type(title, { delay: 20 });
        await new Promise(r => setTimeout(r, 500));

        // ===== STEP 4: 본문 영역으로 이동 =====
        console.log('[Naver] 4/7 본문 영역 이동...');

        // 방법 1: se-component.se-text 중 제목이 아닌 것 찾기
        let bodyClicked = await page.evaluate(() => {
            // 제목이 아닌 텍스트 컴포넌트 찾기
            const comps = document.querySelectorAll('.se-component.se-text');
            for (const comp of comps) {
                if (!comp.classList.contains('se-title-text') && !comp.closest('.se-title')) {
                    const p = comp.querySelector('.se-text-paragraph');
                    if (p) { p.click(); p.focus(); return 'comp-paragraph'; }
                    comp.click();
                    return 'comp-direct';
                }
            }
            return null;
        });

        // 방법 2: se-module-text 중 제목이 아닌 것
        if (!bodyClicked) {
            bodyClicked = await page.evaluate(() => {
                const mods = document.querySelectorAll('.se-module-text');
                for (const mod of mods) {
                    if (!mod.closest('.se-title-text') && !mod.closest('.se-title')) {
                        const p = mod.querySelector('.se-text-paragraph');
                        if (p) { p.click(); p.focus(); return 'mod-paragraph'; }
                        mod.click();
                        return 'mod-direct';
                    }
                }
                return null;
            });
        }

        // 방법 3: contenteditable body 영역 직접 클릭
        if (!bodyClicked) {
            bodyClicked = await page.evaluate(() => {
                const editables = document.querySelectorAll('[contenteditable="true"]');
                for (const el of editables) {
                    if (!el.closest('.se-title-text') && !el.closest('.se-title')) {
                        el.click();
                        el.focus();
                        return 'contenteditable';
                    }
                }
                return null;
            });
        }

        // 방법 4: se-content 영역 클릭 후 제목 아래로 커서 이동
        if (!bodyClicked) {
            bodyClicked = await page.evaluate(() => {
                const contentArea = document.querySelector('.se-content');
                if (contentArea) { contentArea.click(); return 'se-content'; }
                return null;
            });
        }

        // 방법 5: 제목 영역에서 Tab 키로 본문으로 이동
        if (!bodyClicked) {
            console.log('[Naver] 4/7 폴백: 제목에서 Tab으로 본문 이동...');
            // 제목 영역 다시 클릭 후 Tab
            const titleP2 = await page.$('.se-title-text .se-text-paragraph');
            if (titleP2) {
                await titleP2.click();
                await page.keyboard.press('End');
                await page.keyboard.press('Tab');
                bodyClicked = 'tab-from-title';
            }
        }

        console.log(`  본문 클릭: ${bodyClicked}`);
        await new Promise(r => setTimeout(r, 500));

        // 커서가 제목이 아닌 본문에 있는지 확인
        const cursorInBody = await page.evaluate(() => {
            const sel = window.getSelection();
            if (sel && sel.focusNode) {
                const inTitle = sel.focusNode.closest?.('.se-title-text') ||
                    sel.focusNode.parentElement?.closest?.('.se-title-text');
                return !inTitle;
            }
            return false;
        });
        if (!cursorInBody) {
            console.log('[Naver] ⚠️ 커서가 본문이 아닌 곳에 있습니다. Enter로 이동 시도...');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 300));
        }

        // ===== STEP 5: 이미지 업로드 (본문 앞에 삽입) =====
        if (images.length > 0) {
            console.log(`[Naver] 5/7 이미지 ${images.length}개 업로드...`);
            for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
                let imgPath = images[imgIdx];
                try {
                    // URL 경로 → 로컬 파일 경로 변환
                    if (imgPath.startsWith('/uploads/')) {
                        imgPath = path.resolve(process.cwd(), 'public', imgPath.slice(1)); // /uploads/x → public/uploads/x
                        console.log(`  이미지 경로 변환: ${images[imgIdx]} → ${imgPath}`);
                    } else if (imgPath.startsWith('/')) {
                        imgPath = path.resolve(process.cwd(), 'public', imgPath.slice(1));
                    }

                    // 파일 존재 확인
                    if (!fs.existsSync(imgPath)) {
                        console.log(`  ⚠️ 이미지 파일 없음: ${imgPath} — 스킵`);
                        continue;
                    }

                    // 이미지 툴바 버튼 클릭
                    const imgBtn = await page.$('.se-image-toolbar-button');
                    if (imgBtn) {
                        await imgBtn.click();
                        console.log('  이미지 버튼 클릭 완료');
                        await new Promise(r => setTimeout(r, 2000));

                        // 파일 input이 동적으로 생성될 때까지 대기
                        const fileInput = await page.waitForSelector('input[type="file"]', {
                            timeout: 5000,
                        }).catch(() => null);

                        if (fileInput) {
                            await fileInput.uploadFile(imgPath);
                            console.log(`  파일 선택: ${imgPath}`);

                            // 이미지가 에디터에 로드될 때까지 대기
                            await page.waitForSelector('.se-module-image img, .se-image-resource', {
                                timeout: 15000,
                            }).catch(() => null);
                            console.log('  이미지 로드 완료');
                            await new Promise(r => setTimeout(r, 2000));
                        } else {
                            console.log('  file input을 찾을 수 없습니다');

                            // 대체 방법: 로컬 이미지 업로드 커버 버튼
                            const coverBtn = await page.$('.se-cover-button-local-image-upload');
                            if (coverBtn) {
                                await coverBtn.click();
                                await new Promise(r => setTimeout(r, 1000));
                                const fi = await page.waitForSelector('input[type="file"]', { timeout: 5000 }).catch(() => null);
                                if (fi) {
                                    await fi.uploadFile(imgPath);
                                    console.log(`  커버 버튼으로 업로드: ${imgPath}`);
                                    await new Promise(r => setTimeout(r, 5000));
                                }
                            }
                        }
                    } else {
                        console.log('  이미지 버튼을 찾을 수 없습니다');
                    }
                } catch (e) {
                    console.log(`  이미지 실패: ${e.message}`);
                }
            }
        } else {
            console.log('[Naver] 5/7 이미지 스킵');
        }

        // ===== 에러 팝업 닫기 (이미지 전송 오류 등) =====
        for (let attempt = 0; attempt < 3; attempt++) {
            const dismissed = await page.evaluate(() => {
                // "파일 전송 오류" 또는 다른 에러 팝업의 "확인" 버튼 찾아 클릭
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                    const text = btn.textContent.trim();
                    const parent = btn.closest('[class*="layer"], [class*="popup"], [class*="modal"], [class*="dialog"], [class*="toast"]');
                    if (parent && (text === '확인' || text === 'OK' || text === '닫기')) {
                        btn.click();
                        return text;
                    }
                }
                // 폴백: class에 confirm이 포함된 버튼
                for (const btn of buttons) {
                    if (btn.className.includes('confirm') && btn.offsetParent) {
                        btn.click();
                        return 'confirm-class';
                    }
                }
                return null;
            });
            if (dismissed) {
                console.log(`[Naver] 팝업 닫기: ${dismissed} (시도 ${attempt + 1})`);
                await new Promise(r => setTimeout(r, 500));
            } else {
                break;
            }
        }

        // "요청하신 작업이 진행 중입니다" 경고 사라질 때까지 대기
        await new Promise(r => setTimeout(r, 1000));

        // ===== STEP 5.5: 본문 텍스트 입력 =====
        console.log('[Naver] 5.5/7 본문 텍스트 입력...');
        // 이미지 업로드 후 커서가 이동했을 수 있으므로 본문 영역 다시 클릭
        let bodyRefocused = await page.evaluate(() => {
            // 방법 1: se-component.se-text
            const comps = document.querySelectorAll('.se-component.se-text');
            for (const comp of comps) {
                if (!comp.classList.contains('se-title-text') && !comp.closest('.se-title')) {
                    const p = comp.querySelector('.se-text-paragraph');
                    if (p) { p.click(); p.focus(); return 'comp'; }
                }
            }
            // 방법 2: se-module-text
            const mods = document.querySelectorAll('.se-module-text');
            for (const mod of mods) {
                if (!mod.closest('.se-title-text') && !mod.closest('.se-title')) {
                    const p = mod.querySelector('.se-text-paragraph');
                    if (p) { p.click(); p.focus(); return 'mod'; }
                }
            }
            // 방법 3: contenteditable
            const editables = document.querySelectorAll('[contenteditable="true"]');
            for (const el of editables) {
                if (!el.closest('.se-title-text') && !el.closest('.se-title')) {
                    el.click(); el.focus(); return 'editable';
                }
            }
            return null;
        });
        console.log(`  본문 재포커스: ${bodyRefocused}`);
        await new Promise(r => setTimeout(r, 300));

        // Enter로 이미지 아래 줄로 이동
        if (images.length > 0) {
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 300));
        }

        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim()) {
                await page.keyboard.type(lines[i], { delay: 5 });
            }
            if (i < lines.length - 1) {
                await page.keyboard.press('Enter');
            }
        }
        await new Promise(r => setTimeout(r, 500));

        // ===== STEP 6: 발행 버튼 클릭 → 발행 설정 패널 =====
        console.log('[Naver] 6/7 발행 버튼 클릭...');
        const publishClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.textContent.trim() === '발행' && btn.className.includes('publish_btn')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });

        if (!publishClicked) {
            return { success: false, error: '발행 버튼을 찾을 수 없습니다.' };
        }
        await new Promise(r => setTimeout(r, 2000));

        // ===== STEP 7: 발행 설정 + 태그 + 최종 확인 =====
        console.log('[Naver] 7/7 발행 설정 + 태그...');

        // 태그 입력
        if (tags.length > 0) {
            const tagInput = await page.$('input[placeholder*="태그"], input[placeholder*="tag"], .tag_input__');
            if (tagInput) {
                for (const tag of tags) {
                    await tagInput.type(tag, { delay: 20 });
                    await page.keyboard.press('Enter');
                    await new Promise(r => setTimeout(r, 200));
                }
                console.log(`  태그 ${tags.length}개 입력 완료`);
            } else {
                await page.evaluate(() => {
                    const inputs = document.querySelectorAll('input');
                    for (const input of inputs) {
                        const ph = input.placeholder || '';
                        if (ph.includes('태그') || ph.includes('tag') || input.className.includes('tag')) {
                            input.focus();
                            return true;
                        }
                    }
                    return false;
                });
            }
        }

        // 발행 설정 패널 스크롤
        await page.evaluate(() => {
            const panels = document.querySelectorAll('[class*="publish"], [class*="setting"], [class*="layer"], [class*="panel"]');
            for (const p of panels) {
                if (p.scrollHeight > p.clientHeight) {
                    p.scrollTop = p.scrollHeight;
                }
            }
        });
        await new Promise(r => setTimeout(r, 1000));

        // 최종 발행 확인 버튼
        const published = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const toolbarBtn = btns.find(b => b.className.includes('publish_btn__'));

            // 1순위: confirm_btn__ 클래스 (가장 확실)
            const confirmBtn = btns.find(b => b.className.includes('confirm_btn__'));
            if (confirmBtn) {
                confirmBtn.click();
                return `confirm:${confirmBtn.textContent.trim()}`;
            }

            // 2순위: 위치+텍스트 기반 (발행 설정 패널 내 버튼)
            for (const btn of btns) {
                if (btn === toolbarBtn) continue;
                const text = btn.textContent.trim();
                const rect = btn.getBoundingClientRect();
                if (rect.width > 50 && rect.height > 20 &&
                    (text === '발행' || text === '확인' || text === '발행하기' || text === '등록')) {
                    btn.click();
                    return `panel:${text}`;
                }
            }

            // 3순위: 클래스 기반
            for (const btn of btns) {
                if (btn === toolbarBtn) continue;
                const cls = btn.className;
                if (cls.includes('confirm') || cls.includes('submit') || cls.includes('_ok')) {
                    btn.click();
                    return `class:${btn.textContent.trim()}`;
                }
            }

            if (toolbarBtn) {
                toolbarBtn.click();
                return 'toolbar:발행(re-click)';
            }
            return null;
        });

        console.log(`  발행 클릭: ${published}`);

        // 스크린샷: 발행 클릭 직후
        try {
            const ssDir = path.resolve(process.cwd(), 'naver_debug_screenshots');
            if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
            await page.screenshot({ path: path.join(ssDir, 'after_confirm_click.png'), fullPage: false });
            console.log('[Naver] 스크린샷 저장: after_confirm_click.png');
        } catch (e) { console.log('[Naver] 스크린샷 에러:', e.message); }

        // 발행 후 페이지 이동 대기 (waitForNavigation + polling)
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        } catch {
            // 네비게이션 타임아웃 — polling으로 대체
            console.log('[Naver] 네비게이션 타임아웃, polling 전환');
        }

        // 스크린샷: 네비게이션 대기 후
        try {
            const ssDir = path.resolve(process.cwd(), 'naver_debug_screenshots');
            await page.screenshot({ path: path.join(ssDir, 'after_navigation_wait.png'), fullPage: false });
            console.log('[Naver] 스크린샷 저장: after_navigation_wait.png');
        } catch (e) { console.log('[Naver] 스크린샷 에러:', e.message); }

        // 에러 메시지 확인 (네이버 에디터 에러 토스트)
        const pageError = await page.evaluate(() => {
            // 에러 토스트/알림 확인
            const errorEls = document.querySelectorAll('[class*="error"], [class*="alert"], [class*="toast"], [class*="warning"]');
            for (const el of errorEls) {
                const text = el.textContent.trim();
                if (text && el.offsetParent) return text.substring(0, 200);
            }
            return null;
        });
        if (pageError) {
            console.log('[Naver] 에러 감지:', pageError);
        }

        // 추가 확인 다이얼로그
        await page.evaluate(() => {
            for (const btn of document.querySelectorAll('button')) {
                const text = btn.textContent.trim();
                if (text === '확인' || text === '발행') { btn.click(); return; }
            }
        });

        // URL 변경 대기 (최대 20초 polling)
        let finalUrl = page.url();
        console.log('[Naver] URL polling 시작:', finalUrl);
        for (let i = 0; i < 40; i++) {
            if (!finalUrl.includes('/postwrite')) break;
            await new Promise(r => setTimeout(r, 500));
            finalUrl = page.url();
        }
        console.log('[Naver] 최종 URL:', finalUrl);

        const logNoMatch = finalUrl.match(/\/(\d{10,})/) || finalUrl.match(/logNo=(\d+)/);

        if (logNoMatch) {
            const postUrl = `${NAVER_BLOG_URL}/${blogId}/${logNoMatch[1]}`;
            console.log(`[Naver] ✅ 발행 성공: ${postUrl}`);
            return { success: true, postUrl, logNo: logNoMatch[1] };
        }

        // URL 리다이렉트 없는 경우 — 실제로 발행됐는지 블로그 확인
        if (published) {
            console.log('[Naver] URL 미변경. 블로그에서 직접 확인 중...');
            try {
                const checkPage = await browser.newPage();
                await checkPage.setCookie(...parseCookies(cookies || ''));
                await checkPage.goto(`${NAVER_BLOG_URL}/PostList.naver?blogId=${blogId}&categoryNo=0&from=postList`, {
                    waitUntil: 'networkidle2',
                    timeout: 15000,
                });
                const latestPost = await checkPage.evaluate((titleText) => {
                    const links = document.querySelectorAll('a[href*="logNo="], a[class*="title"]');
                    for (const link of links) {
                        const href = link.href || '';
                        const logMatch = href.match(/logNo=(\d+)/);
                        if (logMatch) {
                            return { logNo: logMatch[1], title: link.textContent.trim().substring(0, 50) };
                        }
                    }
                    // 페이지 내 어떤 포스트 링크든 찾기
                    const anyLink = document.querySelector('.pcol2 a, .title a, a[href*="/PostView"]');
                    if (anyLink) {
                        const m = (anyLink.href || '').match(/\/(\d{10,})/);
                        return m ? { logNo: m[1], title: anyLink.textContent.trim().substring(0, 50) } : null;
                    }
                    return null;
                }, title);
                await checkPage.close();

                if (latestPost) {
                    const postUrl = `${NAVER_BLOG_URL}/${blogId}/${latestPost.logNo}`;
                    console.log(`[Naver] ✅ 블로그 확인 발행 성공: ${postUrl} (${latestPost.title})`);
                    return { success: true, postUrl, logNo: latestPost.logNo };
                }
            } catch (checkErr) {
                console.log('[Naver] 블로그 확인 실패:', checkErr.message);
            }
        }

        // 진짜 최종 폴백 — 발행 안 됐을 가능성 높음
        console.log('[Naver] ❌ 발행 확인 실패. URL:', finalUrl, 'published:', published);
        return {
            success: false,
            error: '발행 버튼은 클릭되었으나 실제 발행이 확인되지 않았습니다.',
            finalUrl,
            published,
            message: '수동 확인 필요 — 블로그에서 직접 확인해주세요.',
        };

    } catch (error) {
        console.error('[Naver] 에러:', error.message);
        return { success: false, error: error.message };
    } finally {
        if (browser) await browser.close();
    }
}


// ─── 유틸리티 ───

/**
 * 에디터 접근 테스트
 */
export async function testNaverAccess(cookies, blogId) {
    let browser;
    try {
        const { browser: b, page } = await launchBrowser({
            cookies,
            headless: true,
            useProfile: !!fs.existsSync(PROFILE_DIR),
        });
        browser = b;

        await page.goto(`${NAVER_BLOG_URL}/${blogId}/postwrite`, {
            waitUntil: 'networkidle2',
            timeout: TIMEOUT,
        });
        await new Promise(r => setTimeout(r, 2000));

        const loggedIn = await isLoggedIn(page);
        return {
            success: loggedIn,
            url: page.url(),
            message: loggedIn ? '✅ 에디터 접근 성공' : '❌ 로그인 필요',
        };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * blogId 자동 감지
 */
export async function detectBlogId(cookies) {
    let browser;
    try {
        const { browser: b, page } = await launchBrowser({
            cookies,
            headless: true,
            useProfile: !!fs.existsSync(PROFILE_DIR),
        });
        browser = b;

        await page.goto('https://m.blog.naver.com/', {
            waitUntil: 'networkidle2',
            timeout: TIMEOUT,
        });

        const finalUrl = page.url();
        const match = finalUrl.match(/blog\.naver\.com\/([a-zA-Z0-9_]+)/);

        if (match) return { success: true, blogId: match[1] };

        const blogId = await page.evaluate(() => {
            const m = document.body.innerHTML.match(/blog\.naver\.com\/([a-zA-Z0-9_]{3,30})/);
            return m ? m[1] : null;
        });

        return blogId
            ? { success: true, blogId }
            : { success: false, error: 'blogId를 찾을 수 없습니다' };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * 세션 상태 확인
 */
export function getSessionStatus() {
    const session = loadSession();
    const profileExists = fs.existsSync(PROFILE_DIR);

    return {
        profileExists,
        profileDir: PROFILE_DIR,
        session,
        loggedIn: session?.loggedIn || false,
        blogId: session?.blogId || null,
        lastUpdated: session?.lastUpdated || null,
    };
}

export default {
    publishToNaverPuppeteer,
    naverLogin,
    testNaverAccess,
    detectBlogId,
    getSessionStatus,
    startKeepAlive,
    stopKeepAlive,
};
