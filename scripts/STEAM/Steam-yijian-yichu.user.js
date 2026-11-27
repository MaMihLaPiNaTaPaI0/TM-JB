// ==UserScript==
// @name         Steam 一键移除（取关鉴赏家 / 取关游戏 / 清空愿望单）
// @version      6.6.6
// @description  steam一键取关鉴赏家，取关游戏，清空愿望单。（美化 + 手动 SteamID）
// @match        *://store.steampowered.com/*
// @match        *://steamcommunity.com/*

// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM/Steam-yijian-yichu.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM/Steam-yijian-yichu.user.js

// @author       MaMihLaPiNaTaPaI0
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @license      MIT

// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_cookie
// @grant        unsafeWindow
// @run-at       document-end
// @connect      steamcommunity.com
// @connect      steampowered.com
// @connect      akamaihd.net
// @noframes

// ==/UserScript==

// ============================================================
// 原作者信息
// ============================================================
// 原脚本作者：HCLonely
//   原始地址：https://greasyfork.org/scripts/372255（steam一键移除 v0.7.8）
//   博客说明：https://blog.hclonely.com/posts/6a0923b1/
//
// 本版本基于原作者 v0.7.8 重写与维护（v0.8.x 系列），
// 由 MaMihLaPiNaTaPaI0 在原脚本基础上做了以下改动：
//   1. 修复"已登录却提示请先登录"——unsafeWindow + GM_cookie 读 HttpOnly
//      的 steamLoginSecure，三层兜底（GM_cookie / document.cookie / userdata）
//   2. 修复"关注游戏列表总是空"——改用 dynamicstore/userdata 里的 rgFollowedApps
//   3. 修复"愿望单只显示数字"——用 IStoreBrowseService/GetItems 批量补全中文名
//      （100 个/批，最多 3 批并发，批间 400ms，避免 429）
//   4. 新增手动输入 SteamID（支持 17 位 ID / 自定义名 / 完整链接），保存后持久化
//   5. UI 全面美化（弹窗 + 顶部菜单按钮），同时保持 Steam 原生 supernav 布局
//   6. 取关 / 移除改为并发池 4 路 + 失败重试 1 次
//   7. 全站改为原生 DOM，不再依赖页面自带 jQuery 与第三方 sweetalert
//
// 遵循原作者 MIT 许可，保留原作者署名与本段说明
// ============================================================

