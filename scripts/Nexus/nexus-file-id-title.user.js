// ==UserScript==
// @name         Nexus File ID in Title
// @name:zh      Nexus 文件标题ID显示
// @name:en      Nexus File ID in Title
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      3.3.3
// @description  Show file ID next to file title on Nexus Mods
// @description:zh  在Nexus Mods文件标题旁显示文件ID
// @description:en  Show file ID next to file title on Nexus Mods
// @author       MaMihLaPiNaTaPaI0
// @match        *://www.nexusmods.com/*
// @match        *://next.nexusmods.com/*
// @grant        GM_addStyle
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-file-id-title.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-file-id-title.user.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .enhanced-file-id {
            background-color: #f6ffed;
            color: #237804;
            border: 1px solid #52c41a;
            border-radius: 3px;
            padding: 3px 8px;
            font-size: 13px;
            margin-left: 10px;
            font-weight: bold;
            display: inline-block;
        }
    `);

    $(function() {
        if (window.location.search.includes('tab=files')) {
            $('dt.file-expander-header[data-id]').each(function() {
                const fileId = $(this).attr('data-id');
                $(this).find('p').first().append(
                    `<span class="enhanced-file-id">文件ID: ${fileId}</span>`
                );
            });
        }
    });
})();
