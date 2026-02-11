/**
 * 티스토리 블로그 Puppeteer 기반 자동 발행
 * — Open API 종료 대응: headless Chrome으로 에디터 직접 제어
 * — 쿠키 기반 카카오 인증 유지
 * 
 * 티스토리 에디터 셀렉터:
 *   제목: #post-title-field (textarea)
 *   본문: .ProseMirror (contenteditable div)
 *   태그: #tag-field (input)
 *   발행: .btn-publish → 발행 사이드바 → 공개 설정 → 발행 확인
 */
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIMEOUT = 30000;
const PROFILE_DIR = path.resolve(__dirname, '../../.tistory-chrome-profile');
const SESSION_FILE = path.resolve(__dirname, '../../.tistory-session.json');

// ─── 세션 관리 ───

function loadSession() {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        }
    } catch { /* ignore */ }
    return null;
}

function saveSession(data) {
    try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify({
            ...data,
            lastUpdated: new Date().toISOString(),
        }, null, 2));
    } catch { /* ignore */ }
}

// ─── 브라우저 시작 ───

async function launchBrowser({ headless = true, useProfile = false } = {}) {
    const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1280,900',
    ];

    const options = {
        headless: headless ? 'new' : false,
        args,
        defaultViewport: { width: 1280, height: 900 },
        ignoreDefaultArgs: ['--enable-automation'],
    };

    if (useProfile) {
        if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });
        options.userDataDir = PROFILE_DIR;
    }

    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();

    // 봇 탐지 우회
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
    });

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    return { browser, page };
}

// ─── 쿠키 주입 ───

async function injectCookies(page, cookieString) {
    if (!cookieString) return;

    const cookies = cookieString.split(';').map(c => {
        const [name, ...val] = c.trim().split('=');
        return name ? { name: name.trim(), value: val.join('=').trim(), domain: '.tistory.com' } : null;
    }).filter(Boolean);

    if (cookies.length > 0) {
        await page.setCookie(...cookies);
        console.log(`[Tistory] 쿠키 ${cookies.length}개 주입 완료`);
    }
}

// ─── 에러 팝업 dismiss ───

async function dismissPopups(page) {
    try {
        await page.evaluate(() => {
            // 일반 alert/confirm 팝업
            for (const btn of document.querySelectorAll('button, a')) {
                const text = btn.textContent?.trim();
                if (text === '확인' || text === 'OK' || text === '닫기' || text === 'Close') {
                    const dialog = btn.closest('.layer, .popup, .modal, [role="dialog"], .alert');
                    if (dialog) { btn.click(); return; }
                }
            }
        });
    } catch { /* ignore */ }
}

// ─── 스크린샷 유틸 ───

async function saveScreenshot(page, name) {
    try {
        const ssDir = path.resolve(process.cwd(), 'tistory_debug_screenshots');
        if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
        await page.screenshot({ path: path.join(ssDir, `${name}.png`), fullPage: false });
        console.log(`[Tistory] 스크린샷: ${name}.png`);
    } catch (e) {
        console.log(`[Tistory] 스크린샷 에러: ${e.message}`);
    }
}

// ─── 블로그 ID 감지 ───

export async function detectBlogId(page) {
    try {
        const url = page.url();
        // xxx.tistory.com/manage... 패턴
        const match = url.match(/^https?:\/\/([^.]+)\.tistory\.com/);
        if (match) return match[1];

        // 대시보드에서 블로그 목록 확인
        const blogId = await page.evaluate(() => {
            // 블로그 관리 메뉴에서 블로그명 추출
            const el = document.querySelector('[data-blog-name], .blog_name, .tit_blog');
            if (el) return el.textContent?.trim() || el.getAttribute('data-blog-name');
            return null;
        });
        return blogId;
    } catch { return null; }
}

// ─── 세션 상태 확인 ───

export function getSessionStatus() {
    const session = loadSession();
    return {
        profileExists: fs.existsSync(PROFILE_DIR),
        blogId: session?.blogId || null,
        lastLogin: session?.lastLogin || null,
        lastUpdated: session?.lastUpdated || null,
    };
}

// ─── 카카오 로그인 (최초 1회, headless: false 필요) ───

