// ==UserScript==
// @name         Nexus Mod ID Display
// @name:zh      Nexus Mod ID 显示
// @name:en      Nexus Mod ID Display
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      3.3.3
// @description  Display MOD ID on Nexus Mods pages
// @description:zh  在Nexus Mods页面显示MOD ID
// @description:en  Display MOD ID on Nexus Mods pages
// @author       MaMihLaPiNaTaPaI0
// @match        *://www.nexusmods.com/*
// @match        *://next.nexusmods.com/*
// @grant        GM_addStyle
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-mod-id-display.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-mod-id-display.user.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .enhanced-mod-id-container {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 10px 15px;
            background: linear-gradient(135deg, #e6f7ff, #bae7ff);
            border-left: 4px solid #1890ff;
            border-radius: 0 4px 4px 0;
            box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
        }
        .enhanced-mod-id-label {
            font-weight: bold;
            margin-right: 10px;
            color: #0050b3;
            font-size: 16px;
        }
        .enhanced-mod-id-value {
            background: #1890ff;
            color: white;
            padding: 5px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 18px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
    `);

    $(function() {
        const modIdMatch = window.location.pathname.match(/\/mods\/(\d+)/);
        if (modIdMatch) {
            const modIdContainer = $(`
                <div class="enhanced-mod-id-container">
                    <span class="enhanced-mod-id-label">MOD ID:</span>
                    <span class="enhanced-mod-id-value">${modIdMatch[1]}</span>
                </div>
            `);
            $('div.mod-header__title, h1[itemprop="name"], h1.title, h1').first().after(modIdContainer);
        }
    });
})();
