// ==UserScript==
// @name         AI7.0自動簽到腳本 - 高效版
// @version      7.2
// @description  弹窗验证签到状态，不依赖红点误判，支持自动重试

// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/AI/ai7-signin.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/AI/ai7-signin.user.js

// @author       MaMihLaPiNaTaPaI0
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png

// @license      MIT
// @match        https://ai.rcouyi.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const TAG          = '🎁 AI7.0';
    const SIGN_AREA    = '.siderbar-sign-in';
    const STORAGE_KEY  = 'ai7_last_sign_date';
    const WAIT_DOM_MS  = 25000;   // 等签到区域
    const WAIT_BTN_MS  = 10000;   // 等弹窗按钮
    const POLL_MS      = 300;
    const MAX_AUTO_RETRY = 3;
    const AUTO_RETRY_DELAY = 30000;

    let running = false;
    let autoRetryCount = 0;

    const log   = (...a) => console.log(TAG, ...a);
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

    function waitFor(fn, timeout = 10000, interval = POLL_MS) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const tick = () => {
                let v = null;
                try { v = fn(); } catch (_) { v = null; }
                if (v) return resolve(v);
                if (Date.now() - start >= timeout) return reject(new Error(`等待超時 (${timeout}ms)`));
                setTimeout(tick, interval);
            };
            tick();
        });
    }

    /* 红点检测：仅用于签到成功后的辅助验证 */
    function hasRedDot(area) {
        if (!area) return null;
        const badge = area.querySelector('.n-badge');
        if (!badge) return null;
        if (badge.querySelector('.n-badge-sup, .n-badge-dot')) return true;
        for (const el of badge.children) {
            if (el.tagName === 'A') continue;
            if ((el.textContent || '').trim() !== '') return true;
            if (el.children.length > 0) return true;
            const cls = el.getAttribute('class') || '';
            if (/badge|dot/i.test(cls)) return true;
        }
        return false;
    }

    /* 检查弹窗内按钮状态：返回 { type, el } 或 null（弹窗还没渲染好） */
    function inspectModal() {
        const modal = document.querySelector('.n-modal, [role="dialog"]');
        if (!modal) return null;
        const buttons = Array.from(modal.querySelectorAll('button'));

        for (const b of buttons) {
            const t = (b.textContent || '').trim();
            if (/已签到|已簽到|明日再来|明日再來|今日已/.test(t)) return { type: 'already', el: b };
        }
        for (const b of buttons) {
            const t = (b.textContent || '').trim();
            if (/立即签到|立即簽到|^签到$|^簽到$/.test(t)) return { type: 'sign', el: b };
        }
        for (const b of buttons) {
            const t = (b.textContent || '').trim();
            if (/签到|簽到/.test(t)) return { type: 'sign', el: b };
        }
        return null; // 弹窗在，但按钮还没渲染好，继续等
    }

    function closeModal() {
        const sels = [
            '.n-modal .n-base-close',
            '.n-modal button[aria-label="关闭"]',
            '.n-modal button[aria-label="關閉"]',
            '.n-modal .n-base-close__absolute',
            'button[aria-label="关闭"]',
        ];
        for (const s of sels) {
            const el = document.querySelector(s);
            if (el) { try { el.click(); } catch (_) {} return; }
        }
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    }

    async function doSign() {
        // 1. 等签到区域
        const area = await waitFor(() => document.querySelector(SIGN_AREA), WAIT_DOM_MS);
        log('✅ 找到签到区域');

        // 2. 无条件点开礼物弹窗，用弹窗内容判断状态（不再依赖红点）
        const gift = area.querySelector('use[href="#icon-gift-line"]')?.closest('a')
                  || area.querySelector('a');
        if (!gift) throw new Error('未找到礼物图标');
        gift.click();
        log('🖱️ 已点击礼物图标，等待弹窗');

        // 3. 等弹窗里出现可识别的按钮
        const state = await waitFor(() => inspectModal(), WAIT_BTN_MS);
        log('🔍 弹窗状态:', state.type);

        if (state.type === 'already') {
            log('ℹ️ 弹窗显示已签到');
            closeModal();
            return { status: 'already' };
        }
        if (state.el.disabled) {
            log('ℹ️ 签到按钮禁用，视为已签到');
            closeModal();
            return { status: 'already' };
        }

        // 4. 点击签到
        log('🎯 点击签到按钮:', (state.el.textContent || '').trim());
        state.el.click();

        // 5. 验证结果
        for (let i = 0; i < 12; i++) {
            await sleep(700);
            const s = inspectModal();
            if (s && s.type === 'already') {
                log('🎉 签到成功（弹窗变已签到）');
                return { status: 'success' };
            }
            if (hasRedDot(document.querySelector(SIGN_AREA)) === false) {
                log('🎉 签到成功（红点消失）');
                return { status: 'success' };
            }
        }
        log('⚠️ 签到结果未确认');
        return { status: 'uncertain' };
    }

    async function main(manual = false) {
        if (running) { log('⏸️ 已在运行中，跳过'); return; }
        if (manual) {
            localStorage.removeItem(STORAGE_KEY);
            autoRetryCount = 0;
        }

        running = true;
        try {
            let result = null;
            for (let i = 1; i <= 2; i++) {
                try { result = await doSign(); break; }
                catch (e) {
                    log(`⚠️ 第 ${i} 次尝试失败: ${e.message}`);
                    closeModal();
                    await sleep(1500);
                    if (i === 2) throw e;
                }
            }

            if (result?.status === 'success') {
                log('🎉 签到成功');
                toast('签到成功！', 'success');
                localStorage.setItem(STORAGE_KEY, today());
                autoRetryCount = 0;
            } else if (result?.status === 'already') {
                log('ℹ️ 今日已签到');
                toast('今日已签到', 'info');
                localStorage.setItem(STORAGE_KEY, today());
                autoRetryCount = 0;
            } else {
                log('⚠️ 签到结果不确定');
                toast('签到结果不确定，请手动确认', 'warning');
            }
        } catch (e) {
            log('❌ 签到失败:', e.message);
            toast('签到失败：' + e.message, 'error');
            // 自动重试兜底
            if (!manual && autoRetryCount < MAX_AUTO_RETRY) {
                autoRetryCount++;
                log(`🔄 ${AUTO_RETRY_DELAY / 1000}s 后自动重试 (${autoRetryCount}/${MAX_AUTO_RETRY})`);
                setTimeout(() => main(false), AUTO_RETRY_DELAY);
            }
        } finally {
            closeModal();
            running = false;
        }
    }

    function toast(text, type = 'info') {
        const old = document.querySelector('.ai7-message');
        if (old) old.remove();
        const colors = { success: '#4CAF50', error: '#F44336', info: '#2196F3', warning: '#FF9800' };
        const msg = document.createElement('div');
        msg.className = 'ai7-message';
        msg.textContent = `AI7.0: ${text}`;
        msg.style.cssText = `position:fixed;top:20px;right:20px;background:${colors[type] || colors.info};color:#fff;padding:12px 20px;border-radius:6px;z-index:999999;font-family:Arial,sans-serif;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,.15);`;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 5000);
    }

    function addManualButton() {
        if (document.querySelector('.ai7-manual-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'ai7-manual-btn';
        btn.textContent = '检查签到';
        btn.style.cssText = `position:fixed;bottom:20px;right:20px;background:#2196F3;color:#fff;border:none;padding:8px 12px;border-radius:4px;cursor:pointer;z-index:999999;font-size:11px;`;
        btn.onclick = () => {
            log('🔄 手动触发签到检查');
            running = false;
            main(true);
        };
        document.body.appendChild(btn);
    }

    function init() {
        log('脚本启动 v7.2');
        addManualButton();
        setTimeout(() => main(false), 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
