// ==UserScript==
// @name         Nexus Mod ID Helper
// @name:zh      Nexus Mod ID 小工具
// @name:en      Nexus Mod ID Helper
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      3.3.3
// @description  Safely display MOD/File IDs on Nexus Mods without triggering site detection
// @description:zh  安全的显示Nexus Mods的MOD/文件ID，不触发网站检测
// @description:en  Safely display MOD/File IDs on Nexus Mods without triggering site detection
// @author       MaMihLaPiNaTaPaI0
// @license      MIT
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-mod-id-helper.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-mod-id-helper.user.js
// @match        *://www.nexusmods.com/*
// @match        *://next.nexusmods.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @noframes
// ==/UserScript==


(function() {
    'use strict';

    // ==============================
    // 配置区域（1开，0关）
    // ==============================
    const 显示全网链接编号 = 1;      // 在所有网站上遇到 Nexus Mods 链接时显示 MOD 编号
    const 显示MOD编号 = 1;          // 在 Nexus Mods 页面显示 MOD 编号
    const 显示标题旁编号 = 1;        // 在 Nexus Mods 文件页面标题旁显示文件编号
    const 显示区块右上角编号 = 1;    // 在 Nexus Mods 文件区块右上角显示文件编号
    const 显示下载按钮上方编号 = 1;  // 在 Nexus Mods 下载按钮上方显示文件编号

    // ==============================
    // 样式定义（保持原有精美样式）
    // ==============================
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
        .nexus-link-id {
            display: inline-block;
            margin-left: 4px;
            padding: 1px 4px;
            background-color: #f0f5ff;
            border: 1px solid #adc6ff;
            border-radius: 2px;
            color: #1d39c4;
            font-size: 0.85em;
            font-weight: bold;
        }
    `);

    // ==============================
    // 核心功能（单次执行无监听）
    // ==============================
    $(function() {
        const 当前网址 = window.location.hostname;
        const 是否Nexus = 当前网址.indexOf('nexusmods.com') !== -1;

        // 1. 在 Nexus Mods 页面显示 MOD 编号
        if (是否Nexus && 显示MOD编号 === 1) {
            const modIdMatch = window.location.pathname.match(/\/mods\/(\d+)/);
            if (modIdMatch) {
                const modIdContainer = $(`
                    <div class="enhanced-mod-id-container">
                        <span class="enhanced-mod-id-label">MOD ID：</span>
                        <span class="enhanced-mod-id-value">${modIdMatch[1]}</span>
                    </div>
                `);
                $('div.mod-header__title, h1[itemprop="name"], h1.title, h1').first().after(modIdContainer);
            }
        }

        // 2. 处理 Nexus Mods 文件页面 (当 URL 包含 tab=files)
        if (是否Nexus && window.location.search.indexOf('tab=files') !== -1) {
            // 文件标题旁显示文件编号
            if (显示标题旁编号 === 1) {
                $('dt.file-expander-header[data-id]').each(function() {
                    const fileId = $(this).attr('data-id');
                    $(this).find('p').first().append(`<span class="enhanced-file-id">文件ID：${fileId}</span>`);
                });
            }

            // 文件区块右上角徽章显示文件编号
            if (显示区块右上角编号 === 1) {
                $('dt.file-expander-header[data-id]').each(function() {
                    const fileId = $(this).attr('data-id');
                    $(this).css('position', 'relative').append(`<div class="enhanced-file-id-badge">ID：${fileId}</div>`);
                });
            }

            // 下载按钮上方显示文件编号
            if (显示下载按钮上方编号 === 1) {
                $('dd[data-id]').each(function() {
                    const fileId = $(this).attr('data-id');
                    $(this).find('.accordion-downloads').prepend(`<li><div class="enhanced-file-id-download">文件ID：${fileId}</div></li>`);
                });
            }
        }

        // 3. 全网 Nexus 链接处理
        if (显示全网链接编号 === 1) {
            let 所有链接 = $('a');
            for (let 链接 of 所有链接) {
                let href = $(链接).attr('href');
                if (!href) {
                    continue;
                }
                let 匹配结果 = href.match(/.*www\.nexusmods\.com\/.*\/mods\/(\d+).*/);
                if (!匹配结果) {
                    continue;
                }
                let nexusId = 匹配结果[1];
                if ($(链接).next('.nexus-link-id').length === 0) {
                    $(链接).after(`<span class="nexus-link-id">${nexusId}</span>`);
                }
            }
        }
    });
})();
