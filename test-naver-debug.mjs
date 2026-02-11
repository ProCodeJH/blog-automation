// 네이버 Puppeteer 발행 디버그 테스트 — 스크린샷 포함
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const COOKIES = 'NID_AUT=NRTCtQ0Qx1q5Rie2r69klYBwoF5+kBxrAChp4Y7pMyfgTwyqTuT/K1Y77H6GLhKM; NID_SES=AAABrhMP98OeLNIUfkDehEy62NsM7J6JoVF58eHo4qMq9dhzwQDH3Q+6aK1hYqIKRiuFAs2cO0wCvCYYi+GEWbtQhWrDiJgh+TikZ5jT++ZkRmyEjqj3mKcxDWpULZYr+h8NFjLnu+V3yByJSLbQP6tETtz8bhjc9RvDsQbyRMGHaAKk5EVrULoAj7RChXThDj5QIjr39DEVmYN82MgIgJtDsV7g1pQkIHm6T7vA88aeVT/goRuHXAp8Ntv5/pemIF+y+yS9WD0Tv5dVTS9FWqhfK+wnpznypWa77JBn1IDb0Zjl72Vkv3l/8Ke/RnWfU+gx0ZQFbC7WK4q8Zpyl+UKrtkLtdCwICocCKrjDa50/w/onxx44batZtsEdNXGqaNpIKO8pSSfACbgyVmGEEN9steF/PmTE53EkzE/DSDNPZIuyxM3F0kiVOL+3EOScWoMXm003HcXgMtQa6i+PciEdHz2AneKSQ4iefG3VVdRV1ixIVIsj674Z/YD2Pl7dSn+vJOahK39Ov8VK3N4reL9e3cV9zkl+c2F1HpLqafuYXTXkmJEa016Zs2yZmXfwwWBnFA==';
const BLOG_ID = 'louispetergu';
const BLOG_URL = 'https://blog.naver.com';
const LOG_FILE = 'naver_debug_log.txt';
const SCREENSHOT_DIR = 'naver_debug_screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);
fs.writeFileSync(LOG_FILE, '', 'utf8');

function log(msg) {
    const line = `[${new Date().toISOString()}] ${typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)}`;
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
}

function parseCookies(str) {
    return str.split(';').map(pair => {
        const [name, ...rest] = pair.trim().split('=');
        return { name: name.trim(), value: rest.join('='), domain: '.naver.com', path: '/' };
    }).filter(c => c.name && c.value);
}

async function screenshot(page, name) {
    const p = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: p, fullPage: false });
    log(`Screenshot: ${p}`);
}

