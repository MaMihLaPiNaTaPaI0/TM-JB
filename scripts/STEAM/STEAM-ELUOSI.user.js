// ==UserScript==
// @name         STEAM价格转换周洋自用（购物车客服市场页面升级版）
// @name:zh      STEAM价格转换（购物车/客服/市场增强版）
// @name:en      Steam Price Converter - Enhanced (Cart/Support/Market)
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      6.6.6
// @description  将 Steam 卢布价格实时转换为人民币，支持购物车/客服/市场页面 | Convert RUB to CNY on Steam cart/support/market pages
// @description:zh 在 Steam 购物车、客服和市场页面实时显示人民币价格
// @description:en Real-time RUB to CNY conversion for Steam cart, support and market pages
// @author       MaMihLaPiNaTaPaI0
// @license      MIT
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM/STEAM-ELUOSI.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM/STEAM-ELUOSI.user.js
// @match        *://store.steampowered.com/*
// @match        *://help.steampowered.com/*
// @match        *://checkout.steampowered.com/checkout/*
// @match        *://steamcommunity.com/market/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      open.er-api.com
// @run-at       document-idle
// @icon         https://store.akamai.steamstatic.com/public/shared/images/header/logo_steam.svg
// @icon64       https://store.akamai.steamstatic.com/public/shared/images/header/logo_steam.svg
// @noframes
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
                        const rubToCny = data["RUB"]["CNY"];
                        resolve(rubToCny);
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

    async getRate(from, to) {
        const now = Date.now();
        const cache = this.rateCaches.getCache(from， 到);
        const expired = 1000 * 60 * 60; // 1小时缓存

        if (cache && now < cache.createdAt + expired) {
            return cache.rate;
        }

        const rate = await this.api.getRate();
        this.rateCaches.setCache({ from, to, rate, createdAt: now });
        return rate;
    }
}

