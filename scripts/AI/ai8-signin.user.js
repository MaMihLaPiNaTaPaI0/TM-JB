// ==UserScript==
// @name         AI8.0自動簽到腳本
// @version      4.1
// @description  直接点击日历中今天的「签到」按钮，公告不阻塞

// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/AI/ai8-signin.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/AI/ai8-signin.user.js

// @author       MaMihLaPiNaTaPaI0
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png

// @license      MIT
// @match        https://ai8.rcouyi.com/me/gift*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const TAG = '🎁 AI8.0';
    const log = (...a) => { try { console.log(TAG, ...a); } catch (_) {} };
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const norm = s => (s || '').replace(/\s+/g, '');

    let done = false;

    async function waitPageReady() {
        if (document.readyState !== 'complete') {
            await new Promise(r => { window.addEventListener('load', r, { once: true }); setTimeout(r, 15000); });
        }
        await sleep(1200);
        const start = Date.now();
        while (Date.now() - start < 15000) {
            const busy = document.querySelector('.n-spin, .n-spin-container .n-spin-body');
            if (!busy || busy.offsetParent === null) break;
            await sleep(400);
        }
        await sleep(600);
    }

    async function waitFor(fn, timeout = 10000, interval = 400) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            let v = null;
            try { v = fn(); } catch (_) {}
            if (v) return v;
            await sleep(interval);
        }
        return null;
    }

    function robustClick(el) {
        try { el.scrollIntoView({ block: 'center' }); } catch (_) {}
        try { el.focus && el.focus(); } catch (_) {}
        try { el.click(); } catch (_) {}
    }

    /* ---------- 公告弹窗 ---------- */
    const isAnnouncement = (m) => /公告通知|我已知晓|查看更多公告内容/.test(m.textContent || '');

    async function closeAnnouncements(max = 5) {
        for (let i = 0; i < max; i++) {
            const ann = Array.from(document.querySelectorAll('.n-modal[role="dialog"]'))
                .find(m => m.offsetParent !== null && isAnnouncement(m));
            if (!ann) return true;
            const ack = Array.from(ann.querySelectorAll('button'))
                .find(b => /我已知晓|我已知曉|知道了|我同意/.test(b.textContent || '') && !b.disabled);
            const closeBtn = ann.querySelector('.n-base-close');
            if (ack) { log(`🖱️ 关闭公告(${i + 1}): 我已知晓`); robustClick(ack); }
            else if (closeBtn) { log(`🖱️ 关闭公告(${i + 1}): ×`); robustClick(closeBtn); }
            else return false;
            await waitFor(() => !Array.from(document.querySelectorAll('.n-modal[role="dialog"]'))
                .some(m => m.offsetParent !== null && isAnnouncement(m)), 4000, 300);
            await sleep(400);
        }
        return false;
    }

    /* ---------- 礼物入口（仅当日历不在页面时用） ---------- */
    function findGiftEntry() {
        for (const u of document.querySelectorAll('use')) {
            const href = u.getAttribute('href') || u.getAttribute('xlink:href') || '';
            if (/gift/i.test(href)) {
                const el = u.closest('button, a, [role="button"]');
                if (el && el.offsetParent !== null) return el;
            }
        }
        const area = document.querySelector('.siderbar-sign-in, [class*="siderbar-sign"]');
        if (area) {
            const el = area.querySelector('a, button, [role="button"]');
            if (el && el.offsetParent !== null) return el;
        }
        return null;
    }

    /* ---------- 日历 ---------- */
    const getCalendar = () => document.querySelector('.n-calendar');
    const getTodayCell = () => document.querySelector('.n-calendar-cell--current');

    function isTodaySigned() {
        const cell = getTodayCell();
        if (!cell) return false;
        return /已签到|已簽到/.test(norm(cell.textContent));
    }

    function findTodaySignButton() {
        const cell = getTodayCell();
        if (!cell) return null;
        for (const b of cell.querySelectorAll('button')) {
            if (b.disabled) continue;
            if (b.classList.contains('n-button--disabled')) continue;
            const t = norm(b.textContent);
            if (!t) continue;
            if (!/签到|簽到/.test(t)) continue;
            if (/已签到|已簽到|等待签到|等待簽到/.test(t)) continue;
            return b;
        }
        return null;
    }

    function diagnose() {
        log('🔬 诊断');
        log('日历存在:', !!getCalendar());
        const cell = getTodayCell();
        log('今天格存在:', !!cell);
        if (cell) {
            log('今天格文本:', norm(cell.textContent));
            const rows = [];
            cell.querySelectorAll('button').forEach(b => rows.push({
                text: norm(b.textContent).slice(0, 20),
                disabled: b.disabled === true,
                cls: (b.className || '').toString().slice(0, 60),
            }));
            try { console.table(rows); } catch (_) { log(rows); }
        }
        const modals = Array.from(document.querySelectorAll('.n-modal[role="dialog"]')).filter(m => m.offsetParent !== null);
        log('可见弹窗数:', modals.length);
        modals.forEach((m, i) => log(`  弹窗${i}: "${(m.textContent || '').replace(/\s+/g, ' ').slice(0, 80)}"`));
    }

    /* ---------- 主流程 ---------- */
    async function main() {
        if (done) return;
        log('开始 v4.0');
        await waitPageReady();
        log('页面就绪');

        // 1. 关公告
        //await closeAnnouncements();
        //await sleep(500);

        // 2. 等日历（可能在页面主内容，也可能在弹窗里）
        let cal = await waitFor(getCalendar, 6000, 400);
        if (!cal) {
            log('页面无日历，尝试点礼物入口');
            const gift = findGiftEntry();
            if (!gift) { log('❌ 未找到礼物入口'); diagnose(); return; }
            robustClick(gift);
            cal = await waitFor(getCalendar, 10000, 400);
            if (!cal) { log('❌ 点礼物后仍无日历'); diagnose(); return; }
        }
        log('✅ 日历已出现');

        // 3. 等今天格渲染
        const cell = await waitFor(getTodayCell, 8000, 300);
        if (!cell) { log('❌ 未找到今天格'); diagnose(); return; }
        await sleep(500);

        // 4. 已签到？
        if (isTodaySigned()) {
            log('ℹ️ 今天已签到，无需操作');
            done = true;
            return;
        }

        // 5. 找签到按钮（首次找不到稍等再试一次）
        let btn = findTodaySignButton();
        if (!btn) {
            log('首次未找到，2s 后重试');
            await sleep(2000);
            btn = findTodaySignButton();
        }
        if (!btn) { log('❌ 今天格内无可用签到按钮'); diagnose(); return; }

        log('✅ 找到签到按钮，点击');
        robustClick(btn);
        await sleep(1500);

        // 6. 验证
        const ok = await waitFor(() => {
            if (isTodaySigned()) return true;
            for (const el of document.querySelectorAll('.n-message, [role="alert"]')) {
                if (/签到成功|簽到成功/.test(el.textContent || '')) return true;
            }
            return false;
        }, 10000, 500);

        if (ok) {
            log('🎉 签到成功');
            done = true;
        } else {
            log('⚠️ 结果未确认');
            diagnose();
        }
    }

    setTimeout(main, 1500);
})();