export async function tistoryLogin({ blogName } = {}) {
    console.log('[Tistory] 로그인 시작 (브라우저 열림)...');
    const { browser, page } = await launchBrowser({ headless: false, useProfile: true });

    try {
        await page.goto('https://www.tistory.com/auth/login', { waitUntil: 'networkidle2', timeout: TIMEOUT });
        console.log('[Tistory] 카카오 로그인 페이지. 수동으로 로그인하세요...');

        // 사용자가 로그인할 때까지 대기 (manage 페이지로 리다이렉트)
        await page.waitForFunction(
            () => window.location.href.includes('tistory.com/manage') || window.location.href.includes('tistory.com/'),
            { timeout: 120000 }
        );

        console.log('[Tistory] 로그인 감지!');
        const detectedBlogId = await detectBlogId(page) || blogName;

        if (detectedBlogId) {
            saveSession({
                blogId: detectedBlogId,
                lastLogin: new Date().toISOString(),
                loginMethod: 'kakao-manual',
            });
            console.log(`[Tistory] 세션 저장: blogId=${detectedBlogId}`);
        }

        await browser.close();
        return { success: true, blogId: detectedBlogId };
    } catch (err) {
        await browser.close();
        return { success: false, error: err.message };
    }
}

// ─── 메인: 글 발행 ───

