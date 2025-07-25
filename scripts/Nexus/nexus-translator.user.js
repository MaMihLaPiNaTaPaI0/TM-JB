// ==UserScript==
// @name         Nexus Mods 基础翻译（外部词库版）
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      2.0.0
// @description  为Nexus Mods网站提供基础中文翻译解决方案
// @author       MaMihLaPiNaTaPaI0
// @license      MIT
// @homepage     https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-translator.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-translator.user.js
// @match        https://www.nexusmods.com/*
// @match        https://next.nexusmods.com/*
// @icon         https://www.nexusmods.com/favicon.ico
// @icon64       https://www.nexusmods.com/favicon.ico
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    let dictionaries = {};
    let isDictionaryLoaded = false;

    function loadDictionary() {
        const DICT_URL = 'https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/dictionary.json';
        
        GM_xmlhttpRequest({
            method: "GET",
            url: DICT_URL,
            onload: function(response) {
                if (response.status === 200) {
                    dictionaries = JSON.parse(response.responseText);
                    isDictionaryLoaded = true;
                    translatePage();
                }
            },
            onerror: function(error) {
                console.error('词典加载失败', error);
            }
        });
    }

    function translateText(node) {
        if (!isDictionaryLoaded) return;
        
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
            const originalText = node.textContent.trim();
            
            if (dictionaries[originalText]) {
                node.textContent = dictionaries[originalText];
                return;
            }
            
            const lowerText = originalText.toLowerCase();
            for (const [key, value] of Object.entries(dictionaries)) {
                if (key.toLowerCase() === lowerText) {
                    node.textContent = value;
                    return;
                }
            }
        } 
        else if (node.nodeType === Node.ELEMENT_NODE) {
            ['placeholder', 'title', 'value'].forEach(attr => {
                if (node[attr] && dictionaries[node[attr]]) {
                    node[attr] = dictionaries[node[attr]];
                }
            });
            
            node.childNodes.forEach(translateText);
        }
    }

    function translatePage() {
        if (!isDictionaryLoaded) return;
        
        translateText(document.body);
        
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

    loadDictionary();
})();
