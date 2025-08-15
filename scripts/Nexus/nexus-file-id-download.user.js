// ==UserScript==
// @name         Nexus File ID Above Download
// @name:zh      Nexus 下载按钮上方ID显示
// @name:en      Nexus File ID Above Download
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      3.3.3
// @description  Show file ID above download button on Nexus Mods
// @description:zh  在Nexus Mods下载按钮上方显示文件ID
// @description:en  Show file ID above download button on Nexus Mods
// @author       MaMihLaPiNaTaPaI0
// @match        *://www.nexusmods.com/*
// @match        *://next.nexusmods.com/*
// @grant        GM_addStyle
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-file-id-download.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-file-id-download.user.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .enhanced-file-id-download {
            display: block;
            text-align: center;
            margin-bottom: 10px;
            padding: 6px;
            background: #f9f0ff;
            border: 1px solid #9254de;
            border-radius: 4px;
            font-weight: bold;
            color: #391085;
        }
    `);

    $(function() {
        if (window.location.search.includes('tab=files')) {
            $('dd[data-id]').each(function() {
                const fileId = $(this).attr('data-id');
                $(this).find('.accordion-downloads').prepend(
                    `<li><div class="enhanced-file-id-download">文件ID: ${fileId}</div></li>`
                );
            });
        }
    });
})();
