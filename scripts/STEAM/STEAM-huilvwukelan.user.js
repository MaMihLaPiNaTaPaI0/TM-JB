// ==UserScript==
// @name         STEAM汇率悬浮窗 CNY→UAH乌克兰
// @version      2.0
// @description  在Steam页面上显示CNY→UAH汇率悬浮窗

// @match        *://steamcommunity.com/market/*
// @match        *://store.steampowered.com/*
// @connect      api.augmentedsteam.com

// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM/STEAM-huilvwukelan.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM/STEAM-huilvwukelan.user.js

// @author       MaMihLaPiNaTaPaI0
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @license      MIT
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

class RateCaches {
    constructor() {
        this.caches = new Map();
    }
    getCache(from, to) {
        return this.caches.get(this.buildCacheKey(from, to));
    }
    setCache(cache) {
        this.caches.set(this.buildCacheKey(cache.from, cache.to), cache);
    }
    buildCacheKey(from, to) {
        return `${from}:${to}`;
    }
}

class AugmentedSteamRateApi {
    async getRate() {
        const url = 'https://api.augmentedsteam.com/rates/v1?to=CNY';
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: function(response) {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        const UAHToCny = data["UAH"]["CNY"];
                        resolve(1 / UAHToCny); // 获取CNY→UAH汇率
                    } else {
                        console.error(`请求失败，状态码: ${response.status}`);
                        reject('无法获取汇率');
                    }
                },
                onerror: function(error) {
                    console.error('请求错误:', error);
                    reject('请求错误');
                }
            });
        });
    }
}

class RateManager {
    constructor() {
        this.rateCaches = new RateCaches();
        this.api = new AugmentedSteamRateApi();
    }

    async getRate() {
        const now = Date.now();
        const cache = this.rateCaches.getCache('CNY', 'UAH');
        const expired = 1000 * 60 * 60; // 1小时缓存

        if (cache && now < cache.createdAt + expired) {
            return cache.rate;
        }

        const rate = await this.api.getRate();
        this.rateCaches.setCache({ from: 'CNY', to: 'UAH', rate, createdAt: now });
        return rate;
    }
}

