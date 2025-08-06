// ==UserScript==
// @name         百度S链接(BAIDU-S-LIANJIE)
// @name:zh      百度S链接(BAIDU-S-LIANJIE)
// @name:en      Baidu S-Link
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      1.0.0
// @description  在百度网盘分享页面下方显示完整URL
// @description:zh 在百度网盘分享页面下方显示完整URL
// @description:en Show full URL under Baidu Netdisk share links
// @author       MaMihLaPiNaTaPaI0
// @license      MIT
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/BAIDU-S-LIANJIE.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/BAIDU-S-LIANJIE.user.js
// @match        *://pan.baidu.com/*
// @run-at       document-idle
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @noframes
// @antifeature  tracking
// ==/UserScript==



(function() {
    'use strict';


    let isProcessing = false;
    let processedLinks = new Set();


    const styleId = 'bdpan-link-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .bdpan-link-line {
                display: block;
                margin: 2px 0 8px 0;
                padding: 0;
                background: transparent !important;
                font-family: inherit;
                font-size: 0.92em;
                word-break: break-all;
                color: #666;
                font-style: italic;
                line-height: 1.4;
            }
            .bdpan-link-text {
                color: #1890ff;
                text-decoration: none;
            }
        `;
        document.head.appendChild(style);
    }


    function findShareLinks() {
        if (isProcessing) return;
        isProcessing = true;

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: node =>
                    node.parentNode?.nodeType === 1 &&
                    window.getComputedStyle(node.parentNode).display !== 'none' &&
                    node.textContent.includes('/s/') ?
                    NodeFilter.FILTER_ACCEPT :
                    NodeFilter.FILTER_REJECT
            }
        );

        const batchSize = 50;
        let count = 0;

        while (walker.nextNode() && count < batchSize) {
            const textNode = walker.currentNode;
            const text = textNode.textContent;

            const regex = /\/s\/([\w-]{6,})/g;
            let match;

            while ((match = regex.exec(text)) !== null && count < batchSize) {
                const shareCode = match[1];
                const fullMatch = match[0];


                if (processedLinks.has(fullMatch)) continue;
                processedLinks.add(fullMatch);


                const contextStart = Math.max(0, match.index - 60);
                const contextEnd = Math.min(text.length, match.index + fullMatch.length + 60);
                const context = text.substring(contextStart, contextEnd);

      
                const password = findPassword(context);

       
                setTimeout(() => {
                    createLinkDisplay(shareCode, password, textNode);
                }, 0);

                count++;
            }
        }

        isProcessing = false;

        if (count >= batchSize) {
            setTimeout(findShareLinks, 300);
        }
    }


    function findPassword(text) {
        const patterns = [
            /(?:提取码|密码|码|pwd)[:：]?\s*(\w{4})\b/i,
            /[^\w](\w{4})\s*(?:提取码|密码)/i,
            /[^\w](\w{4})\s*$/,
            /[^\w](\w{4})\b/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1];
        }
        return null;
    }


    function createLinkDisplay(shareCode, password, textNode) {
        if (!textNode.isConnected) return;

        const fullLink = `https://pan.baidu.com/s/${shareCode}${password ? `?pwd=${password}` : ''}`;

        const parent = textNode.parentNode;
        if (!parent || parent.querySelector(`[data-share="${shareCode}"]`)) return;


        const linkLine = document.createElement('div');
        linkLine.className = 'bdpan-link-line';
        linkLine.dataset.share = shareCode;

        const linkText = document.createElement('span');
        linkText.className = 'bdpan-link-text';
        linkText.textContent = fullLink;

        linkLine.appendChild(linkText);


        if (textNode.nextSibling) {
            parent.insertBefore(linkLine, textNode.nextSibling);
        } else {
            parent.appendChild(linkLine);
        }
    }


    function init() {
        setTimeout(findShareLinks, 1500);

        const observer = new MutationObserver(() => {
            setTimeout(findShareLinks, 500);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

