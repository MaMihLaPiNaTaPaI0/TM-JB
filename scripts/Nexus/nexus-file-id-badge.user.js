// ==UserScript==
// @name         Nexus File ID Badge
// @name:zh      Nexus 文件ID徽章显示
// @name:en      Nexus File ID Badge
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      3.3.3
// @description  Show file ID as badge on Nexus Mods files section
// @description:zh  在Nexus Mods文件区块右上角显示文件ID徽章
// @description:en  Show file ID as badge on Nexus Mods files section
// @author       MaMihLaPiNaTaPaI0
// @match        *://www.nexusmods.com/*
// @match        *://next.nexusmods.com/*
// @grant        GM_addStyle
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-file-id-badge.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-file-id-badge.user.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .enhanced-file-id-badge {
            position: absolute;
            top: 5px;
            right: 5px;
            background: #722ed1;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
            z-index: 100;
        }
    `);

    $(function() {
        if (window.location.search.includes('tab=files')) {
            $('dt.file-expander-header[data-id]').each(function() {
                const fileId = $(this).attr('data-id');
                $(this).css('position', 'relative').append(
                    `<div class="enhanced-file-id-badge">ID: ${fileId}</div>`
                );
            });
        }
    });
})();