async function main() {
    log('=== START ===');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Anti-detect
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // 쿠키 주입
    const cookies = parseCookies(COOKIES);
    await page.setCookie(...cookies);
    log('Cookies injected: ' + cookies.length);

    try {
        // Step 1: 에디터 접속
        log('Step 1: Navigate to editor');
        await page.goto(`${BLOG_URL}/${BLOG_ID}/postwrite`, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });
        await screenshot(page, '01_editor_loaded');
        log('URL: ' + page.url());

        // 로그인 체크
        const loggedIn = await page.evaluate(() => {
            return !document.querySelector('#loginForm') && !window.location.href.includes('nidlogin');
        });
        log('Logged in: ' + loggedIn);
        if (!loggedIn) {
            log('NOT LOGGED IN - cookies expired');
            await browser.close();
            return;
        }

        await new Promise(r => setTimeout(r, 3000));
        await screenshot(page, '02_after_wait');

        // Step 2: "작성 중" 팝업 처리
        log('Step 2: Handle popup');
        const popupHandled = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.textContent.trim() === '취소') {
                    btn.click();
                    return 'dismissed';
                }
            }
            return 'no popup';
        });
        log('Popup: ' + popupHandled);
        await new Promise(r => setTimeout(r, 1500));

        // Step 3: 제목 입력
        log('Step 3: Enter title');
        const titleEl = await page.waitForSelector('.se-title-text', { timeout: 10000 });
        await titleEl.click();
        await new Promise(r => setTimeout(r, 300));
        const testTitle = 'Debug Test ' + Date.now();
        await page.keyboard.type(testTitle, { delay: 30 });
        log('Title: ' + testTitle);
        await screenshot(page, '03_title_entered');

        // Step 4: 본문 클릭 및 입력
        log('Step 4: Enter content');
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 500));
        const testContent = 'BlogFlow Puppeteer auto publish debug test.\nThis text should appear in the blog.';
        await page.keyboard.type(testContent, { delay: 10 });
        await screenshot(page, '04_content_entered');

        // Step 5: 발행 버튼 찾기 & 클릭
        log('Step 5: Find publish button');
        await new Promise(r => setTimeout(r, 1000));

        // 발행 버튼 찾기
        const publishBtnInfo = await page.evaluate(() => {
            const allBtns = Array.from(document.querySelectorAll('button'));
            const btnInfo = allBtns.map(b => ({
                text: b.textContent.trim().substring(0, 30),
                className: b.className.substring(0, 50),
                visible: b.offsetParent !== null,
            })).filter(b => b.text.includes('발행') || b.text.includes('공개') || b.text.includes('등록') || b.className.includes('publish'));
            return btnInfo;
        });
        log('Publish buttons found: ' + JSON.stringify(publishBtnInfo));

        // 상단 툴바에서 발행 버튼 클릭
        const publishClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                const text = btn.textContent.trim();
                if (text === '발행') {
                    btn.click();
                    return 'toolbar:' + text;
                }
            }
            return null;
        });
        log('Publish clicked (1st): ' + publishClicked);
        await new Promise(r => setTimeout(r, 2000));
        await screenshot(page, '05_after_publish_click');

        // Step 6: 발행 확인 패널/다이얼로그 처리
        log('Step 6: Handle publish confirmation');

        // 발행 패널에서 모든 버튼 확인
        const panelButtons = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.map(b => ({
                text: b.textContent.trim().substring(0, 30),
                className: b.className.substring(0, 80),
                visible: b.offsetParent !== null,
                rect: b.getBoundingClientRect(),
            })).filter(b => b.visible && b.rect.width > 0);
        });
        log('Visible buttons after publish click: ' + JSON.stringify(panelButtons.filter(b =>
            b.text.includes('발행') || b.text.includes('확인') || b.text.includes('공개') ||
            b.text.includes('등록') || b.className.includes('confirm') || b.className.includes('publish')
        )));

        // 발행 확인 버튼 클릭 시도
        const confirmClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            const results = [];
            for (const btn of btns) {
                const text = btn.textContent.trim();
                const cls = btn.className;
                if (btn.offsetParent && (
                    (cls.includes('confirm') && text.includes('발행')) ||
                    cls.includes('publish_btn__') ||
                    (cls.includes('confirm') && !text.includes('취소'))
                )) {
                    btn.click();
                    results.push(`clicked: ${text} (${cls.substring(0, 40)})`);
                }
            }
            if (results.length === 0) {
                // 폴백: 발행 텍스트가 있는 모든 보이는 버튼
                for (const btn of btns) {
                    if (btn.offsetParent && btn.textContent.trim() === '발행' && btn.getBoundingClientRect().width > 50) {
                        btn.click();
                        results.push('fallback clicked: 발행');
                    }
                }
            }
            return results;
        });
        log('Confirm clicked: ' + JSON.stringify(confirmClicked));
        await new Promise(r => setTimeout(r, 3000));
        await screenshot(page, '06_after_confirm');

        // Step 7: 추가 확인 다이얼로그
        log('Step 7: Any remaining dialogs');
        const extraDialogs = await page.evaluate(() => {
            const results = [];
            for (const btn of document.querySelectorAll('button')) {
                const text = btn.textContent.trim();
                if (btn.offsetParent && (text === '확인' || text === 'OK')) {
                    btn.click();
                    results.push('clicked: ' + text);
                }
            }
            return results;
        });
        log('Extra dialogs: ' + JSON.stringify(extraDialogs));
        await new Promise(r => setTimeout(r, 5000));
        await screenshot(page, '07_final_state');

        // 최종 URL 확인
        const finalUrl = page.url();
        log('Final URL: ' + finalUrl);
        log('Success: ' + !finalUrl.includes('/postwrite'));

        // 페이지 HTML 확인 (성공 메시지)
        const pageInfo = await page.evaluate(() => {
            const msgEls = document.querySelectorAll('.complete_message, .publish_complete, [class*="complete"], [class*="success"]');
            return {
                title: document.title,
                msgs: Array.from(msgEls).map(e => e.textContent.trim().substring(0, 100)),
                bodyText: document.body.innerText.substring(0, 500),
            };
        });
        log('Page info: ' + JSON.stringify(pageInfo));

    } catch (e) {
        log('ERROR: ' + e.message);
        log(e.stack);
        await screenshot(page, 'error_state');
    } finally {
        await browser.close();
        log('=== DONE ===');
    }
}

main().catch(e => {
    log('FATAL: ' + e.message);
    process.exit(1);
});
