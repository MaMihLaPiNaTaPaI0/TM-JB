// ==UserScript==
// @name         Nexus Mods 中文翻译 (模块化版)
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  为Nexus Mods网站提供完整的中文翻译
// @author       YourName
// @match        https://www.nexusmods.com/*
// @icon         https://www.nexusmods.com/favicon.ico
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @license      MIT
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 词典加载状态
    let dictionaries = {};
    let isDictionaryLoaded = false;

    // 加载外部词典
    function loadDictionary() {
        // GitHub Raw 文件路径（替换为您的实际路径）
        const DICT_URL = 'https://raw.githubusercontent.com/yourname/yourrepo/main/dictionary.json';
        
        GM_xmlhttpRequest({
            method: "GET",
            url: DICT_URL,
            onload: function(response) {
                if (response.status === 200) {
                    dictionaries = JSON.parse(response.responseText);
                    isDictionaryLoaded = true;
                    console.log('词典加载成功');
                    translatePage();
                } else {
                    console.error('词典加载失败:', response.status);
                }
            },
            onerror: function(error) {
                console.error('词典请求失败:', error);
            }
        });
    }

    // 翻译函数
    function translateText(node) {
        if (!isDictionaryLoaded) return;
        
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
            const originalText = node.textContent.trim();
            
            // 精确匹配
            if (dictionaries[originalText]) {
                node.textContent = dictionaries[originalText];
                return;
            }
            
            // 大小写不敏感匹配
            const lowerText = originalText.toLowerCase();
            for (const [key, value] of Object.entries(dictionaries)) {
                if (key.toLowerCase() === lowerText) {
                    node.textContent = value;
                    return;
                }
            }
        } 
        else if (node.nodeType === Node.ELEMENT_NODE) {
            // 处理输入框属性
            ['placeholder', 'title', 'value'].forEach(attr => {
                if (node[attr] && dictionaries[node[attr]]) {
                    node[attr] = dictionaries[node[attr]];
                }
            });
            
            // 递归处理子节点
            node.childNodes.forEach(translateText);
        }
    }

    // 页面翻译
    function translatePage() {
        if (!isDictionaryLoaded) return;
        
        // 初始翻译
        translateText(document.body);
        
        // 监听DOM变化
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(translateText);
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 启动加载
    loadDictionary();
})();
