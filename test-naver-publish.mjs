import fs from 'fs';
import path from 'path';

const COOKIES = 'NID_AUT=NRTCtQ0Qx1q5Rie2r69klYBwoF5+kBxrAChp4Y7pMyfgTwyqTuT/K1Y77H6GLhKM; NID_SES=AAABrhMP98OeLNIUfkDehEy62NsM7J6JoVF58eHo4qMq9dhzwQDH3Q+6aK1hYqIKRiuFAs2cO0wCvCYYi+GEWbtQhWrDiJgh+TikZ5jT++ZkRmyEjqj3mKcxDWpULZYr+h8NFjLnu+V3yByJSLbQP6tETtz8bhjc9RvDsQbyRMGHaAKk5EVrULoAj7RChXThDj5QIjr39DEVmYN82MgIgJtDsV7g1pQkIHm6T7vA88aeVT/goRuHXAp8Ntv5/pemIF+y+yS9WD0Tv5dVTS9FWqhfK+wnpznypWa77JBn1IDb0Zjl72Vkv3l/8Ke/RnWfU+gx0ZQFbC7WK4q8Zpyl+UKrtkLtdCwICocCKrjDa50/w/onxx44batZtsEdNXGqaNpIKO8pSSfACbgyVmGEEN9steF/PmTE53EkzE/DSDNPZIuyxM3F0kiVOL+3EOScWoMXm003HcXgMtQa6i+PciEdHz2AneKSQ4iefG3VVdRV1ixIVIsj674Z/YD2Pl7dSn+vJOahK39Ov8VK3N4reL9e3cV9zkl+c2F1HpLqafuYXTXkmJEa016Zs2yZmXfwwWBnFA==';
const BLOG_ID = 'louispetergu';
const LOG_FILE = path.resolve('naver_test_log.txt');

function log(msg) {
    const line = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
    console.log(line);
}

// Clear log
fs.writeFileSync(LOG_FILE, '', 'utf8');

log('=== Naver Puppeteer Publish Test ===');
log('Cookie length: ' + COOKIES.length);
log('Blog ID: ' + BLOG_ID);
log('Time: ' + new Date().toISOString());

try {
    log('\n--- Loading module ---');
    const mod = await import('./lib/platforms/naver-puppeteer.js');
    log('Module loaded OK');

    log('\n--- Starting publishToNaverPuppeteer ---');
    const result = await mod.publishToNaverPuppeteer({
        cookies: COOKIES,
        blogId: BLOG_ID,
        title: 'Auto Publish Test ' + Date.now(),
        content: 'This is a BlogFlow auto publish test.\nIf you see this, publishing works!',
        tags: ['test'],
        images: [],
        headless: true,
        useProfile: false,
    });

    log('\n=== RESULT ===');
    log(result);

    if (result.success) {
        log('\nSUCCESS: ' + result.postUrl);
    } else {
        log('\nFAILED: ' + result.error);
    }
} catch (e) {
    log('\nEXCEPTION: ' + e.message);
    log(e.stack);
}

log('\n=== Test Complete ===');
