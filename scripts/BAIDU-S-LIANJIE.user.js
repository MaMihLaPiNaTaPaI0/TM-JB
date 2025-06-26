// ==UserScript==
// @name         百度S链接(BAIDU-S-LIANJIE)
// @namespace   https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      1.0.0
// @description  在百度网盘链接下方另起一行显示完整URL
// @author       zhouyang
// @match        *://*/*
// @run-at       document-idle
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/BAIDU-S-LIANJIE.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/BAIDU-S-LIANJIE.user.js
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// ==/UserScript==



(function() {
    'use strict';

    // 性能优化标志
    let isProcessing = false;
    let processedLinks = new Set();

    // 简约文本样式
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

    // 文本扫描器
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

                // 跳过已处理的链接
                if (processedLinks.has(fullMatch)) continue;
                processedLinks.add(fullMatch);

                // 获取上下文文本
                const contextStart = Math.max(0, match.index - 60);
                const contextEnd = Math.min(text.length, match.index + fullMatch.length + 60);
                const context = text.substring(contextStart, contextEnd);

                // 查找密码
                const password = findPassword(context);

                // 创建链接显示
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

    // 密码查找函数
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

    // 创建纯文本显示
    function createLinkDisplay(shareCode, password, textNode) {
        if (!textNode.isConnected) return;

        const fullLink = `https://pan.baidu.com/s/${shareCode}${password ? `?pwd=${password}` : ''}`;

        const parent = textNode.parentNode;
        if (!parent || parent.querySelector(`[data-share="${shareCode}"]`)) return;

        // 创建单独的行显示完整链接
        const linkLine = document.createElement('div');
        linkLine.className = 'bdpan-link-line';
        linkLine.dataset.share = shareCode;

        const linkText = document.createElement('span');
        linkText.className = 'bdpan-link-text';
        linkText.textContent = fullLink;

        linkLine.appendChild(linkText);

        // 在原始文本后插入新行
        if (textNode.nextSibling) {
            parent.insertBefore(linkLine, textNode.nextSibling);
        } else {
            parent.appendChild(linkLine);
        }
    }

    // 初始化
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

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