export async function publishToTistoryPuppeteer({
    cookies = '',
    blogId,
    title = '',
    content = '',
    tags = [],
    images = [],
    headless = true,
    useProfile = false,
}) {
    console.log(`[Tistory] 자동발행 시작: blogId=${blogId}, title="${title.substring(0, 30)}"`);

    const { browser, page } = await launchBrowser({ headless, useProfile });

    try {
        // STEP 1: 쿠키 주입
        if (cookies && !useProfile) {
            await injectCookies(page, cookies);
        }

        // STEP 2: 에디터 페이지로 이동
        const editorUrl = `https://${blogId}.tistory.com/manage/newpost`;
        console.log(`[Tistory] 에디터 이동: ${editorUrl}`);
        await page.goto(editorUrl, { waitUntil: 'networkidle2', timeout: TIMEOUT });
        await new Promise(r => setTimeout(r, 2000));

        await saveScreenshot(page, '01_editor_loaded');

        // 로그인 체크 — 로그인 안 됐으면 리다이렉트됨
        const currentUrl = page.url();
        if (currentUrl.includes('/auth/login') || currentUrl.includes('accounts.kakao.com')) {
            await browser.close();
            return {
                success: false,
                error: '티스토리 로그인이 필요합니다. 설정에서 티스토리 로그인을 해주세요.',
                needLogin: true,
            };
        }

        // STEP 3: 제목 입력
        console.log('[Tistory] 3/6 제목 입력...');

        // 제목 셀렉터 후보들 (우선순위)
        const titleSelectors = [
            '#post-title-field',
            '.tit_post textarea',
            'textarea[placeholder*="제목"]',
            '.title-field textarea',
            '#title',
        ];

        let titleInput = null;
        for (const sel of titleSelectors) {
            titleInput = await page.$(sel);
            if (titleInput) {
                console.log(`  제목 셀렉터: ${sel}`);
                break;
            }
        }

        if (titleInput) {
            await titleInput.click();
            await titleInput.evaluate(el => { el.value = ''; });
            await page.keyboard.type(title, { delay: 30 });
            console.log(`  제목 입력 완료: "${title.substring(0, 30)}"`);
        } else {
            // contenteditable 방식일 수 있음
            const titleDiv = await page.$('[contenteditable][class*="title"], .tit_post [contenteditable]');
            if (titleDiv) {
                await titleDiv.click();
                await page.keyboard.down('Control');
                await page.keyboard.press('a');
                await page.keyboard.up('Control');
                await page.keyboard.type(title, { delay: 30 });
                console.log(`  제목 입력 (contenteditable): "${title.substring(0, 30)}"`);
            } else {
                console.log('  ⚠️ 제목 필드를 찾을 수 없습니다');
            }
        }

        await saveScreenshot(page, '02_title_entered');

        // STEP 4: 이미지 업로드 (본문 전에)
        if (images.length > 0) {
            console.log(`[Tistory] 4/6 이미지 ${images.length}개 업로드...`);
            for (let i = 0; i < images.length; i++) {
                let imgPath = images[i];
                try {
                    // URL → 로컬 경로 변환
                    if (imgPath.startsWith('/uploads/')) {
                        imgPath = path.resolve(process.cwd(), 'public', imgPath.slice(1));
                    } else if (imgPath.startsWith('/')) {
                        imgPath = path.resolve(process.cwd(), 'public', imgPath.slice(1));
                    }

                    if (!fs.existsSync(imgPath)) {
                        console.log(`  ⚠️ 이미지 없음: ${imgPath} — 스킵`);
                        continue;
                    }

                    // 이미지 버튼 클릭
                    const imgBtn = await page.$('button[data-name="image"], .btn_image, [aria-label*="이미지"], button.image');
                    if (imgBtn) {
                        await imgBtn.click();
                        await new Promise(r => setTimeout(r, 1000));

                        // 파일 input 찾기
                        const fileInput = await page.$('input[type="file"][accept*="image"]');
                        if (fileInput) {
                            await fileInput.uploadFile(imgPath);
                            console.log(`  이미지 ${i + 1}/${images.length} 업로드 중...`);
                            await new Promise(r => setTimeout(r, 3000)); // 업로드 대기

                            // 에러 팝업 처리
                            await dismissPopups(page);
                        }
                    }
                } catch (imgErr) {
                    console.log(`  이미지 ${i + 1} 에러: ${imgErr.message}`);
                    await dismissPopups(page);
                }
            }
        }

        // STEP 5: 본문 입력
        console.log('[Tistory] 5/6 본문 입력...');

        const bodySelectors = [
            '.ProseMirror',
            '.article-view [contenteditable]',
            '#content [contenteditable]',
            '.editor-content [contenteditable]',
            '[contenteditable="true"]',
        ];

        let bodyEditor = null;
        for (const sel of bodySelectors) {
            bodyEditor = await page.$(sel);
            if (bodyEditor) {
                console.log(`  본문 셀렉터: ${sel}`);
                break;
            }
        }

        if (bodyEditor) {
            await bodyEditor.click();
            await new Promise(r => setTimeout(r, 500));

            // HTML 본문을 평문으로 변환 후 입력
            const plainContent = content
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .trim();

            // 키보드 입력 (clipboard fallback 포함)
            try {
                // 방법 1: clipboard 붙여넣기 (가장 안정적)
                await page.evaluate((text) => {
                    const editor = document.querySelector('.ProseMirror') ||
                        document.querySelector('[contenteditable="true"]');
                    if (editor) {
                        editor.focus();
                        // insertText 사용
                        document.execCommand('insertText', false, text);
                    }
                }, plainContent);
                console.log(`  본문 입력 완료: ${plainContent.length}자`);
            } catch {
                // 방법 2: keyboard.type
                await page.keyboard.type(plainContent, { delay: 10 });
                console.log(`  본문 키보드 입력: ${plainContent.length}자`);
            }
        } else {
            // textarea 기반 에디터 (Markdown 모드)
            const textarea = await page.$('textarea#content, textarea.editor-textarea');
            if (textarea) {
                await textarea.click();
                await textarea.evaluate(el => { el.value = ''; });
                await page.keyboard.type(content, { delay: 5 });
                console.log(`  본문 textarea 입력: ${content.length}자`);
            } else {
                console.log('  ⚠️ 본문 에디터를 찾을 수 없습니다');
            }
        }

        await saveScreenshot(page, '03_content_entered');

        // STEP 6: 태그 입력
        if (tags.length > 0) {
            console.log(`[Tistory] 6/6 태그 ${tags.length}개 입력...`);

            const tagSelectors = [
                '#tag-field',
                'input[placeholder*="태그"]',
                '.tag_field input',
                '.tag-input input',
                'input.txt_tag',
            ];

            let tagInput = null;
            for (const sel of tagSelectors) {
                tagInput = await page.$(sel);
                if (tagInput) break;
            }

            if (tagInput) {
                for (const tag of tags) {
                    await tagInput.click();
                    await page.keyboard.type(tag, { delay: 30 });
                    await page.keyboard.press('Enter');
                    await new Promise(r => setTimeout(r, 300));
                }
                console.log(`  태그 입력 완료: ${tags.join(', ')}`);
            } else {
                console.log('  ⚠️ 태그 입력 필드를 찾을 수 없습니다');
            }
        }

        await saveScreenshot(page, '04_tags_entered');

        // STEP 7: 발행 버튼 클릭
        console.log('[Tistory] 7/7 발행 중...');

        // 1단계: 상단 "완료" 또는 "발행" 버튼 클릭 (사이드바 열기)
        const publishBtnSelectors = [
            'button.btn-publish',
            'button.btn_publish',
            '#publish-btn',
            'button.btn_complete',
        ];

        let publishClicked = false;

        // 먼저 셀렉터로 시도
        for (const sel of publishBtnSelectors) {
            const btn = await page.$(sel);
            if (btn) {
                await btn.click();
                publishClicked = true;
                console.log(`  발행 버튼 클릭: ${sel}`);
                break;
            }
        }

        // 셀렉터 실패 시 텍스트로 검색
        if (!publishClicked) {
            publishClicked = await page.evaluate(() => {
                const buttons = [...document.querySelectorAll('button, a')];
                for (const btn of buttons) {
                    const text = btn.textContent?.trim();
                    if (text === '완료' || text === '발행' || text === '발행하기' || text === '공개 발행') {
                        btn.click();
                        return text;
                    }
                }
                return null;
            });
            if (publishClicked) console.log(`  발행 버튼 (텍스트): "${publishClicked}"`);
        }

        if (!publishClicked) {
            await saveScreenshot(page, '05_publish_btn_not_found');
            await browser.close();
            return { success: false, error: '발행 버튼을 찾을 수 없습니다.' };
        }

        await new Promise(r => setTimeout(r, 2000));
        await saveScreenshot(page, '05_publish_sidebar');

        // 2단계: 공개 설정 확인 & 최종 발행
        // 공개/비공개 설정
        try {
            await page.evaluate(() => {
                // 공개 라디오 버튼 선택
                const publicRadio = document.querySelector('input[value="20"], input[name="visibility"][value="20"], input[name="visibility"][value="3"]');
                if (publicRadio && !publicRadio.checked) {
                    publicRadio.click();
                }
            });
        } catch { /* 이미 공개일 수 있음 */ }

        // 최종 발행 버튼 클릭
        const confirmClicked = await page.evaluate(() => {
            const buttons = [...document.querySelectorAll('button')];
            for (const btn of buttons) {
                const text = btn.textContent?.trim();
                if (text === '발행' || text === '공개발행' || text === '발행하기' || text === '완료') {
                    btn.click();
                    return text;
                }
            }
            return null;
        });

        if (confirmClicked) {
            console.log(`  최종 발행 클릭: "${confirmClicked}"`);
        }

        await saveScreenshot(page, '06_after_publish');

        // STEP 8: 발행 결과 확인 (URL 변경 감지)
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        } catch {
            console.log('[Tistory] 네비게이션 타임아웃, polling 시작...');
        }

        // URL 변경 확인 (newpost → 숫자 ID)
        const finalUrl = page.url();
        console.log(`[Tistory] 최종 URL: ${finalUrl}`);

        await saveScreenshot(page, '07_final');

        // 발행 성공 판단
        const isPublished = !finalUrl.includes('/manage/newpost') &&
            (finalUrl.includes('.tistory.com/') && /\/\d+$/.test(finalUrl));

        if (isPublished) {
            console.log(`[Tistory] ✅ 발행 성공!`);
            await browser.close();
            return {
                success: true,
                postUrl: finalUrl,
                method: 'puppeteer',
                message: '✅ 티스토리 블로그에 자동 발행되었습니다!',
            };
        }

        // manage 페이지에서 최신 글 확인
        try {
            await page.goto(`https://${blogId}.tistory.com/manage/posts`, { waitUntil: 'networkidle2', timeout: 15000 });
            await new Promise(r => setTimeout(r, 2000));

            const latestPost = await page.evaluate((titleMatch) => {
                const items = document.querySelectorAll('.post_title, .tit_post, a[href*=".tistory.com/"]');
                for (const item of items) {
                    const text = item.textContent?.trim();
                    if (text && text.includes(titleMatch.substring(0, 10))) {
                        return item.href || item.querySelector('a')?.href || text;
                    }
                }
                return null;
            }, title);

            if (latestPost) {
                console.log(`[Tistory] ✅ 글 목록에서 발견: ${latestPost}`);
                await browser.close();
                return {
                    success: true,
                    postUrl: latestPost,
                    method: 'puppeteer',
                    message: '✅ 티스토리 블로그에 자동 발행되었습니다!',
                };
            }
        } catch { /* ignore */ }

        // 발행 실패
        await browser.close();
        return {
            success: false,
            error: '발행 버튼은 클릭되었으나 실제 발행이 확인되지 않았습니다.',
            finalUrl,
        };

    } catch (err) {
        console.error('[Tistory] 발행 에러:', err.message);
        await saveScreenshot(page, 'error_state');
        await browser.close();
        return { success: false, error: err.message };
    }
}
