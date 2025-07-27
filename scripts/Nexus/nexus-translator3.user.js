// ==UserScript==
// @name         Nexus Mods 基础翻译(多词库+智能+缓存设置)
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      3.0.0
// @description  支持多词库缓存、智能匹配和动态内容翻译
// @author       MaMihLaPiNaTaPaI0
// @license      MIT
// @homepage     https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @match        https://www.nexusmods.com/*
// @match        https://next.nexusmods.com/*
// @icon         https://www.nexusmods.com/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      raw.githubusercontent.com
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // 配置设置
    const CONFIG = {
        debug: true,
        maxRetries: 3,
        retryDelay: 3000,
        timeout: 10000,
        dictionaryUrls: [
            'https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/dictionary.json',
            'https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Nexus/Personal%20dictionary.json'
        ],
        ignoredSelectors: [
            'script', 'style', 'noscript', 'textarea',
            'pre', 'code', '.no-translate', 'svg', 'path'
        ],
        minPartialLength: 5,
        statusElementId: 'nexus-translator-status',
        cacheExpiryHours: 24 // 默认缓存24小时
    };

    // 词库存储
    let dictionaries = {};
    let sortedDictionaryKeys = [];
    let isLoaded = false;
    let observer = null;
    let retryCount = 0;

    // 添加状态指示器样式
    GM_addStyle(`
        #${CONFIG.statusElementId} {
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
        #${CONFIG.statusElementId}.success {
            background: #27ae60;
        }
        #${CONFIG.statusElementId}.error {
            background: #e74c3c;
        }
        #${CONFIG.statusElementId}.loading {
            background: #f39c12;
        }
        #${CONFIG.statusElementId}.cache {
            background: #9b59b6;
        }
    `);

    // 注册菜单命令
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

    // 清除缓存
    function clearCache() {
        GM_setValue('cachedDictionaries', null);
        GM_setValue('dictionariesCacheTimestamp', 0);
        log('词库缓存已清除');
    }

    // 更新状态显示
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

    // 主初始化函数
    function init() {
        log('脚本启动');
        updateStatus('正在加载词库...', 'loading');
        loadDictionaries();
        setupObserver();
        startHealthCheck();
    }

    // 加载词库（带缓存功能）
    function loadDictionaries(forceReload = false) {
        log('开始加载词库...');

        // 检查缓存
        const cachedDictionaries = GM_getValue('cachedDictionaries');
        const cacheTimestamp = GM_getValue('dictionariesCacheTimestamp');
        const cacheExpiry = CONFIG.cacheExpiryHours * 60 * 60 * 1000; // 转换为毫秒

        if (!forceReload && cachedDictionaries && cacheTimestamp && (Date.now() - cacheTimestamp < cacheExpiry)) {
            dictionaries = cachedDictionaries;
            sortedDictionaryKeys = Object.keys(dictionaries).sort((a, b) => b.length - a.length);
            const ageHours = ((Date.now() - cacheTimestamp) / (1000 * 60 * 60)).toFixed(1);
            log(`使用缓存的词库（${ageHours}小时前缓存）`);
            updateStatus(`使用缓存词库（${ageHours}小时前）`, 'cache');
            onDictionariesLoaded();
            return;
        }

        log(forceReload ? '强制刷新词库...' : '缓存已过期或不存在，重新加载词库...');
        updateStatus(forceReload ? '强制刷新词库...' : '重新加载词库...', 'loading');

        // 使用Promise.allSettled等待所有词库加载完成（无论成功或失败）
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
                                    // 增强错误信息
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
                                log(`⚠️ 网络错误: ${url}，重试中 (${currentRetry}/${CONFIG.maxRetries})`);
                                updateStatus(`网络错误，重试中 (${currentRetry}/${CONFIG.maxRetries})`, 'loading');
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
                                log(`⏱️ 超时: ${url}，重试中 (${currentRetry}/${CONFIG.maxRetries})`);
                                updateStatus(`请求超时，重试中 (${currentRetry}/${CONFIG.maxRetries})`, 'loading');
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
                        // 合并词库：后面的词库覆盖前面的
                        newDictionaries = { ...newDictionaries, ...value.data };
                        log(`✅ 词库加载成功: ${value.url} (${Object.keys(value.data).length}条)`);
                    } else {
                        log(`❌ 词库加载失败: ${value.url} - ${value.error}`);
                    }
                }
            });

            if (hasSuccess) {
                // 保存到缓存
                dictionaries = newDictionaries;
                GM_setValue('cachedDictionaries', dictionaries);
                GM_setValue('dictionariesCacheTimestamp', Date.now());
                log(`词库已缓存，有效期: ${CONFIG.cacheExpiryHours}小时`);
                updateStatus('词库加载完成', 'success');
            } else {
                // 所有词库都加载失败，尝试使用缓存（即使过期）
                if (cachedDictionaries) {
                    dictionaries = cachedDictionaries;
                    sortedDictionaryKeys = Object.keys(dictionaries).sort((a, b) => b.length - a.length);
                    const ageHours = ((Date.now() - cacheTimestamp) / (1000 * 60 * 60)).toFixed(1);
                    log(`所有词库加载失败，使用过期缓存（${ageHours}小时前）`);
                    updateStatus(`使用过期缓存（${ageHours}小时前）`, 'cache');
                } else {
                    // 没有缓存，设置空词库
                    dictionaries = {};
                    sortedDictionaryKeys = [];
                    log('所有词库加载失败，且无缓存可用');
                    updateStatus('词库加载失败，且无缓存', 'error');
                }
            }

            onDictionariesLoaded();
        });
    }

    // 词库加载完成处理
    function onDictionariesLoaded() {
        isLoaded = true;

        // 创建按长度排序的键数组（长词优先）
        sortedDictionaryKeys = Object.keys(dictionaries).sort((a, b) => b.length - a.length);

        const totalEntries = sortedDictionaryKeys.length;
        log(`词库加载完成，总计${totalEntries}条`);
        updateStatus(`翻译器已就绪 (${totalEntries}条词库)`, 'success');
        translateDocument();
    }

    // 初始翻译整个文档
    function translateDocument() {
        if (!isLoaded) {
            log('词库未加载，跳过翻译');
            return;
        }

        log('开始翻译文档...');
        const startTime = performance.now();

        // 翻译可见区域
        translateElement(document.body);

        const duration = performance.now() - startTime;
        log(`文档翻译完成，耗时: ${duration.toFixed(2)}ms`);
    }

    // 翻译单个元素
    function translateElement(element) {
        if (!element || shouldIgnore(element)) return;

        // 翻译文本节点
        if (element.nodeType === Node.TEXT_NODE) {
            translateTextNode(element);
            return;
        }

        // 翻译属性
        ['title', 'placeholder', 'alt', 'value'].forEach(attr => {
            if (element.hasAttribute(attr)) {
                const value = element.getAttribute(attr);
                const translated = translateText(value);
                if (translated !== value) {
                    element.setAttribute(attr, translated);
                }
            }
        });

        // 翻译子节点
        element.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                translateTextNode(child);
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                translateElement(child);
            }
        });
    }

    // 检查是否应忽略元素
    function shouldIgnore(element) {
        return CONFIG.ignoredSelectors.some(sel => element.matches(sel));
    }

    // 翻译文本节点
    function translateTextNode(node) {
        const original = node.textContent.trim();
        if (!original) return;

        // 日期翻译
        const dateTranslated = translateDate(original);
        if (dateTranslated !== original) {
            node.textContent = dateTranslated;
            return;
        }

        // 智能翻译
        const translated = translateText(original);
        if (translated !== original) {
            node.textContent = translated;
        }
    }

    // 智能翻译函数（精简日志版）
    function translateText(text) {
        if (!text) return text;

        // 新增：处理包含动态变量的句子
        if (text.includes("You last downloaded a file from this mod on")) {
            const datePart = text.replace("You last downloaded a file from this mod on", "").trim();
            const translatedDate = translateDate(datePart);
            return `您上次下载此模组文件的时间：${translatedDate}`;
        }

        // 1. 精确匹配
        if (dictionaries[text]) {
            log(`√ 精确匹配: "${text}" -> "${dictionaries[text]}"`);
            return dictionaries[text];
        }

        // 处理"No. 数字"的空格变体
        if (text.includes("No. ")) {
            const normalizedText = text.replace(/No\.\s+(\d)/g, "No.\\$1");
            if (dictionaries[normalizedText]) {
                log(`√ 空格规范化匹配: "${text}" -> "${dictionaries[normalizedText]}"`);
                return dictionaries[normalizedText];
            }
        }

        // 2. 小写不敏感匹配
        const lowerText = text.toLowerCase();
        for (const key in dictionaries) {
            if (key.toLowerCase() === lowerText) {
                log(`√ 小写匹配: "${text}" -> "${dictionaries[key]}" (原词: ${key})`);
                return dictionaries[key];
            }
        }

        // 3. 清理文本（只移除括号）
        const cleanedText = cleanText(text);
        if (cleanedText.length >= CONFIG.minPartialLength) {
            for (const key of sortedDictionaryKeys) {
                const cleanedKey = cleanText(key);
                if (cleanedKey.length < CONFIG.minPartialLength) continue;

                // 检查清理后的文本是否包含清理后的键
                if (cleanedText.includes(cleanedKey)) {
                    log(`√ 部分匹配: "${text}" -> 替换"${key}"为"${dictionaries[key]}"`);
                    return text.replace(key, dictionaries[key]);
                }

                // 不区分大小写的匹配
                if (cleanedText.toLowerCase().includes(cleanedKey.toLowerCase())) {
                    const result = text.replace(new RegExp(key, 'i'), dictionaries[key]);
                    log(`√ 部分匹配(不区分大小写): "${text}" -> "${result}" (匹配词: ${key})`);
                    return result;
                }
            }
        }

        // 4. 词序不敏感匹配（保留数字）
        const normalizedText = normalizeText(text);
        if (normalizedText.length >= CONFIG.minPartialLength) {
            for (const key of sortedDictionaryKeys) {
                const normalizedKey = normalizeText(key);
                if (normalizedKey.length < CONFIG.minPartialLength) continue;

                if (normalizedText === normalizedKey) {
                    log(`√ 词序匹配: "${text}" -> "${dictionaries[key]}" (原词: ${key}, 规范化: ${normalizedKey})`);
                    return dictionaries[key];
                }
            }
        }

        // 5. 数字敏感的词序匹配
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

        // 6. 终极匹配：移除所有非字母数字字符
        const strippedText = text.replace(/[^\w\d]/g, '').toLowerCase();
        for (const key in dictionaries) {
            const strippedKey = key.replace(/[^\w\d]/g, '').toLowerCase();
            if (strippedText === strippedKey) {
                log(`√ 终极匹配: "${text}" -> "${dictionaries[key]}" (原词: ${key})`);
                return dictionaries[key];
            }
        }

        return text; // 未匹配时无日志输出
    }

    // 清理文本函数（只移除括号）
    function cleanText(text) {
        return text.replace(/\([^)]*\)/g, '').trim();
    }

    // 规范化函数（用于词序不敏感匹配，保留数字）
    function normalizeText(text) {
        return text.replace(/[^\w\s\d]|_/g, '')
                  .replace(/\s+/g, ' ')
                  .toLowerCase()
                  .split(' ')
                  .sort()
                  .join(' ');
    }

    // 日期翻译函数（关键修改：优先使用词库翻译）
    function translateDate(text) {
        // 优先检查词库中的月份翻译
        if (dictionaries[text]) {
            return dictionaries[text]; // 返回个人词库的带缩写版本
        }

        // 如果已经是中文日期格式，直接返回
        if (text.match(/\d{4}年\d{1,2}月\d{1,2}日/)) {
            return text;
        }

        const months = {'January': '1月(Jan)', 'Jan': '1月(Jan)', 'February': '2月(Feb)', 'Feb': '2月(Feb)', 'March': '3月(Mar)', 'Mar': '3月(Mar)', 'April': '4月(Apr)', 'Apr': '4月(Apr)', 'May': '5月(May)', 'June': '6月(Jun)', 'Jun': '6月(Jun)', 'July': '7月(Jul)', 'Jul': '7月(Jul)', 'August': '8月(Aug)', 'Aug': '8月(Aug)', 'September': '9月(Sep)', 'Sep': '9月(Sep)', 'October': '10月(Oct)', 'Oct': '10月(Oct)', 'November': '11月(Nov)', 'Nov': '11月(Nov)', 'December': '12月(Dec)', 'Dec': '12月(Dec)'};
        //const months = {'January': '1月', 'Jan': '1月', 'February': '2月', 'Feb': '2月', 'March': '3月', 'Mar': '3月', 'April': '4月', 'Apr': '4月', 'May': '5月', 'June': '6月', 'Jun': '6月', 'July': '7月', 'Jul': '7月', 'August': '8月', 'Aug': '8月', 'September': '9月', 'Sep': '9月', 'October': '10月', 'Oct': '10月', 'November': '11月', 'Nov': '11月', 'December': '12月', 'Dec': '12月'};


        const timeMap = {
            'AM': '上午', 'PM': '下午',
            'am': '上午', 'pm': '下午'
        };

        // 支持多种日期格式
        const patterns = [
            // 格式: January 23, 2025, 10:30 AM
            {
                regex: /(\w+)\s+(\d{1,2}),\s*(\d{4}),\s*(\d{1,2}:\d{2})\s*([AP]M)/i,
                replace: (match, month, day, year, time, period) => {
                    const cnMonth = months[month] || month;
                    const cnPeriod = timeMap[period] || period;
                    return `${year}年${cnMonth}${day}日 ${time}${cnPeriod}`;
                }
            },
            // 格式: January 23, 2025
            {
                regex: /(\w+)\s+(\d{1,2}),\s*(\d{4})/,
                replace: (match, month, day, year) => {
                    const cnMonth = months[month] || month;
                    return `${year}年${cnMonth}${day}日`;
                }
            },
            // 格式: 23 January 2025
            {
                regex: /(\d{1,2})\s+(\w+)\s+(\d{4})/,
                replace: (match, day, month, year) => {
                    const cnMonth = months[month] || month;
                    return `${year}年${cnMonth}${day}日`;
                }
            },
            // 格式: 2025-01-23 (ISO)
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
            // 格式: Jan 23, 2025
            {
                regex: /(\w{3})\s+(\d{1,2}),\s*(\d{4})/,
                replace: (match, month, day, year) => {
                    const cnMonth = months[month] || month;
                    return `${year}年${cnMonth}${day}日`;
                }
            }
        ];

        // 尝试匹配所有模式
        for (const pattern of patterns) {
            const result = text.replace(pattern.regex, pattern.replace);
            if (result !== text) {
                return result;
            }
        }

        return text;
    }

    // 设置观察者监控DOM变化
    function setupObserver() {
        if (observer) observer.disconnect();

        observer = new MutationObserver(mutations => {
            if (!isLoaded) return;

            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            translateElement(node);
                        } else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
                            translateTextNode(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['title', 'placeholder', 'alt', 'value']
        });

        log('DOM观察者已启动');
    }

    // 健康检查
    function startHealthCheck() {
        setInterval(() => {
            if (!isLoaded && retryCount < CONFIG.maxRetries) {
                retryCount++;
                log(`词库未加载，重新加载 (${retryCount}/${CONFIG.maxRetries})`);
                updateStatus(`重新加载词库 (${retryCount}/${CONFIG.maxRetries})`, 'loading');
                loadDictionaries();
            }
        }, 10000);
    }

    // 日志函数
    function log(message) {
        if (CONFIG.debug) {
            console.log(`[NexusTranslator] ${new Date().toLocaleTimeString()} - ${message}`);
        }
    }

    // 增强启动机制
    function startScript() {
        if (document.readyState === 'complete') {
            init();
        } else {
            document.addEventListener('DOMContentLoaded', init);
            window.addEventListener('load', init);
        }
    }

    // 启动脚本
    startScript();
})();