(async () => {
    'use strict';

    const rateManager = new RateManager();
    let exchangeRate; // 现在代表 1 CNY = ? UAH
    let manualRateMode = GM_getValue("manualRateMode", false);
    let isLocked = GM_getValue("isLocked", false);

    // 获取汇率 (CNY→UAH)
    try {
        exchangeRate = await rateManager.getRate();
        console.log("CNY→UAH汇率:", exchangeRate);
    } catch (error) {
        exchangeRate = 0;
        console.error(error);
    }

    if (manualRateMode) {
        exchangeRate = GM_getValue("manualExchangeRate", exchangeRate);
    }

    // 创建汇率显示悬浮窗
    const rateDisplay = document.createElement('div');
    rateDisplay.id = 'steam-rate-display';
    Object.assign(rateDisplay.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: '10000',
        color: 'black',
        fontSize: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        boxShadow: '0 0 5px rgba(0, 0, 0, 0.3)',
        fontFamily: 'Arial, sans-serif',
        width: '140px'
    });

    // 添加汇率信息 (1 CNY = ? UAH)
    const rateInfo = document.createElement('div');
    rateInfo.textContent = manualRateMode ?
        `手动汇率: 1 CNY = ${exchangeRate.toFixed(2)} UAH` :
        `自动汇率: 1 CNY = ${exchangeRate.toFixed(2)} UAH`;
    rateDisplay.appendChild(rateInfo);

    // 创建手动输入汇率切换按钮
    const toggleButton = document.createElement('button');
    toggleButton.textContent = manualRateMode ? '切换自动汇率' : '手动输入汇率';
    toggleButton.style.marginTop = '5px';
    rateDisplay.appendChild(toggleButton);

    // 添加换算控件
    const conversionRow = document.createElement('div');
    conversionRow.style.display = 'flex';
    conversionRow.style.alignItems = 'center';
    conversionRow.style.marginTop = '8px';

    // 添加锁定位置按钮
    const lockButton = document.createElement('button');
    lockButton.textContent = isLocked ? '🔒' : '🔓';
    Object.assign(lockButton.style, {
        marginRight: '5px',
        fontSize: '20px',
        background: 'none',
        border: 'none',
        cursor: 'pointer'
    });
    conversionRow.appendChild(lockButton);

    const conversionLabel = document.createElement('span');
    conversionLabel.textContent = 'CNY→';
    conversionLabel.style.fontWeight = 'bold';
    conversionRow.appendChild(conversionLabel);

    // 添加人民币输入框
    const inputField = document.createElement('input');
    inputField.type = 'number';
    Object.assign(inputField.style, {
        width: '40px',
        marginLeft: '5px',
        padding: '4px',
        border: '1px solid #ddd'
    });
    inputField.placeholder = '输入CNY';
    conversionRow.appendChild(inputField);

    rateDisplay.appendChild(conversionRow);

    // 添加卢布结果显示
    const outputField = document.createElement('div');
    outputField.style.marginTop = '5px';
    outputField.style.fontWeight = 'bold';
    outputField.textContent = 'UAH: 0.00';
    rateDisplay.appendChild(outputField);

    document.body.appendChild(rateDisplay);

    // 输入框事件处理 (CNY→UAH换算)
    inputField.addEventListener('input', () => {
        const cnyAmount = parseFloat(inputField.value);
        if (!isNaN(cnyAmount)) {
            const UAHAmount = (cnyAmount * exchangeRate).toFixed(2);
            outputField.textContent = `UAH: ${UAHAmount}`;
        } else {
            outputField.textContent = 'UAH: 0.00';
        }
    });

    // 切换按钮事件 (CNY→UAH汇率设置)
    toggleButton.addEventListener('click', async () => {
        manualRateMode = !manualRateMode;
        GM_setValue("manualRateMode", manualRateMode);
        toggleButton.textContent = manualRateMode ? '切换自动汇率' : '手动输入汇率';

        if (manualRateMode) {
            const rateInput = prompt("请输入手动汇率（1 CNY = ? UAH）：", exchangeRate.toFixed(2));
            if (rateInput !== null) {
                exchangeRate = parseFloat(rateInput);
                if (!isNaN(exchangeRate) && exchangeRate > 0) {
                    GM_setValue("manualExchangeRate", exchangeRate);
                    updateRateInfo();
                } else {
                    manualRateMode = false;
                    GM_setValue("manualRateMode", false);
                    updateRateInfo();
                }
            } else {
                manualRateMode = false;
                GM_setValue("manualRateMode", false);
                updateRateInfo();
            }
        } else {
            try {
                exchangeRate = await rateManager.getRate();
                updateRateInfo();
            } catch (error) {
                alert("无法重新获取汇率，请检查网络连接。");
            }
        }
    });

    // 更新汇率显示 (CNY→UAH)
    function updateRateInfo() {
        rateInfo.textContent = manualRateMode ?
            `手动汇率: 1 CNY = ${exchangeRate.toFixed(2)} UAH` :
            `自动汇率: 1 CNY = ${exchangeRate.toFixed(2)} UAH`;
        // 触发输入框更新
        inputField.dispatchEvent(new Event('input'));
    }

    // 锁定按钮事件
    lockButton.addEventListener('click', () => {
        isLocked = !isLocked;
        GM_setValue("isLocked", isLocked);
        lockButton.textContent = isLocked ? '🔒' : '🔓';

        if (isLocked) {
            rateDisplay.style.cursor = 'default';
            rateDisplay.removeEventListener('mousedown', initDrag);
        } else {
            rateDisplay.style.cursor = 'move';
            rateDisplay.addEventListener('mousedown', initDrag);
        }
    });

    // 悬浮窗拖动功能
    function initDrag(e) {
        if (isLocked) return;
        let offsetX = e.clientX - rateDisplay.getBoundingClientRect().left;
        let offsetY = e.clientY - rateDisplay.getBoundingClientRect().top;

        function dragMove(e) {
            const x = Math.min(window.innerWidth - rateDisplay.offsetWidth, e.clientX - offsetX);
            const y = Math.min(window.innerHeight - rateDisplay.offsetHeight, e.clientY - offsetY);
            rateDisplay.style.left = `${x}px`;
            rateDisplay.style.top = `${y}px`;
        }

        function dragEnd() {
            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('mouseup', dragEnd);
        }

        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);
    }

    // 初始化拖动状态
    rateDisplay.style.cursor = isLocked ? 'default' : 'move';
    if (!isLocked) {
        rateDisplay.addEventListener('mousedown', initDrag);
    }
})();
