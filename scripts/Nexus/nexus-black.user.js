// ==UserScript==
// @name         Nexus Mods Black
// @name:zh      Nexus Mods 关键词屏蔽
// @name:en      Nexus Mods Black
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      6.0
// @description  Hide mods containing blacklisted keywords on Nexus Mods
// @description:zh  在Nexus Mods上隐藏包含黑名单关键词的模组
// @description:en  Hide mods containing blacklisted keywords on Nexus Mods
// @author       MaMihLaPiNaTaPaI0
// @license      MIT
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-black.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-black.user.js
// @match        *://www.nexusmods.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @noframes
// @antifeature  tracking
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        #bl-floating-panel {
            position: fixed !important;
            top: 100px !important;
            right: 20px !important;
            width: 180px !important;
            background: #2d2d2d !important;
            color: white !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important;
            z-index: 2147483646 !important;
            font-family: Arial, sans-serif !important;
            overflow: hidden;
            padding: 10px;
            font-size: 13px;
            cursor: default;
        }
        #bl-panel-header {
            cursor: move;
            margin-bottom: 8px;
            color: #f57c00;
            font-weight: bold;
            user-select: none;
            text-align: center;
        }
        #bl-stats {
            user-select: none;
            margin-bottom: 8px;
            font-size: 12px;
            line-height: 1.4;
        }
        #bl-settings-btn {
            background: #4caf50;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            width: 100%;
            cursor: pointer;
            font-size: 12px;
        }
        #blacklist-popup-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0,0,0,0.8) !important;
            z-index: 2147483647 !important;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #blacklist-popup-container {
            background: #2d2d2d !important;
            color: #fff !important;
            border-radius: 8px !important;
            padding: 20px !important;
            min-width: 500px !important;
            max-width: 80vw !important;
            max-height: 80vh !important;
            overflow: auto !important;
            box-shadow: 0 0 20px rgba(0,0,0,0.5) !important;
        }
        [data-blacklisted="true"] {
            display: none !important;
        }
    `);

    const STORAGE_KEY = "nexusmods_blacklist";
    let blacklist = [];
    let blockedCount = 0;
    let hasInitialized = false;
    let gridObserver = null;

    function loadBlacklist() {
        try {
            const stored = GM_getValue(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    function saveBlacklist(list) {
        GM_setValue(STORAGE_KEY, JSON.stringify(list));
    }

    function isBlacklisted(title) {
        return blacklist.some(term =>
            term && title.toLowerCase().includes(term.toLowerCase())
        );
    }

    function updatePanelDisplay() {
        const statsElem = document.getElementById('bl-stats');
        if (statsElem) {
            statsElem.textContent = blacklist.length > 0
                ? `已屏蔽关键词为：${blacklist.join(", ")}`
                : "已屏蔽关键词为：空";
        }
    }

    function updateBlockedCount(count) {
        try {
            blockedCount = count;
            const resultCountElem = document.querySelector('[data-e2eid="result-count"]');
            if (!resultCountElem) return;

            const match = resultCountElem.textContent.match(/^(\d+(?:,\d+)*) results/i);
            if (!match) return;

            const baseText = `${match[1]} 个结果`;
            resultCountElem.textContent = count > 0
                ? `${baseText} (已屏蔽 ${count} 个)`
                : baseText;

            updatePanelDisplay();
        } catch (e) {}
    }

    function removeBlacklistedMods() {
        const grid = document.querySelector(".mods-grid, [data-testid='mods-grid']");
        if (!grid) return;

        const modTiles = grid.querySelectorAll('[data-e2eid="mod-tile"], [data-testid="mod-tile"]');
        let newBlockedCount = 0;

        modTiles.forEach(tile => {
            const titleLink = tile.querySelector('[data-e2eid="mod-tile-title"]');
            if (!titleLink) return;

            const title = titleLink.textContent.trim();
            if (isBlacklisted(title)) {
                if (!tile.dataset.blacklisted) {
                    tile.dataset.blacklisted = 'true';
                    newBlockedCount++;
                }
            } else if (tile.dataset.blacklisted) {
                delete tile.dataset.blacklisted;
            }
        });

        updateBlockedCount(newBlockedCount);
    }

    function showBlacklistPopup() {
        const popupOverlay = document.createElement('div');
        popupOverlay.id = 'blacklist-popup-overlay';

        const popupContainer = document.createElement('div');
        popupContainer.id = 'blacklist-popup-container';
        popupContainer.innerHTML = `
            <h2 style="margin: 0 0 15px 0; color: #f57c00;">MOD关键字屏蔽设置</h2>
            <p style="margin-bottom: 15px; color: #ccc;">包含以下关键词的模组将自动隐藏:</p>
            <div id="blacklist-entries"></div>
            <button id="blacklist-add-btn" style="background: #4caf50; color: white; border: none; border-radius: 4px; padding: 8px 15px; margin-bottom: 15px; cursor: pointer;">+ 添加关键词</button>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="blacklist-save-btn" style="background: #4caf50; color: white; border: none; border-radius: 4px; padding: 8px 20px; cursor: pointer;">保存</button>
                <button id="blacklist-cancel-btn" style="background: #f44336; color: white; border: none; border-radius: 4px; padding: 8px 20px; cursor: pointer;">取消</button>
            </div>
        `;

        const entriesContainer = popupContainer.querySelector('#blacklist-entries');

        function addEntryRow(value = '') {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.marginBottom = '10px';
            row.style.alignItems = 'center';

            const input = document.createElement('input');
            input.type = 'text';
            input.style.flexGrow = '1';
            input.style.padding = '8px';
            input.style.background = '#1a1a1a';
            input.style.color = '#fff';
            input.style.border = '1px solid #444';
            input.style.borderRadius = '4px';
            input.value = value;
            input.placeholder = '输入屏蔽关键词...';

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.style.marginLeft = '10px';
            deleteBtn.style.background = '#d32f2f';
            deleteBtn.style.color = 'white';
            deleteBtn.style.border = 'none';
            deleteBtn.style.borderRadius = '4px';
            deleteBtn.style.width = '30px';
            deleteBtn.style.height = '30px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.onclick = () => row.remove();

            row.appendChild(input);
            row.appendChild(deleteBtn);
            entriesContainer.appendChild(row);

            if (value === '') input.focus();
        }

        blacklist.forEach(term => addEntryRow(term));
        if (blacklist.length === 0) addEntryRow();

        popupContainer.querySelector('#blacklist-add-btn').onclick = () => addEntryRow();
        popupContainer.querySelector('#blacklist-cancel-btn').onclick = () => popupOverlay.remove();
        popupContainer.querySelector('#blacklist-save-btn').onclick = () => {
            const inputs = entriesContainer.querySelectorAll('input');
            blacklist = Array.from(inputs)
                .map(input => input.value.trim())
                .filter(term => term.length > 0);

            saveBlacklist(blacklist);
            popupOverlay.remove();
            window.location.reload();
        };

        popupOverlay.appendChild(popupContainer);
        document.body.appendChild(popupOverlay);

        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) popupOverlay.remove();
        });
    }

    function createFloatingPanel() {
        if (document.getElementById('bl-floating-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'bl-floating-panel';
        panel.innerHTML = `
            <div id="bl-panel-header">MOD关键字屏蔽</div>
            <div id="bl-stats">已屏蔽关键词为：空</div>
            <button id="bl-settings-btn">设置</button>
        `;

        document.body.appendChild(panel);

        const header = document.getElementById('bl-panel-header');
        let isDragging = false;
        let offsetX, offsetY;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - panel.getBoundingClientRect().left;
            offsetY = e.clientY - panel.getBoundingClientRect().top;
            panel.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.left = `${e.clientX - offsetX}px`;
            panel.style.top = `${e.clientY - offsetY}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            panel.style.cursor = '';
        });

        document.getElementById('bl-settings-btn').addEventListener('click', showBlacklistPopup);
    }

    function init() {
        if (hasInitialized) return;
        hasInitialized = true;

        blacklist = loadBlacklist();
        createFloatingPanel();
        removeBlacklistedMods();

        const grid = document.querySelector(".mods-grid, [data-testid='mods-grid']");
        if (grid) {
            gridObserver = new MutationObserver(removeBlacklistedMods);
            gridObserver.observe(grid, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'complete') {
        setTimeout(init, 1000);
    } else {
        window.addEventListener('load', () => setTimeout(init, 1000));
    }
})();
