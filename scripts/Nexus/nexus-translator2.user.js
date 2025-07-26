// ==UserScript==
// @name         Nexus Mods 基础翻译（外部词库+日期增强版）
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      2.1.0
// @description  增强日期版：支持日期格式自动翻译，为Nexus Mods网站提供基础中文翻译解决方案
// @author       MaMihLaPiNaTaPaI0
// @license      MIT
// @homepage     https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-translator2.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-translator2.user.js
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

    function translateDate(englishDate) {
        const monthMap = {
            "January": "一月(Jan)", "Jan": "一月(Jan)",
            "February": "二月(Feb)", "Feb": "二月(Feb)",
            "March": "三月(Mar)", "Mar": "三月(Mar)",
            "April": "四月(Apr)", "Apr": "四月(Apr)",
            "May": "五月(May)",
            "June": "六月(Jun)", "Jun": "六月(Jun)",
            "July": "七月(Jul)", "Jul": "七月(Jul)",
            "August": "八月(Aug)", "Aug": "八月(Aug)",
            "September": "九月(Sep)", "Sep": "九月(Sep)",
            "October": "十月(Oct)", "Oct": "十月(Oct)",
            "November": "十一月(Nov)", "Nov": "十一月(Nov)",
            "December": "十二月(Dec)", "Dec": "十二月(Dec)"
        };

        const timeMap = {
            "AM": "上午", "PM": "下午",
            "am": "上午", "pm": "下午"
        };

        const dateRegex = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),\s*(\d{1,2}:\d{2})\s*([AP]M)/i;
        const match = englishDate.match(dateRegex);

        if (match) {
            const [, day, month, year, time, period] = match;
            const cnMonth = monthMap[month] || month;
            const cnPeriod = timeMap[period] || period;
            return `${day} ${cnMonth} ${year}, ${time}${cnPeriod}`;
        }
        return englishDate;
    }

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
        
        if (node.nodeType === Node.TEXT_NODE) {
            const original = node.textContent.trim();
            if (!original) return;
            
            const dateTranslated = translateDate(node.textContent);
            if (dateTranslated !== node.textContent) {
                node.textContent = dateTranslated;
                return;
            }
            
            if (dictionaries[original]) {
                node.textContent = dictionaries[original];
                return;
            }
            
            const lowerOriginal = original.toLowerCase();
            for (const [key, value] of Object.entries(dictionaries)) {
                if (key.toLowerCase() === lowerOriginal) {
                    node.textContent = value;
                    return;
                }
            }
        } 
        else if (node.nodeType === Node.ELEMENT_NODE) {
            ['placeholder', 'title', 'value', 'alt'].forEach(attr => {
                if (node.hasAttribute(attr)) {
                    const val = node.getAttribute(attr);
                    if (dictionaries[val]) {
                        node.setAttribute(attr, dictionaries[val]);
                    }
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
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                        translateText(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadDictionary);
    } else {
        loadDictionary();
    }
})();