(async () => {
    'use strict';

    const rateManager = new RateManager();
    let exchangeRate;
    let manualRateMode = GM_getValue("manualRateMode", false); // 从存储中获取手动汇率模式状态
    let isLocked = GM_getValue("isLocked", false); // 从存储中获取锁定状态

    // 获取汇率
    try {
        exchangeRate = await rateManager.getRate('RUB', 'CNY');
        console.log("周洋价格脚本获取的汇率:", exchangeRate);
    } catch (error) {
        exchangeRate = 0; // 设置默认值
        console.error(error);
    }

    if (manualRateMode) {
        exchangeRate = GM_getValue("manualExchangeRate", exchangeRate); // 从存储中获取手动汇率值
    }

    // 创建汇率显示悬浮窗
    const rateDisplay = document.createElement('div');
    rateDisplay.style.position = 'fixed';
    rateDisplay.style.top = '10px';
    rateDisplay.style.right = '10px';
    rateDisplay.style.zIndex = '1000';
    rateDisplay.style.color = 'black';
    rateDisplay.style.fontSize = '12px';
    rateDisplay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    rateDisplay.style.padding = '10px';
    rateDisplay.style.border = '1px solid #ccc';
    rateDisplay.style.borderRadius = '5px';
    rateDisplay.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.3)';
    rateDisplay.style.fontFamily = 'Arial, sans-serif';
    rateDisplay.style.width = '110px';

    // 添加汇率信息
    //const rateInfo = document.createElement('div');
    //rateInfo.textContent = manualRateMode ? `手动汇率: ${exchangeRate}` : `自动汇率: ${exchangeRate}`;
    //rateDisplay.appendChild(rateInfo);

    // 添加汇率信息
    const rateInfo = document.createElement('div');
    const rubToCnyRate = (1 / exchangeRate).toFixed(6); // 计算 1 RUB = ? CNY
    rateInfo.textContent = manualRateMode ? `手动汇率:${rubToCnyRate}` : `自动汇率:${rubToCnyRate}`;
    rateDisplay.appendChild(rateInfo);



    // 创建手动输入汇率切换按钮
    const toggleButton = document.createElement('button');
    toggleButton.textContent = manualRateMode ? '切换自动汇率' : '手动输入汇率';
    toggleButton.style.marginTop = '5px';
    rateDisplay.appendChild(toggleButton);

    // 添加换算提示和输入框
    const conversionRow = document.createElement('div');
    conversionRow.style.display = 'flex';
    conversionRow.style.alignItems = 'center';

    // 添加锁定位置按钮
    const lockButton = document.createElement('button');
    lockButton.textContent = isLocked ? '🔒︎' : '🔓︎';
    lockButton.style.marginRight = '5px';
    lockButton.style.fontSize = '20px';
    lockButton.style.background = 'none';
    lockButton.style.border = 'none';
    lockButton.style.cursor = 'pointer';
    conversionRow.appendChild(lockButton);

    const conversionLabel = document.createElement('span');
    conversionLabel.textContent = 'X';
    conversionRow.appendChild(conversionLabel);

    // 添加输入框
    const inputField = document.createElement('input');
    inputField.type = 'number';
    inputField.style.width = '40px';
    inputField.style.marginLeft = '5px';
    inputField.placeholder = '0';
    conversionRow.appendChild(inputField);

    rateDisplay.appendChild(conversionRow);

    // 添加换算后的金额显示
    const outputField = document.createElement('div');
    outputField.textContent = '换算后: 0 RMB'; // 修改为 RMB
    rateDisplay.appendChild(outputField);

    document.body.appendChild(rateDisplay);

    // 事件监听输入框变化
    inputField.addEventListener('input', () => {
        const rubAmount = parseFloat(inputField.value);
        if (!isNaN(rubAmount)) {
            const cnyAmount = (rubAmount * exchangeRate).toFixed(2); // 用汇率计算人民币金额
            outputField.textContent = `换算后: ￥${cnyAmount}`; // 修改为 RMB
        } else {
            outputField.textContent = '换算后: 0 RMB'; // 修改为 RMB
        }
    });

    // 手动输入汇率
    toggleButton.addEventListener('click', async () => {
        manualRateMode = !manualRateMode;
        GM_setValue("manualRateMode", manualRateMode); // 保存手动汇率模式状态
        toggleButton.textContent = manualRateMode ? '切换自动汇率' : '手动输入汇率';

        if (manualRateMode) {
            const rateInput = prompt("请输入手动汇率（1 RUB = ? CNY）：", exchangeRate);
            if (rateInput !== null) {
                exchangeRate = parseFloat(rateInput); // 使用用户输入的汇率
                if (!isNaN(exchangeRate) && exchangeRate > 0) {
                    GM_setValue("manualExchangeRate", exchangeRate); // 保存手动汇率值
                    rateInfo.textContent = `手动汇率: ${exchangeRate}`; // 更新汇率信息
                } else {
                    alert("请输入有效的汇率值。");
                    manualRateMode = false; // 取消手动模式
                    GM_setValue("manualRateMode", false); // 更新存储
                    rateInfo.textContent = `自动汇率: ${exchangeRate}`; // 恢复汇率信息
                }
            } else {
                manualRateMode = false; // 用户取消输入，恢复自动模式
                GM_setValue("manualRateMode", false); // 更新存储
                rateInfo.textContent = `自动汇率: ${exchangeRate}`; // 恢复汇率信息
            }
        } else {
            // 退出手动模式时，重新获取汇率
            try {
                exchangeRate = await rateManager.getRate('RUB', 'CNY');
                rateInfo.textContent = `自动汇率: ${exchangeRate}`; // 更新汇率信息
            } catch (error) {
                alert("无法重新获取汇率，请检查网络连接。");
            }
        }
    });

    // 锁定位置按钮事件
    lockButton.addEventListener('click', () => {
        isLocked = !isLocked;
        GM_setValue("isLocked", isLocked); // 保存锁定状态
        lockButton.textContent = isLocked ? '🔒︎' : '🔓︎'; // 更新按钮图标

        if (isLocked) {
            rateDisplay.style.cursor = 'default'; // 改变鼠标样式
            rateDisplay.removeEventListener('mousedown', initDrag); // 移除拖动事件
        } else {
            rateDisplay.style.cursor = 'move'; // 改变鼠标样式
            rateDisplay.addEventListener('mousedown', initDrag); // 添加拖动事件
        }
    });

    // 添加拖动功能
    function initDrag(e) {
        if (isLocked) return; // 如果锁定则不允许拖动
        let offsetX = e.clientX - rateDisplay.getBoundingClientRect().left;
        let offsetY = e.clientY - rateDisplay.getBoundingClientRect().top;

        function dragMove(e) {
            rateDisplay.style.left = `${Math.min(window.innerWidth - rateDisplay.offsetWidth, e.clientX - offsetX)}px`;
            rateDisplay.style.top = `${Math.min(window.innerHeight - rateDisplay.offsetHeight, e.clientY - offsetY)}px`;
        }

        function dragEnd() {
            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('mouseup', dragEnd);
        }

        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);
    }

    rateDisplay.style.cursor = isLocked ? 'default' : 'move'; // 初始化鼠标样式
    if (!isLocked) {
        rateDisplay.addEventListener('mousedown', initDrag); // 添加拖动事件
    }

    function convertPrices() {
        console.log("开始转换价格");
        const priceElements = document.querySelectorAll('*:not(script):not(style)');
        priceElements.forEach(element => {
            element.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && /руб/.test(node.nodeValue)) {
                    const rubPriceMatch = node.nodeValue.match(/(\d+([.,]\d+)?)\s*руб/);
                    if (rubPriceMatch) {
                        const rubPrice = parseFloat(rubPriceMatch[1].replace(',', '.'));
                        const cnyPrice = (rubPrice * exchangeRate).toFixed(2); // 使用正确的计算公式
                        //console.log(`处理价格: ${rubPrice} RUB, 转换后: ￥${cnyPrice}`);
                        appendConvertedPrice(element, cnyPrice);
                    }
                } else if (node.nodeType === Node.TEXT_NODE && /₽/.test(node.nodeValue)) {
                    const rubPriceMatch = node.nodeValue.match(/([\d.,]+)\s*(₽)/);
                    if (rubPriceMatch) {
                        const rubPrice = parseFloat(rubPriceMatch[1].replace(',', '.'));
                        const cnyPrice = (rubPrice * exchangeRate).toFixed(2); // 使用正确的计算公式
                        //console.log(`处理价格: ${rubPrice} ₽, 转换后: ￥${cnyPrice}`);
                        appendConvertedPrice(element, cnyPrice);
                    }
                }
            });
        });
    }

    function appendConvertedPrice(element, cnyPrice) {
        const existingCnyElement = element.querySelector('.converted-price');
        if (!existingCnyElement) {
            const span = document.createElement('span');
            span.className = 'converted-price';
            span.style.marginLeft = '5px';
            span.style.fontSize = '12px';
            span.style.color = 'red';
            span.textContent = ` (￥${cnyPrice})`;
            element.appendChild(span);
        }
    }

    const observer = new MutationObserver(() => {
        convertPrices();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    window.addEventListener('load', () => {
        convertPrices();
    });
})();