(function () {
    'use strict';

    const pageWindow = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    const VERSION = '0.8.4';

    // ============================================================
    // 1. 基础工具
    // ============================================================

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    function uniqueBy(arr, keyFn) {
        const seen = new Set();
        return arr.filter((x) => {
            const k = typeof keyFn === 'function' ? keyFn(x) : x[keyFn];
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        }[c]));
    }

    function parseJson(res) {
        if (res.response && typeof res.response === 'object') return res.response;
        try { return JSON.parse(res.responseText || ''); } catch { return null; }
    }

    // ============================================================
    // 2. 网络层
    // ============================================================

    function gmRequest(opts, retries = 1) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: opts.method || 'GET',
                url: opts.url,
                headers: opts.headers,
                data: opts.data,
                timeout: opts.timeout || 20000,
                responseType: opts.responseType || 'text',
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) return resolve(res);
                    if (retries > 0) {
                        setTimeout(() => gmRequest(opts, retries - 1).then(resolve, reject), 500);
                    } else {
                        reject(new Error(`HTTP ${res.status} for ${opts.url}`));
                    }
                },
                onerror: (e) => {
                    if (retries > 0) {
                        setTimeout(() => gmRequest(opts, retries - 1).then(resolve, reject), 500);
                    } else {
                        reject(e);
                    }
                },
                ontimeout: () => {
                    if (retries > 0) {
                        setTimeout(() => gmRequest(opts, retries - 1).then(resolve, reject), 500);
                    } else {
                        reject(new Error('timeout'));
                    }
                },
            });
        });
    }

    async function runLimited(items, limit, worker, onProgress) {
        const queue = items.slice();
        const total = items.length;
        let done = 0;
        const runNext = async () => {
            while (queue.length) {
                const item = queue.shift();
                try { await worker(item); }
                catch (e) { console.warn('[steam一键移除] worker error:', e); }
                done++;
                if (onProgress) onProgress(done, total);
            }
        };
        await Promise.all(Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, runNext));
    }

    // ============================================================
    // 3. 身份解析
    // ============================================================

    const identity = { steam64: '', persona: '', accountId: 0 };
    const MANUAL_ID_KEY = 'manual_steam64';
    let steam64Promise = null;

    function getManualSteam64() {
        const v = String(GM_getValue(MANUAL_ID_KEY, '') || '').trim();
        return /^\d{17}$/.test(v) ? v : '';
    }

    function resolveIdentityFast() {
        const pw = pageWindow;
        try {
            if (pw && typeof pw.g_strWishlistBaseURL === 'string') {
                const m = pw.g_strWishlistBaseURL.match(/\/profiles\/(\d{17})/);
                if (m) identity.steam64 = m[1];
            }
        } catch (e) { /* ignore */ }
        try {
            const pd = pw && pw.g_rgProfileData;
            if (pd) {
                if (pd.steamid && /^\d{17}$/.test(String(pd.steamid))) {
                    identity.steam64 = identity.steam64 || String(pd.steamid);
                }
                if (pd.personaname) identity.persona = pd.personaname;
                if (pd.url) {
                    const m = String(pd.url).match(/\/profiles\/(\d{17})/);
                    if (m) identity.steam64 = identity.steam64 || m[1];
                }
            }
        } catch (e) { /* ignore */ }
        try {
            if (pw && typeof pw.g_AccountID !== 'undefined') {
                identity.accountId = Number(pw.g_AccountID) || 0;
            }
        } catch (e) { /* ignore */ }
        if (!identity.persona && identity.accountId) {
            const el = $(`a[data-miniprofile="${identity.accountId}"]`);
            if (el) identity.persona = el.textContent.trim();
        }
        const manual = getManualSteam64();
        if (manual) identity.steam64 = manual;
        return identity;
    }

    async function resolveVanityOrId(raw) {
        const s = String(raw || '').trim();
        if (!s) return '';
        if (/^\d{17}$/.test(s)) return s;
        let m = s.match(/\/profiles\/(\d{17})/);
        if (m) return m[1];
        let vanity = s;
        m = s.match(/\/(?:id|wishlist\/id)\/([^\/?#\s]+)/);
        if (m) vanity = decodeURIComponent(m[1]);
        try {
            const res = await gmRequest({
                url: `https://store.steampowered.com/wishlist/id/${encodeURIComponent(vanity)}?t=${Date.now()}`,
                timeout: 15000,
            }, 1);
            m = res.responseText.match(
                /g_strWishlistBaseURL\s*=\s*["'](?:https?:)?\/\/store\.steampowered\.com\/wishlist\/profiles\/(\d{17})/
            );
            if (m) return m[1];
        } catch (e) { /* ignore */ }
        try {
            const res = await gmRequest({
                url: `https://steamcommunity.com/id/${encodeURIComponent(vanity)}/?t=${Date.now()}`,
                timeout: 15000,
            }, 1);
            m = res.responseText.match(/\/profiles\/(\d{17})/);
            if (m) return m[1];
        } catch (e) { /* ignore */ }
        return '';
    }

    /** 通过 GM_cookie 读取 HttpOnly 的 steamLoginSecure（最可靠的来源） */
    function getSteam64FromGMCookie() {
        if (typeof GM_cookie === 'undefined' || !GM_cookie || typeof GM_cookie.list !== 'function') {
            return Promise.resolve('');
        }
        return new Promise((resolve) => {
            try {
                GM_cookie.list({ name: 'steamLoginSecure' }, (cookies, error) => {
                    if (error || !Array.isArray(cookies)) return resolve('');
                    for (const c of cookies) {
                        if (c && typeof c.value === 'string') {
                            const m = c.value.match(/^(\d{17})/);
                            if (m) return resolve(m[1]);
                        }
                    }
                    resolve('');
                });
            } catch (e) {
                console.warn('[steam一键移除] GM_cookie.list 调用异常:', e);
                resolve('');
            }
        });
    }

    function ensureSteam64() {
        if (identity.steam64) return Promise.resolve(identity.steam64);
        if (steam64Promise) return steam64Promise;

        steam64Promise = (async () => {
            resolveIdentityFast();
            if (identity.steam64) return identity.steam64;

            // 方案 1：GM_cookie 读取 steamLoginSecure（HttpOnly 也能读）
            try {
                const fromGm = await getSteam64FromGMCookie();
                if (fromGm) {
                    identity.steam64 = fromGm;
                    return fromGm;
                }
            } catch (e) {
                console.warn('[steam一键移除] GM_cookie 读取失败:', e);
            }

            // 方案 2：document.cookie（非 HttpOnly 时仍可能有效）
            try {
                const match = document.cookie.match(/(?:^|;\s*)steamLoginSecure=(\d{17})/);
                if (match) {
                    identity.steam64 = match[1];
                    return match[1];
                }
            } catch (e) { /* ignore */ }

            // 方案 3：userdata 接口（部分页面会带 steamid）
            try {
                const res = await gmRequest({
                    url: `https://store.steampowered.com/dynamicstore/userdata/?t=${Date.now()}`,
                    responseType: 'json',
                    timeout: 20000,
                }, 1);
                const j = parseJson(res) || {};
                const sid = String(j.steamid || '');
                if (/^\d{17}$/.test(sid)) {
                    identity.steam64 = sid;
                    return sid;
                }
            } catch (e) {
                console.warn('[steam一键移除] userdata 获取 steamid 失败:', e);
            }

            return '';
        })();

        return steam64Promise;
    }

    function getSessionId() {
        try { if (pageWindow.g_sessionID) return pageWindow.g_sessionID; }
        catch (e) { /* ignore */ }
        const cached = GM_getValue('session_id', '');
        if (cached) return cached;
        const m = document.cookie.match(/(?:^|;\s*)sessionid=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    }

    // ============================================================
    // 4. UI 辅助
    // ============================================================

    const ui = { settingEl: null, infoEl: null, proEl: null };

    function setProgress(text) { if (ui.proEl) ui.proEl.innerHTML = text; }

    function appendInfo(html) {
        if (!ui.infoEl) return null;
        const p = document.createElement('p');
        p.innerHTML = html;
        ui.infoEl.appendChild(p);
        p.scrollIntoView({ block: 'nearest' });
        return p;
    }

    function resetListUI() {
        if (ui.settingEl) ui.settingEl.innerHTML = '';
        if (ui.infoEl) ui.infoEl.innerHTML = '';
        if (ui.proEl) ui.proEl.innerHTML = '';
        $$('.next').forEach((el) => el.classList.add('disabled'));
        const sa = $('#selectAll'); if (sa) sa.checked = false;
        const rev = $('#reverse'); if (rev) rev.checked = false;
    }

    function toast(message, isError) {
        const div = document.createElement('div');
        div.textContent = message;
        div.style.cssText = `
            position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-8px);
            background: ${isError ? 'linear-gradient(135deg,#c94a4a,#a03333)' : 'linear-gradient(135deg,#3a8a5c,#2a6b45)'};
            color: #fff; padding: 12px 22px; border-radius: 6px;
            z-index: 10000000001; font-size: 13px; font-weight: 500;
            box-shadow: 0 6px 24px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.15);
            transition: opacity .3s, transform .3s; opacity: 0;
            max-width: 500px; text-align: center; line-height: 1.4;
            border: 1px solid ${isError ? 'rgba(255,120,120,.4)' : 'rgba(120,255,150,.3)'};
            font-family: "Motiva Sans", Arial, sans-serif;
        `;
        document.body.appendChild(div);
        requestAnimationFrame(() => {
            div.style.opacity = '1';
            div.style.transform = 'translateX(-50%) translateY(0)';
        });
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transform = 'translateX(-50%) translateY(-8px)';
        }, 3200);
        setTimeout(() => div.remove(), 3600);
    }

    // ============================================================
    // 5. 获取列表
    // ============================================================

    async function fetchUserData() {
        const steam64 = await ensureSteam64();
        if (!steam64) throw new Error('未能获取 steam64ID');
        const res = await gmRequest({
            url: `https://store.steampowered.com/dynamicstore/userdata/?id=${steam64}&t=${Date.now()}`,
            responseType: 'json',
            timeout: 30000,
        }, 1);
        return parseJson(res);
    }

    async function getCurators() {
        resetListUI();
        const p = appendInfo('获取鉴赏家列表...');
        try {
            const data = await fetchUserData();
            const curatorsMap = (data && data.rgCurators) || {};
            const list = Object.values(curatorsMap)
                .filter((c) => c && c.clanid)
                .map((c) => ({ id: String(c.clanid), name: c.name || String(c.clanid) }));
            if (!list.length) {
                p.innerHTML += ' <span class="rm-warn">空列表</span>';
                return;
            }
            renderCheckboxList(list, 'curator');
            $('#unf_c')?.classList.remove('disabled');
            p.innerHTML += ' <span class="rm-ok">成功</span>';
        } catch (e) {
            console.error(e);
            p.innerHTML += ` <span class="rm-err">失败</span> ${escapeHtml(e.message)}`;
        }
    }

    async function getFollowGames() {
        resetListUI();
        const p = appendInfo('获取已关注游戏列表...');
        try {
            const data = await fetchUserData();
            const followedAppids = ((data && data.rgFollowedApps) || []).map(String);

            if (!followedAppids.length) {
                p.innerHTML += ' <span class="rm-warn">空列表</span>';
                return;
            }

            renderCheckboxList(followedAppids.map((id) => ({ id, name: id })), 'app');
            $('#unf_g')?.classList.remove('disabled');
            p.innerHTML += ` <span class="rm-ok">成功</span> 共 ${followedAppids.length} 个，加载游戏名中...`;

            fillGameNames(followedAppids).then(() => {
                p.innerHTML += ' <span class="rm-ok">完成</span>';
            });
        } catch (e) {
            console.error(e);
            p.innerHTML += ` <span class="rm-err">失败</span> ${escapeHtml(e.message)}`;
        }
    }

    async function getWishlist() {
        resetListUI();
        const p = appendInfo('获取愿望单列表...');
        try {
            const data = await fetchUserData();
            const appids = ((data && data.rgWishlist) || []).map(String);
            if (!appids.length) {
                p.innerHTML += ' <span class="rm-warn">空列表</span>';
                return;
            }
            renderCheckboxList(appids.map((id) => ({ id, name: id })), 'app');
            $('#rem_g')?.classList.remove('disabled');
            p.innerHTML += ` <span class="rm-ok">成功</span> 共 ${appids.length} 个，加载游戏名中...`;
            fillGameNames(appids).then(() => {
                p.innerHTML += ' <span class="rm-ok">完成</span>';
            });
        } catch (e) {
            console.error(e);
            p.innerHTML += ` <span class="rm-err">失败</span> ${escapeHtml(e.message)}`;
        }
    }

    /**
     * 使用 IStoreBrowseService/GetItems 批量补全游戏名
     * 限流：100 个/批，最多 3 批同时进行，批与批之间间隔 400ms
     */
    async function fillGameNames(appids) {
        const BATCH_SIZE = 100;
        const CONCURRENCY = 3;
        const BATCH_GAP_MS = 400;

        const batches = [];
        for (let i = 0; i < appids.length; i += BATCH_SIZE) {
            batches.push(appids.slice(i, i + BATCH_SIZE));
        }
        if (!batches.length) return true;

        let batchIndex = 0;

        const runBatch = async () => {
            while (batchIndex < batches.length) {
                const batch = batches[batchIndex++];
                const inputJson = JSON.stringify({
                    ids: batch.map((id) => ({ appid: Number(id) })),
                    context: { language: 'schinese', country_code: 'CN' },
                    data_request: { include_basic_info: true },
                });

                try {
                    const res = await gmRequest({
                        url: `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(inputJson)}`,
                        responseType: 'json',
                        timeout: 20000,
                    }, 1);

                    const j = parseJson(res) || {};
                    const items = (j.response && j.response.store_items) || [];
                    items.forEach((item) => {
                        if (!item || !item.appid || !item.name) return;
                        const cb = $(`#setting input[value="${item.appid}"]`);
                        if (!cb) return;
                        const label = cb.closest('label');
                        const a = label && label.querySelector('a');
                        if (a) a.textContent = item.name;
                        cb.name = item.name;
                    });
                } catch (e) {
                    console.warn('[steam一键移除] GetItems 批次失败:', e);
                }

                if (batchIndex < batches.length) {
                    await sleep(BATCH_GAP_MS);
                }
            }
        };

        await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY, batches.length) }, runBatch)
        );
        return true;
    }

    function renderCheckboxList(list, showLink) {
        const frag = document.createDocumentFragment();
        list.forEach((item) => {
            const p = document.createElement('p');
            p.className = 'checkbox';
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.name = item.name;
            cb.value = item.id;
            cb.addEventListener('change', () => {
                const sa = $('#selectAll');
                if (sa) sa.checked = false;
            });
            label.appendChild(cb);
            if (showLink === 'curator') {
                const a = document.createElement('a');
                a.href = `https://store.steampowered.com/curator/${item.id}`;
                a.target = '_blank'; a.rel = 'noopener';
                a.textContent = item.name;
                label.appendChild(a);
            } else if (showLink === 'app') {
                const a = document.createElement('a');
                a.href = `https://steamcommunity.com/app/${item.id}`;
                a.target = '_blank'; a.rel = 'noopener';
                a.textContent = item.name;
                label.appendChild(a);
            } else {
                label.appendChild(document.createTextNode(item.name));
            }
            p.appendChild(label);
            frag.appendChild(p);
        });
        ui.settingEl.innerHTML = '';
        ui.settingEl.appendChild(frag);
    }

    // ============================================================
    // 6. 执行操作
    // ============================================================

    function collectChecked() {
        return $$('#setting input[type="checkbox"]:checked').map((cb) => ({
            id: cb.value, name: cb.name,
        }));
    }

    async function unfollowCurators(list) {
        const sid = getSessionId();
        let okCount = 0, failCount = 0;
        await runLimited(list, 4, async (c) => {
            const p = appendInfo(`取关鉴赏家 <a href="https://store.steampowered.com/curator/${escapeHtml(c.id)}" target="_blank" rel="noopener">${escapeHtml(c.name)}</a>...`);
            try {
                const res = await gmRequest({
                    method: 'POST',
                    url: 'https://store.steampowered.com/curators/ajaxfollow',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                    data: `clanid=${encodeURIComponent(c.id)}&sessionid=${encodeURIComponent(sid)}&follow=0`,
                    responseType: 'json',
                }, 1);
                const j = parseJson(res) || {};
                const ok = (j.success && j.success.success === 1) || j.success === 1 || j.success === true;
                if (ok) { okCount++; p.innerHTML += ' <span class="rm-ok">成功</span>'; }
                else { failCount++; p.innerHTML += ' <span class="rm-err">失败</span>'; }
            } catch (e) {
                failCount++;
                p.innerHTML += ' <span class="rm-err">失败</span>';
            }
        }, (done, total) => {
            setProgress(`取关鉴赏家进度: <span class="rm-prog">${done}</span> / ${total}`);
        });
        appendInfo(`<span class="rm-ok">完成</span> 成功 <span class="rm-ok">${okCount}</span> 个，失败 <span class="rm-err">${failCount}</span> 个。 <a href="https://store.steampowered.com/curators/mycurators/" target="_blank" rel="noopener">查看结果 →</a>`);
    }

    async function unfollowGames(list) {
        const sid = GM_getValue('session_id', '') || getSessionId();
        let okCount = 0, failCount = 0;
        await runLimited(list, 4, async (g) => {
            const p = appendInfo(`取关游戏 <a href="https://store.steampowered.com/app/${escapeHtml(g.id)}" target="_blank" rel="noopener">${escapeHtml(g.name)}</a>...`);
            try {
                const res = await gmRequest({
                    method: 'POST',
                    url: `https://steamcommunity.com/app/${encodeURIComponent(g.id)}/stopfollowing`,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                    data: `sessionid=${encodeURIComponent(sid)}`,
                }, 1);
                const text = (res.responseText || '').trim();
                if (text === 'null' || text === 'true') {
                    okCount++; p.innerHTML += ' <span class="rm-ok">成功</span>';
                } else {
                    failCount++; p.innerHTML += ' <span class="rm-err">失败</span>';
                }
            } catch (e) {
                failCount++; p.innerHTML += ' <span class="rm-err">失败</span>';
            }
        }, (done, total) => {
            setProgress(`取关游戏进度: <span class="rm-prog">${done}</span> / ${total}`);
        });
        const steam64 = await ensureSteam64();
        const link = steam64
            ? `https://steamcommunity.com/profiles/${steam64}/followedgames/`
            : 'https://steamcommunity.com/my/followedgames/';
        appendInfo(`<span class="rm-ok">完成</span> 成功 <span class="rm-ok">${okCount}</span> 个，失败 <span class="rm-err">${failCount}</span> 个。 <a href="${link}" target="_blank" rel="noopener">查看结果 →</a>`);
    }

    async function removeWishlistBatch(appids) {
        const steam64 = await ensureSteam64();
        if (!steam64) {
            toast('未能获取 steam64ID，请在弹窗顶部手动填写', true);
            return;
        }
        const sid = getSessionId();
        let okCount = 0, failCount = 0;
        await runLimited(appids, 4, async (appid) => {
            const p = appendInfo(`移除愿望单游戏 <a href="https://store.steampowered.com/app/${escapeHtml(appid)}" target="_blank" rel="noopener">${escapeHtml(appid)}</a>...`);
            try {
                const res = await gmRequest({
                    method: 'POST',
                    url: `https://store.steampowered.com/wishlist/profiles/${steam64}/remove/`,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                    data: `appid=${encodeURIComponent(appid)}&sessionid=${encodeURIComponent(sid)}`,
                    responseType: 'json',
                }, 1);
                const j = parseJson(res) || {};
                if (j.success == 1 || j.success === true) {
                    okCount++; p.innerHTML += ' <span class="rm-ok">成功</span>';
                } else {
                    failCount++; p.innerHTML += ' <span class="rm-err">失败</span>';
                }
            } catch (e) {
                failCount++; p.innerHTML += ' <span class="rm-err">失败</span>';
            }
        }, (done, total) => {
            setProgress(`移除愿望单进度: <span class="rm-prog">${done}</span> / ${total}`);
        });
        appendInfo(`<span class="rm-ok">完成</span> 成功 <span class="rm-ok">${okCount}</span> 个，失败 <span class="rm-err">${failCount}</span> 个。 <a href="https://store.steampowered.com/wishlist/profiles/${steam64}/" target="_blank" rel="noopener">查看结果 →</a>`);
    }

    // ============================================================
    // 7. App 页面「一键移除」
    // ============================================================

    function getAppIdFromUrl() {
        const m = location.href.match(/store\.steampowered\.com\/app\/(\d+)/);
        return m ? m[1] : '';
    }

    async function singleAppRemove(appid) {
        const steam64 = await ensureSteam64();
        if (!steam64) { toast('未能获取 steam64ID，请在弹窗顶部手动填写', true); return; }
        const sid = getSessionId();
        try {
            const res = await gmRequest({
                method: 'POST',
                url: `https://store.steampowered.com/wishlist/profiles/${steam64}/remove/`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                data: `appid=${encodeURIComponent(appid)}&sessionid=${encodeURIComponent(sid)}`,
                responseType: 'json',
            });
            const j = parseJson(res) || {};
            if (j.success == 1 || j.success === true) {
                const area = $('#add_to_wishlist_area');
                if (area) area.style.display = '';
                $$('a.queue_btn_active').forEach((el) => {
                    el.classList.remove('queue_btn_active');
                    el.innerHTML = '<span>已移除</span>';
                });
                const succ = $('#add_to_wishlist_area_success');
                if (succ) succ.style.display = 'none';
            }
        } catch (e) { console.warn(e); }
        try {
            const res = await gmRequest({
                method: 'POST',
                url: 'https://store.steampowered.com/explore/followgame/',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                data: `sessionid=${encodeURIComponent(sid)}&appid=${encodeURIComponent(appid)}&unfollow=1`,
            });
            const text = (res.responseText || '').trim();
            if (text === 'true') {
                $$('.queue_btn_follow > .queue_btn_inactive').forEach((el) => { el.style.display = ''; });
                $$('.queue_btn_follow > .queue_btn_active').forEach((el) => { el.style.display = 'none'; });
            }
        } catch (e) { console.warn(e); }
    }

    function injectAppPageButton(retry = 10) {
        if (!/store\.steampowered\.com\/app\/\d+/.test(location.href)) return;
        if ($('.queue_btn_remove')) return;
        const target = $('div.queue_control_button.queue_btn_ignore');
        if (!target) {
            if (retry > 0) setTimeout(() => injectAppPageButton(retry - 1), 500);
            return;
        }
        const wrapper = document.createElement('div');
        wrapper.className = 'queue_control_button queue_btn_remove';
        wrapper.innerHTML = `
            <div class="btnv6_blue_hoverfade btn_medium queue_btn_inactive rm-quick-btn" data-tooltip-text="移除愿望单和取消关注。">
                <span>⚡ 一键移除</span>
            </div>`;
        target.insertAdjacentElement('afterend', wrapper);
        wrapper.querySelector('.queue_btn_inactive').addEventListener('click', async () => {
            const appid = getAppIdFromUrl();
            if (!appid) return;
            await singleAppRemove(appid);
        });
    }

    // ============================================================
    // 8. 弹窗显示/隐藏
    // ============================================================

    function showModal() {
        const modal = $('#remove');
        if (modal) modal.classList.add('visible');
    }
    function hideModal() {
        const modal = $('#remove');
        if (modal) modal.classList.remove('visible');
    }

    // ============================================================
    // 9. UI 注入
    // ============================================================

    function buildModal() {
        const div = document.createElement('div');
        div.id = 'remove';
        div.innerHTML = `
            <div class="rm-header">
                <div class="rm-title">
                    <span class="rm-icon">⚡</span>
                    <span>Steam 一键移除</span>
                    <span class="rm-version">v${VERSION}</span>
                </div>
                <a id="remove_close" class="rm-close" title="关闭">×</a>
            </div>
            <div class="rm-body">
                <div class="rm-section">
                    <div class="rm-section-title">获取列表</div>
                    <div class="button_container">
                        <a id="get_fcl" class="big_button secondary">获取鉴赏家列表</a>
                        <a id="get_fgl" class="big_button secondary">获取关注游戏列表</a>
                        <a id="get_wl"  class="big_button secondary">获取愿望单列表</a>
                    </div>
                </div>
                <div class="rm-section">
                    <div class="rm-section-title">执行操作（先获取列表并勾选）</div>
                    <div class="button_container">
                        <a id="unf_c" class="big_button primary next disabled">取关鉴赏家</a>
                        <a id="unf_g" class="big_button primary next disabled">取关游戏</a>
                        <a id="rem_g" class="big_button primary next disabled">移除愿望单</a>
                    </div>
                </div>
                <div id="manual_id_bar">
                    <span class="rm-label">SteamID</span>
                    <input id="manual_steam_id" type="text" placeholder="17位ID / 自定义名 / 完整链接（可选）">
                    <a id="manual_id_save"  class="mini_btn">保存</a>
                    <a id="manual_id_clear" class="mini_btn">清除</a>
                    <span id="manual_id_status"></span>
                </div>
                <h2 id="pro"></h2>
                <div id="output">
                    <div id="setting"></div>
                    <div id="info"></div>
                </div>
                <div class="rm-footer">
                    <label><input id="selectAll" type="checkbox"> 全选</label>
                    <label><input id="reverse" type="checkbox"> 反选</label>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        return div;
    }

    function isLoggedInQuick() {
        resolveIdentityFast();
        if (identity.accountId || identity.steam64) return true;
        if (/(?:^|;\s*)steamLoginSecure=[^;]+/.test(document.cookie)) return true;
        return false;
    }

    async function verifyLoggedIn() {
        try {
            const res = await gmRequest({
                url: 'https://store.steampowered.com/pointssummary/ajaxgetasyncconfig',
                responseType: 'json',
                timeout: 8000,
            }, 0);
            const j = parseJson(res) || {};
            return !!(j && j.data && j.data.logged_in);
        } catch (e) { return false; }
    }

    async function onMenuClick() {
        if (location.host === 'steamcommunity.com') {
            if (confirm('此功能需要在商店页面运行，是否跳转？')) {
                location.href = 'https://store.steampowered.com/';
            }
            return;
        }
        ensureSteam64();
        showModal();
        if (!isLoggedInQuick() && !getManualSteam64()) {
            verifyLoggedIn().then((ok) => {
                if (!ok && !getManualSteam64()) {
                    toast('检测到可能未登录，操作若失败请在弹窗内手动填写 SteamID', true);
                }
            });
        }
    }

    function injectMenuButton() {
        const nav = $('.supernav_container');
        if (!nav) return false;
        const a = document.createElement('a');
        a.id = 'remove_btn';
        a.className = 'menuitem supernav';
        a.href = 'javascript:void(0)';
        a.textContent = '一键移除';
        nav.appendChild(a);
        a.addEventListener('click', onMenuClick);
        return true;
    }

    function bindModalEvents() {
        ui.settingEl = $('#setting');
        ui.infoEl = $('#info');
        ui.proEl = $('#pro');

        $('#remove_close')?.addEventListener('click', hideModal);

        $('#get_fcl')?.addEventListener('click', () => getCurators());
        $('#get_fgl')?.addEventListener('click', () => getFollowGames());
        $('#get_wl')?.addEventListener('click', () => getWishlist());

        $('#unf_c')?.addEventListener('click', async () => {
            const btn = $('#unf_c');
            if (btn.classList.contains('disabled')) return;
            const list = collectChecked();
            if (!list.length) { toast('你还没有选中要取关的鉴赏家！', true); return; }
            btn.classList.add('disabled');
            try { await unfollowCurators(list); }
            finally { btn.classList.remove('disabled'); }
        });

        $('#unf_g')?.addEventListener('click', async () => {
            const btn = $('#unf_g');
            if (btn.classList.contains('disabled')) return;
            const list = collectChecked();
            if (!list.length) { toast('你还没有选中要取关的游戏！', true); return; }
            btn.classList.add('disabled');
            try { await unfollowGames(list); }
            finally { btn.classList.remove('disabled'); }
        });

        $('#rem_g')?.addEventListener('click', async () => {
            const btn = $('#rem_g');
            if (btn.classList.contains('disabled')) return;
            const list = collectChecked().map((x) => x.id);
            if (!list.length) { toast('你还没有选中要移除愿望单的游戏！', true); return; }
            btn.classList.add('disabled');
            try { await removeWishlistBatch(list); }
            finally { btn.classList.remove('disabled'); }
        });

        $('#selectAll')?.addEventListener('change', function () {
            const checked = this.checked;
            $$('#setting input[type="checkbox"]').forEach((cb) => { cb.checked = checked; });
        });

        $('#reverse')?.addEventListener('change', function () {
            $$('#setting input[type="checkbox"]').forEach((cb) => { cb.checked = !cb.checked; });
            const sa = $('#selectAll');
            if (sa) sa.checked = false;
            this.checked = false;
        });

        // 手动 SteamID
        const manualInput = $('#manual_steam_id');
        const manualStatus = $('#manual_id_status');
        if (manualInput) {
            const saved = GM_getValue(MANUAL_ID_KEY, '') || '';
            if (saved) manualInput.value = saved;
            manualInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); $('#manual_id_save')?.click(); }
            });
        }

        $('#manual_id_save')?.addEventListener('click', async () => {
            if (!manualInput) return;
            const raw = (manualInput.value || '').trim();
            if (!raw) {
                GM_setValue(MANUAL_ID_KEY, '');
                identity.steam64 = '';
                steam64Promise = null;
                manualInput.value = '';
                if (manualStatus) manualStatus.innerHTML = '<span class="rm-warn">已清空</span>';
                return;
            }
            if (manualStatus) manualStatus.innerHTML = '<span class="rm-pending">解析中...</span>';
            const id = await resolveVanityOrId(raw);
            if (!id) {
                if (manualStatus) manualStatus.innerHTML = '<span class="rm-err">解析失败，请填写 17 位 Steam64 ID</span>';
                return;
            }
            GM_setValue(MANUAL_ID_KEY, id);
            identity.steam64 = id;
            steam64Promise = null;
            manualInput.value = id;
            if (manualStatus) manualStatus.innerHTML = '<span class="rm-ok">已保存</span>';
            toast('SteamID 已保存: ' + id, false);
        });

        $('#manual_id_clear')?.addEventListener('click', () => {
            GM_setValue(MANUAL_ID_KEY, '');
            identity.steam64 = '';
            steam64Promise = null;
            if (manualInput) manualInput.value = '';
            if (manualStatus) manualStatus.innerHTML = '<span class="rm-warn">已清空</span>';
        });
    }

    // ============================================================
    // 10. 样式
    // ============================================================

    function injectStyles() {
        GM_addStyle(`
            #remove_btn {
                position: relative;
                color: #66c0f4 !important;
                font-weight: 500;
                cursor: pointer;
            }
            #remove_btn::after {
                content: '';
                position: absolute;
                left: 7px;
                right: 7px;
                bottom: 0;
                height: 2px;
                background: linear-gradient(90deg, #66c0f4, #4a90d9);
                border-radius: 1px 1px 0 0;
                opacity: .55;
                transition: opacity .15s ease;
                pointer-events: none;
            }
            #remove_btn:hover { color: #ffffff !important; }
            #remove_btn:hover::after { opacity: 1; }

            .rm-quick-btn {
                background: linear-gradient(135deg, #4a90d9 0%, #66c0f4 100%) !important;
                color: #fff !important;
                border-radius: 3px;
                box-shadow: 0 2px 6px rgba(102,192,244,.35), inset 0 1px 0 rgba(255,255,255,.3);
                transition: all .2s;
            }
            .rm-quick-btn:hover {
                background: linear-gradient(135deg, #5ba0e9 0%, #7fd0ff 100%) !important;
                box-shadow: 0 3px 10px rgba(102,192,244,.55), inset 0 1px 0 rgba(255,255,255,.4);
                transform: translateY(-1px);
            }

            #remove {
                background: linear-gradient(180deg, #1b2838 0%, #16202d 100%);
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%) scale(.96);
                border-radius: 10px;
                width: 840px;
                height: 600px;
                max-width: 95vw;
                max-height: 90vh;
                z-index: 99999999999;
                opacity: 0;
                pointer-events: none;
                transition: opacity .22s ease, transform .22s cubic-bezier(.34, 1.3, .64, 1);
                box-shadow: 0 20px 60px rgba(0,0,0,.85), 0 0 0 1px rgba(102,192,244,.25),
                            inset 0 1px 0 rgba(255,255,255,.05);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                color: #c6d4df;
                font-family: "Motiva Sans", Arial, sans-serif;
                font-size: 13px;
            }
            #remove.visible {
                opacity: 1;
                pointer-events: auto;
                transform: translate(-50%, -50%) scale(1);
            }

            .rm-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 20px;
                background: linear-gradient(90deg, #2a475e 0%, #1e3a4c 100%);
                border-bottom: 1px solid rgba(102,192,244,.2);
                flex-shrink: 0;
            }
            .rm-title {
                font-size: 17px;
                font-weight: 600;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 8px;
                text-shadow: 0 1px 3px rgba(0,0,0,.5);
            }
            .rm-icon {
                font-size: 22px;
                filter: drop-shadow(0 0 6px rgba(102,192,244,.6));
            }
            .rm-version {
                font-size: 11px;
                color: #66c0f4;
                background: rgba(102,192,244,.15);
                padding: 2px 8px;
                border-radius: 10px;
                margin-left: 6px;
                font-weight: 500;
                border: 1px solid rgba(102,192,244,.25);
            }
            .rm-close {
                font-size: 26px;
                color: #8f98a0;
                text-decoration: none;
                line-height: 1;
                width: 32px; height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all .2s;
                cursor: pointer;
                user-select: none;
            }
            .rm-close:hover {
                background: #c94a4a;
                color: #fff;
                transform: rotate(90deg);
                box-shadow: 0 0 12px rgba(201,74,74,.5);
            }

            .rm-body {
                flex: 1;
                padding: 16px 22px 12px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                gap: 12px;
                min-height: 0;
            }

            .rm-section {
                display: flex;
                flex-direction: column;
                gap: 6px;
                flex-shrink: 0;
            }
            .rm-section-title {
                font-size: 11px;
                color: #8f98a0;
                text-transform: uppercase;
                letter-spacing: 1.2px;
                padding-left: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
                font-weight: 600;
            }
            .rm-section-title::before {
                content: '';
                width: 3px;
                height: 12px;
                background: linear-gradient(180deg, #66c0f4, #4a90d9);
                border-radius: 2px;
                box-shadow: 0 0 6px rgba(102,192,244,.6);
            }

            .button_container { display: flex; gap: 8px; }

            .big_button {
                cursor: pointer;
                flex: 1;
                min-width: 0;
                height: 36px;
                line-height: 34px;
                font-family: inherit;
                font-weight: 600;
                font-size: 13px;
                text-align: center;
                text-decoration: none;
                border-radius: 4px;
                transition: all .2s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0 12px;
                letter-spacing: .3px;
                position: relative;
                overflow: hidden;
                user-select: none;
                white-space: nowrap;
                box-sizing: border-box;
            }

            .big_button.secondary {
                background: linear-gradient(180deg, #2a475e 0%, #1e3a4c 100%);
                color: #8fbcdf;
                border: 1px solid #3a6a8a;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 1px 3px rgba(0,0,0,.3);
            }
            .big_button.secondary::before { content: '↓ '; opacity: .7; }
            .big_button.secondary:hover {
                background: linear-gradient(180deg, #3a6a8a 0%, #2a475e 100%);
                color: #fff;
                border-color: #66c0f4;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.15), 0 3px 10px rgba(102,192,244,.3);
                transform: translateY(-1px);
            }
            .big_button.secondary:active { transform: translateY(0); }

            .big_button.primary {
                background: linear-gradient(180deg, #d9534f 0%, #b03a36 100%);
                color: #fff;
                border: 1px solid #e05550;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 1px 3px rgba(0,0,0,.4);
                text-shadow: 0 1px 2px rgba(0,0,0,.3);
            }
            .big_button.primary::before { content: '✕ '; opacity: .85; }
            .big_button.primary:hover {
                background: linear-gradient(180deg, #e6635e 0%, #c04540 100%);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 3px 12px rgba(217,83,79,.55);
                transform: translateY(-1px);
            }
            .big_button.primary:active { transform: translateY(0); }

            .big_button.disabled {
                background: linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 100%) !important;
                color: #555 !important;
                border-color: #3a3a3a !important;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.03) !important;
                cursor: not-allowed !important;
                pointer-events: none;
                text-shadow: none !important;
                transform: none !important;
            }
            .big_button.disabled::before { opacity: .3; }

            #manual_id_bar {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(102,192,244,.04);
                border: 1px solid rgba(102,192,244,.15);
                border-radius: 4px;
                font-size: 12px;
                color: #8f98a0;
                flex-wrap: wrap;
                flex-shrink: 0;
            }
            #manual_id_bar .rm-label {
                color: #66c0f4;
                font-weight: 600;
                font-size: 11px;
                letter-spacing: .5px;
                text-transform: uppercase;
                flex-shrink: 0;
            }
            #manual_steam_id {
                flex: 1;
                min-width: 160px;
                height: 26px;
                padding: 0 10px;
                background: #0e1419;
                border: 1px solid #2a475e;
                color: #c6d4df;
                border-radius: 3px;
                font-size: 12px;
                outline: none;
                transition: all .2s;
                font-family: Consolas, Monaco, monospace;
                box-sizing: border-box;
            }
            #manual_steam_id:focus {
                border-color: #66c0f4;
                box-shadow: 0 0 0 2px rgba(102,192,244,.2);
                background: #131e28;
            }
            #manual_steam_id::placeholder { color: #4a5c6a; }

            .mini_btn {
                display: inline-block;
                padding: 0 12px;
                height: 26px;
                line-height: 24px;
                font-size: 12px;
                color: #66c0f4;
                border: 1px solid #3a6a8a;
                border-radius: 3px;
                background: #2a475e;
                text-decoration: none;
                cursor: pointer;
                transition: all .2s;
                white-space: nowrap;
                font-weight: 500;
                flex-shrink: 0;
                box-sizing: border-box;
            }
            .mini_btn:hover {
                background: #3a6a8a;
                color: #fff;
                border-color: #66c0f4;
                box-shadow: 0 0 8px rgba(102,192,244,.3);
            }

            #pro {
                min-height: 20px;
                font-size: 13px;
                color: #8fbcdf;
                padding: 0 4px;
                font-weight: 500;
                margin: 0;
                flex-shrink: 0;
            }
            .rm-prog { color: #66c0f4; font-weight: 700; }

            #output {
                flex: 1;
                background: #0e1419;
                border: 1px solid rgba(102,192,244,.1);
                border-radius: 4px;
                display: flex;
                overflow: hidden;
                min-height: 0;
                box-shadow: inset 0 2px 8px rgba(0,0,0,.3);
            }
            #setting {
                width: 50%;
                padding: 8px;
                overflow-y: auto;
                border-right: 1px dashed rgba(102,192,244,.15);
                box-sizing: border-box;
            }
            #info {
                flex: 1;
                padding: 8px;
                overflow-y: auto;
                box-sizing: border-box;
            }
            #setting::-webkit-scrollbar,
            #info::-webkit-scrollbar { width: 8px; }
            #setting::-webkit-scrollbar-track,
            #info::-webkit-scrollbar-track {
                background: rgba(0,0,0,.3);
                border-radius: 4px;
            }
            #setting::-webkit-scrollbar-thumb,
            #info::-webkit-scrollbar-thumb {
                background: #2a475e;
                border-radius: 4px;
            }
            #setting::-webkit-scrollbar-thumb:hover,
            #info::-webkit-scrollbar-thumb:hover {
                background: #3a6a8a;
            }

            #setting .checkbox {
                padding: 4px 8px;
                border-radius: 3px;
                transition: background .15s;
                margin: 1px 0;
                display: flex;
                align-items: center;
                font-size: 13px;
            }
            #setting .checkbox:hover { background: rgba(102,192,244,.08); }
            #setting .checkbox label {
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                width: 100%;
                min-width: 0;
            }
            #setting .checkbox input[type="checkbox"] {
                accent-color: #66c0f4;
                cursor: pointer;
                flex-shrink: 0;
                width: 14px;
                height: 14px;
            }
            #setting .checkbox a {
                color: #8fbcdf;
                text-decoration: none;
                transition: color .15s;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            #setting .checkbox a:hover {
                color: #66c0f4;
                text-decoration: underline;
            }

            #info p {
                padding: 4px 8px;
                margin: 2px 0;
                border-radius: 3px;
                font-size: 12px;
                line-height: 1.5;
                border-left: 2px solid transparent;
                transition: background .15s;
                color: #b0c2d0;
            }
            #info p:hover { background: rgba(102,192,244,.05); border-left-color: rgba(102,192,244,.4); }
            #info a { color: #66c0f4; text-decoration: none; }
            #info a:hover { text-decoration: underline; }

            .rm-ok { color: #5fd75f; font-weight: 600; }
            .rm-err { color: #ff6b6b; font-weight: 600; }
            .rm-warn { color: #ffa94d; font-weight: 600; }
            .rm-pending { color: #8f98a0; }

            .rm-footer {
                display: flex;
                align-items: center;
                gap: 20px;
                padding: 8px 4px 0;
                border-top: 1px solid rgba(102,192,244,.1);
                margin-top: 8px;
                font-size: 13px;
                color: #8f98a0;
                flex-shrink: 0;
            }
            .rm-footer label {
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                user-select: none;
                transition: color .15s;
            }
            .rm-footer label:hover { color: #66c0f4; }
            .rm-footer input[type="checkbox"] {
                accent-color: #66c0f4;
                cursor: pointer;
            }

            #remove_btn_floating {
                position: fixed;
                right: 24px;
                bottom: 24px;
                z-index: 99999;
                background: linear-gradient(135deg, #4a90d9 0%, #66c0f4 100%);
                color: #fff !important;
                padding: 10px 18px;
                border-radius: 24px;
                cursor: pointer;
                font-weight: 700;
                text-decoration: none !important;
                font-size: 13px;
                box-shadow: 0 4px 16px rgba(102,192,244,.5), inset 0 1px 0 rgba(255,255,255,.35);
                transition: all .2s;
                letter-spacing: .5px;
            }
            #remove_btn_floating:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102,192,244,.7), inset 0 1px 0 rgba(255,255,255,.5);
            }
        `);
    }

    // ============================================================
    // 11. 启动
    // ============================================================

    function init() {
        resolveIdentityFast();
        injectStyles();
        buildModal();
        bindModalEvents();

        if (!injectMenuButton()) {
            const btn = document.createElement('a');
            btn.id = 'remove_btn_floating';
            btn.textContent = '⚡ 一键移除';
            btn.addEventListener('click', onMenuClick);
            document.body.appendChild(btn);
        }

        injectAppPageButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
