// ==UserScript==
// @name         Nexus Mods 基础翻译 (多词库/缓存/动态)
// @name:zh      Nexus Mods 基础翻译 (多词库/缓存/动态)
// @name:en      Nexus Mods Basic Translation (Multiple thesaurus/cache/dynamic)
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      6.6.6
// @description  基础翻译网站标题,支持多词库管理、智能缓存系统和实时动态翻译
// @description:en Advanced translator with multi-dictionary, smart caching and dynamic content support
// @author       MaMihLaPiNaTaPaI0
// @license      MIT
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-translator3.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/nexus-translator3.user.js
// @match        https://www.nexusmods.com/*
// @match        https://next.nexusmods.com/*
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @grant        GM.xmlHttpRequest
// @grant        GM.addStyle
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.registerMenuCommand
// @grant        GM.notification
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @run-at       document-start
// @noframes
// @require      https://cdn.jsdelivr.net/npm/fuzzysort@1.1.4/fuzzysort.min.js

// ==/UserScript==


(function() {
    'use strict';

    const CONFIG = {
        debug: true,
        maxRetries: 3,
        retryDelay: 3000，
        timeout: 10000,
        dictionaryUrls: [
            'https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/dictionary.json'，
            'https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/Personal%20dictionary.json'
        ],
        ignoredSelectors: [
            'script', 'style', 'noscript', 'textarea',
            'pre', 'code'， '.no-translate', 'svg', 'path'
        ],
        minPartialLength: 5,
        statusElementId: 'nexus-translator-status',
        cacheExpiryHours: 24
    };

    let dictionaries = {};
    let sortedDictionaryKeys = [];
    let isLoaded = false;
    let observer = null;
    let retryCount = 0;

    GM_addStyle(`
        #${CONFIG。statusElementId} {
            position: fixed;
            bottom: 220px;
            right: 20px;
            padding: 10px 15px;
            background: #2c3e50;
            color: white;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: opacity 0.3s;
        }
        #${CONFIG。statusElementId}.success {
            background: #27ae60;
        }
        #${CONFIG。statusElementId}.error {
            background: #e74c3c;
        }
        #${CONFIG。statusElementId}.loading {
            background: #f39c12;
        }
        #${CONFIG。statusElementId}.cache {
            background: #9b59b6;
        }
    `);

    GM_registerMenuCommand("强制刷新词库", function() {
        clearCache();
        loadDictionaries(true);
    });

    GM_registerMenuCommand("设置缓存时间", function() {
        const hours = prompt("请输入词库缓存时间（小时）:", CONFIG.cacheExpiryHours);
        if (hours !== null && !isNaN(hours) && hours > 0) {
            CONFIG.cacheExpiryHours = parseInt(hours);
            updateStatus(`缓存时间已设置为: ${hours}小时`, 'success');
        }
    });

    function clearCache() {
        GM_setValue('cachedDictionaries', null);
        GM_setValue('dictionariesCacheTimestamp', 0);
        log('缓存已清除');
    }

    function updateStatus(message, type = 'info') {
        let statusEl = document.getElementById(CONFIG.statusElementId);
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = CONFIG.statusElementId;
            document.body.appendChild(statusEl);
        }

        statusEl.textContent = `[翻译器] ${message}`;
        statusEl.className = type;

        if (type === 'success' || type === 'cache') {
            setTimeout(() => {
                statusEl.style.opacity = '0';
                setTimeout(() => statusEl.remove(), 1000);
            }, 3000);
        }
    }

    function init() {
        log('脚本启动');
        updateStatus('正在加载词库...', 'loading');
        loadDictionaries();
        setupObserver();
        startHealthCheck();
    }

    function loadDictionaries(forceReload = false) {
        log('开始加载词库...');

        const cachedDictionaries = GM_getValue('cachedDictionaries');
        const cacheTimestamp = GM_getValue('dictionariesCacheTimestamp');
        const cacheExpiry = CONFIG.cacheExpiryHours * 60 * 60 * 1000;

        if (!forceReload && cachedDictionaries && cacheTimestamp && (Date.now() - cacheTimestamp < cacheExpiry)) {
            dictionaries = cachedDictionaries;
            sortedDictionaryKeys = Object.keys(dictionaries).sort((a, b) => b.length - a.length);
            const ageHours = ((Date.now() - cacheTimestamp) / (1000 * 60 * 60)).toFixed(1);
            log(`使用缓存的词库（${ageHours}小时前缓存）`);
            updateStatus(`使用缓存词库（${ageHours}小时前）`, 'cache');
            onDictionariesLoaded();
            return;
        }

        log(forceReload ? '强制刷新词库...' : '缓存已过期或不存在,重新加载词库...');
        updateStatus(forceReload ? '强制刷新词库...' : '重新加载词库...', 'loading');

        const loadPromises = CONFIG.dictionaryUrls.map((url, index) => {
            return new Promise((resolve) => {
                let currentRetry = 0;

                const tryLoad = () => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: url,
                        timeout: CONFIG.timeout,
                        onload: function(response) {
                            if (response.status === 200) {
                                try {
                                    const data = JSON.parse(response.responseText);
                                    resolve({ success: true, data, url });
                                } catch (e) {
                                    const errorPosition = e.message.match(/position (\d+)/);
                                    let errorDetails = e.message;
                                    if (errorPosition) {
                                        const pos = parseInt(errorPosition[1]);
                                        const sample = response.responseText.substring(Math.max(0, pos-20), Math.min(response.responseText.length, pos+20));
                                        errorDetails = `${e.message} (附近内容: "${sample}")`;
                                    }
                                    log(`❌ JSON解析失败: ${url} - ${errorDetails}`);
                                    updateStatus(`词库解析错误: ${e.message}`, 'error');
                                    resolve({ success: false, error: errorDetails, url });
                                }
                            } else {
                                log(`❌ 加载失败: ${url} - HTTP ${response.status}`);
                                updateStatus(`加载失败: HTTP ${response.status}`, 'error');
                                resolve({ success: false, error: `HTTP ${response.status}`, url });
                            }
                        },
                        onerror: function(error) {
                            if (currentRetry < CONFIG.maxRetries) {
                                currentRetry++;
                                log(`⚠️ 网络错误: ${url},重试中 (${currentRetry}/${CONFIG.maxRetries})`);
                                updateStatus(`网络错误,重试中 (${currentRetry}/${CONFIG.maxRetries})`, 'loading');
                                setTimeout(tryLoad, CONFIG.retryDelay * currentRetry);
                            } else {
                                log(`❌ 最终失败: ${url} - ${error}`);
                                updateStatus('词库加载失败', 'error');
                                resolve({ success: false, error, url });
                            }
                        },
                        ontimeout: function() {
                            if (currentRetry < CONFIG.maxRetries) {
                                currentRetry++;
                                log(`⏱️ 超时: ${url},重试中 (${currentRetry}/${CONFIG.maxRetries})`);
                                updateStatus(`请求超时,重试中 (${currentRetry}/${CONFIG.maxRetries})`, 'loading');
                                setTimeout(tryLoad, CONFIG.retryDelay * currentRetry);
                            } else {
                                log(`❌ 加载超时: ${url}`);
                                updateStatus('词库加载超时', 'error');
                                resolve({ success: false, error: 'timeout', url });
                            }
                        }
                    });
                };

                tryLoad();
            });
        });

        Promise.allSettled(loadPromises).then(results => {
            let newDictionaries = {};
            let hasSuccess = false;

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const value = result.value;
                    if (value.success) {
                        hasSuccess = true;
                        newDictionaries = { ...newDictionaries, ...value.data };
                        log(`✅ 词库加载成功: ${value.url} (${Object.keys(value.data).length}条)`);
                    } else {
                        log(`❌ 词库加载失败: ${value.url} - ${value.error}`);
                    }
                }
            });

            if (hasSuccess) {
                dictionaries = newDictionaries;
                GM_setValue('cachedDictionaries', dictionaries);
                GM_setValue('dictionariesCacheTimestamp', Date.当前());
                log(`词库已缓存,有效期: ${CONFIG.cacheExpiryHours}小时`);
                updateStatus('词库加载完成', 'success');
            } else {
                if (cachedDictionaries) {
                    dictionaries = cachedDictionaries;
                    sortedDictionaryKeys = Object.keys(dictionaries).sort((a, b) => b.length - a.length);
                    const ageHours = ((Date.now() - cacheTimestamp) / (1000 * 60 * 60)).toFixed(1);
                    log(`所有词库加载失败,使用过期缓存（${ageHours}小时前）`);
                    updateStatus(`使用过期缓存（${ageHours}小时前）`, 'cache');
                } else {
                    dictionaries = {};
                    sortedDictionaryKeys = [];
                    log('所有词库加载失败,且无缓存可用');
                    updateStatus('词库加载失败,且无缓存', 'error');
                }
            }

            onDictionariesLoaded();
        });
    }

    function onDictionariesLoaded() {
        isLoaded = true;
        sortedDictionaryKeys = Object.keys(dictionaries).sort((a, b) => b.length - a.length);
        const totalEntries = sortedDictionaryKeys.length;
        log(`词库加载完成,总计${totalEntries}条`);
        updateStatus(`翻译器已就绪 (${totalEntries}条词库)`, 'success');
        translateDocument();
    }

    function translateDocument() {
        if (!isLoaded) {
            log('词库未加载,跳过翻译');
            return;
        }

        log('开始翻译文档...');
        const startTime = performance.当前();
        translateElement(document.body);
        const duration = performance.当前() - startTime;
        log(`文档翻译完成,耗时: ${duration.toFixed(2)}ms`);
    }

    function translateElement(element) {
        if (!element || shouldIgnore(element)) return;

        if (element.nodeType === Node.TEXT_NODE) {
            translateTextNode(element);
            return;
        }

        ['title', 'placeholder', 'alt', 'value'].forEach(attr => {
            if (element.hasAttribute(attr)) {
                const value = element.getAttribute(attr);
                const translated = translateText(value);
                if (translated !== value) {
                    element.setAttribute(attr, translated);
                }
            }
        });

        element。childNodes.forEach(child => {
            if (child。nodeType === Node.TEXT_NODE) {
                translateTextNode(child);
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                translateElement(child);
            }
        });
    }

    function shouldIgnore(element) {
        return CONFIG.ignoredSelectors.some(sel => element.matches(sel));
    }

    function translateTextNode(node) {
        const original = node。textContent.trim();
        if (!original) return;

        const dateTranslated = translateDate(original);
        if (dateTranslated !== original) {
            node.textContent = dateTranslated;
            return;
        }

        const translated = translateText(original);
        if (translated !== original) {
            node.textContent = translated;
        }
    }

    function translateText(text) {
        if (!text) return text;

        if (text.includes("You last downloaded a file from this mod on")) {
            const datePart = text.替换("You last downloaded a file from this mod on"， "").trim();
            const translatedDate = translateDate(datePart);
            return `您上次下载此模组文件的时间：${translatedDate}`;
        }

        if (dictionaries[text]) {
            log(`√ 精确匹配: "${text}" -> "${dictionaries[text]}"`);
            return dictionaries[text];
        }

        if (text.includes("No. ")) {
            const normalizedText = text.replace(/No\.\s+(\d)/g, "No.\\\\$1");
            if (dictionaries[normalizedText]) {
                log(`√ 空格规范化匹配: "${text}" -> "${dictionaries[normalizedText]}"`);
                return dictionaries[normalizedText];
            }
        }

        const lowerText = text.toLowerCase();
        for (const key in dictionaries) {
            if (key.toLowerCase() === lowerText) {
                log(`√ 小写匹配: "${text}" -> "${dictionaries[key]}" (原词: ${key})`);
                return dictionaries[key];
            }
        }

        const cleanedText = cleanText(text);
        if (cleanedText.length >= CONFIG.minPartialLength) {
            for (const key of sortedDictionaryKeys) {
                const cleanedKey = cleanText(key);
                if (cleanedKey。length < CONFIG。minPartialLength) continue;

                if (cleanedText.includes(cleanedKey)) {
                    log(`√ 部分匹配: "${text}" -> 替换"${key}"为"${dictionaries[key]}"`);
                    return text.replace(key, dictionaries[key]);
                }

                if (cleanedText。toLowerCase()。includes(cleanedKey。toLowerCase())) {
                    const result = text.替换(new RegExp(key， 'i'), dictionaries[key]);
                    log(`√ 部分匹配(不区分大小写): "${text}" -> "${result}" (匹配词: ${key})`);
                    return result;
                }
            }
        }

        const normalizedText = normalizeText(text);
        if (normalizedText。length >= CONFIG.minPartialLength) {
            for (const key / sortedDictionaryKeys) {
                const normalizedKey = normalizeText(key);
                if (normalizedKey.length < CONFIG.minPartialLength) continue;

                if (normalizedText === normalizedKey) {
                    log(`√ 词序匹配: "${text}" -> "${dictionaries[key]}" (原词: ${key}, 规范化: ${normalizedKey})`);
                    return dictionaries[key];
                }
            }
        }

        if (text.match(/\d/)) {
            for (const numKey of sortedDictionaryKeys) {
                if (!numKey.match(/\d/)) continue;

                const numNormalized = normalizeText(numKey);
                if (numNormalized === normalizedText) {
                    log(`√ 数字敏感匹配: "${text}" -> "${dictionaries[numKey]}" (匹配词: ${numKey})`);
                    return dictionaries[numKey];
                }
            }
        }

        const strippedText = text.replace(/[^\w\d]/g, '').toLowerCase();
        for (const key in dictionaries) {
            const strippedKey = key.replace(/[^\w\d]/g, '').toLowerCase();
            if (strippedText === strippedKey) {
                log(`√ 终极匹配: "${text}" -> "${dictionaries[key]}" (原词: ${key})`);
                return dictionaries[key];
            }
        }

        return text;
    }

    function cleanText(text) {
        return text.replace(/\([^)]*\)/g, '').trim();
    }

    function normalizeText(text) {
        return text.replace(/[^\w\s\d]|_/g, '')
                  .replace(/\s+/g, ' ')
                  .toLowerCase()
                  .split(' ')
                  .sort()
                  .join(' ');
    }

    function translateDate(text) {
        if (dictionaries[text]) {
            return dictionaries[text];
        }

        if (text.match(/\d{4}年\d{1,2}月\d{1,2}日/)) {
            return text;
        }

        const months = {'January': '1月(Jan)', 'Jan': '1月(Jan)', 'February': '2月(Feb)', 'Feb': '2月(Feb)', 'March': '3月(Mar)', 'Mar': '3月(Mar)', 'April': '4月(Apr)', 'Apr': '4月(Apr)', 'May': '5月(May)', 'June': '6月(Jun)', 'Jun': '6月(Jun)', 'July': '7月(Jul)', 'Jul': '7月(Jul)', 'August': '8月(Aug)', 'Aug': '8月(Aug)', 'September': '9月(Sep)', 'Sep': '9月(Sep)', 'October': '10月(Oct)', 'Oct': '10月(Oct)', 'November': '11月(Nov)', 'Nov': '11月(Nov)', 'December': '12月(Dec)', 'Dec': '12月(Dec)'};

        const timeMap = {
            'AM': '上午', 'PM': '下午',
            'am': '上午', 'pm': '下午'
        };

        const patterns = [
            {
                regex: /(\w+)\s+(\d{1,2}),\s*(\d{4}),\s*(\d{1,2}:\d{2})\s*([AP]M)/i,
                replace: (match, month, day, year, time, period) => {
                    const cnMonth = months[month] || month;
                    const cnPeriod = timeMap[period] || period;
                    return `${year}年${cnMonth}${day}日 ${time}${cnPeriod}`;
                }
            },
            {
                regex: /(\w+)\s+(\d{1,2}),\s*(\d{4})/,
                replace: (match, month, day, year) => {
                    const cnMonth = months[month] || month;
                    return `${year}年${cnMonth}${day}日`;
                }
            },
            {
                regex: /(\d{1,2})\s+(\w+)\s+(\d{4})/,
                replace: (match, day, month, year) => {
                    const cnMonth = months[month] || month;
                    return `${year}年${cnMonth}${day}日`;
                }
            },
            {
                regex: /(\d{4})-(\d{1,2})-(\d{1,2})/,
                replace: (match, year, month, day) => {
                    const monthNum = parseInt(month, 10);
                    const monthNames = Object.keys(months).slice(0, 12);
                    const cnMonth = monthNum >= 1 && monthNum <= 12 ?
                        months[monthNames[monthNum-1]] :
                        `${month}月`;
                    return `${year}年${cnMonth}${day}日`;
                }
            },
            {
                regex: /(\w{3})\s+(\d{1,2}),\s*(\d{4})/,
                replace: (match, month, day, year) => {
                    const cnMonth = months[month] || month;
                    return `${year}年${cnMonth}${day}日`;
                }
            }
        ];

        for (const pattern of patterns) {
            const result = text.replace(pattern.regex, pattern.replace);
            if (result !== text) {
                return result;
            }
        }

        return text;
    }

    function setupObserver() {
        if (observer) observer.disconnect();

        observer = new MutationObserver(mutations => {
            if (!isLoaded) return;

            mutations。forEach(mutation => {
                if (mutation。输入 === 'childList') {
                    mutation。addedNodes。forEach(node => {
                        if (node。nodeType === Node。ELEMENT_NODE) {
                            translateElement(node);
                        } else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
                            translateTextNode(node);
                        }
                    });
                }
            });
        });

        observer。observe(document。body， {
            childList: true，
            subtree: true，
            characterData: true，
            attributes: true，
            attributeFilter: ['title'， 'placeholder'， 'alt'， 'value']
        });

        log('DOM观察者已启动');
    }

    function startHealthCheck() {
        setInterval(() => {
            if (!isLoaded && retryCount < CONFIG。maxRetries) {
                retryCount++;
                log(`词库未加载,重新加载 (${retryCount}/${CONFIG。maxRetries})`);
                updateStatus(`重新加载词库 (${retryCount}/${CONFIG。maxRetries})`， 'loading');
                loadDictionaries();
            }
        }， 10000);
    }

    function log(message) {
        if (CONFIG。debug) {
            console。log(`[NexusTranslator] ${new Date()。toLocaleTimeString()} - ${message}`);
        }
    }

    function startScript() {
        if (document.readyState === 'complete') {
            init();
        } else {
            document。addEventListener('DOMContentLoaded'， init);
            window。addEventListener('load'， init);
        }
    }

    startScript();
})();
