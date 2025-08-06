// ==UserScript==
// @name        STEAM多国汇率双向换算(STEAM-HUILV)
// @name:zh     STEAM多国汇率双向换算(STEAM-HUILV)
// @name:en     STEAM Multi-Currency Converter
// @namespace   https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      1.0.0
// @description  在Steam页面上显示多国汇率悬浮窗，支持双向换算
// @description:zh 在Steam页面上显示多国汇率悬浮窗，支持双向换算
// @description:en Display multi-currency floating window on Steam pages with bidirectional conversion
// @author       MaMihLaPiNaTaPaI0
// @license      MIT
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM-HUILV.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM-HUILV.user.js
// @match        *://store.steampowered.com/*
// @run-at       document-idle
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @noframes
// @antifeature  tracking
// ==/UserScript==


class RateCaches {
    constructor() {
        this.caches = new Map();
    }
    getCache(key) {
        return this.caches.get(key);
    }
    setCache(key, cache) {
        this.caches.set(key, cache);
    }
}

class AugmentedSteamRateApi {
    async getRates() {
        const url = 'https://api.augmentedsteam.com/rates/v1?to=CNY';
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: function(response) {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);


                        const rates = {
                            RUB: data["RUB"] ? 1 / data["RUB"]["CNY"] : 0, // 俄罗斯卢布
                            UAH: data["UAH"] ? 1 / data["UAH"]["CNY"] : 0, // 乌克兰格里夫纳
                            PKR: data["PKR"] ? 1 / data["PKR"]["CNY"] : 0, // 巴基斯坦卢比
                            KZT: data["KZT"] ? 1 / data["KZT"]["CNY"] : 0, // 哈萨克斯坦坚戈
                            INR: data["INR"] ? 1 / data["INR"]["CNY"] : 0  // 印度卢比
                        };

                        resolve(rates);
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

    async getRates() {
        const now = Date.now();
        const cacheKey = 'multiRates';
        const cache = this.rateCaches.getCache(cacheKey);
        const expired = 1000 * 60 * 60; // 1小时缓存

        if (cache && now < cache.createdAt + expired) {
            return cache.rates;
        }

        const rates = await this.api.getRates();
        this.rateCaches.setCache(cacheKey, { rates, createdAt: now });
        return rates;
    }
}

(async () => {
    'use strict';


    const currencies = [
        { code: "RUB", name: "俄罗斯卢布", symbol: "₽" },
        { code: "UAH", name: "乌克兰格里夫纳", symbol: "₴" },
        { code: "PKR", name: "巴基斯坦卢比", symbol: "₨" },
        { code: "KZT", name: "哈萨克斯坦坚戈", symbol: "₸" },
        { code: "INR", name: "印度卢比", symbol: "₹" }
    ];

    const rateManager = new RateManager();
    let rates = {};
    let manualRates = GM_getValue("manualRates", {}); // 手动设置的汇率
    let selectedCurrency = GM_getValue("selectedCurrency", currencies[0].code); // 当前选中的货币
    let isLocked = GM_getValue("isLocked", false);


    const getCurrencyInfo = () => currencies.find(c => c.code === selectedCurrency) || currencies[0];


    try {
        rates = await rateManager.getRates();
        console.log("获取的汇率数据:", rates);
    } catch (error) {
        rates = currencies.reduce((acc, curr) => {
            acc[curr.code] = 0;
            return acc;
        }, {});
        console.error(error);
    }


    for (const currency of currencies) {
        if (manualRates[currency.code]) {
            rates[currency.code] = manualRates[currency.code];
        }
    }


    const rateDisplay = document.createElement('div');
    rateDisplay.id = 'steam-rate-display';
    Object.assign(rateDisplay.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: '10000',
        color: 'black',
        fontSize: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '15px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 0 8px rgba(0, 0, 0, 0.3)',
        fontFamily: 'Arial, sans-serif',
        width: '220px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    });


    const title = document.createElement('div');
    title.textContent = '多国汇率换算器';
    title.style.fontWeight = 'bold';
    title.style.fontSize = '14px';
    title.style.textAlign = 'center';
    title.style.marginBottom = '5px';
    title.style.borderBottom = '1px solid #eee';
    title.style.paddingBottom = '8px';
    rateDisplay.appendChild(title);


    const currencySelector = document.createElement('select');
    currencySelector.style.width = '100%';
    currencySelector.style.padding = '5px';
    currencySelector.style.marginBottom = '5px';

    currencies.forEach(currency => {
        const option = document.createElement('option');
        option.value = currency.code;
        option.textContent = `${currency.name} (${currency.symbol})`;
        currencySelector.appendChild(option);
    });

    currencySelector.value = selectedCurrency;
    rateDisplay.appendChild(currencySelector);

    const currencyInfo = getCurrencyInfo();
    const rateInfo = document.createElement('div');
    rateInfo.textContent = `1 CNY = ${rates[selectedCurrency].toFixed(2)} ${currencyInfo.symbol}`;
    rateInfo.style.fontSize = '13px';
    rateInfo.style.textAlign = 'center';
    rateDisplay.appendChild(rateInfo);


    const manualButton = document.createElement('button');
    manualButton.textContent = '手动设置汇率';
    manualButton.style.padding = '6px 0';
    manualButton.style.marginTop = '5px';
    rateDisplay.appendChild(manualButton);


    const cnyConversion = document.createElement('div');
    cnyConversion.style.marginTop = '10px';

    const cnyLabel = document.createElement('div');
    cnyLabel.textContent = '人民币(CNY) → 外币';
    cnyLabel.style.fontSize = '11px';
    cnyLabel.style.marginBottom = '5px';
    cnyLabel.style.color = '#666';
    cnyConversion.appendChild(cnyLabel);

    const cnyInputRow = document.createElement('div');
    cnyInputRow.style.display = 'flex';
    cnyInputRow.style.alignItems = 'center';

    const cnyInputLabel = document.createElement('span');
    cnyInputLabel.textContent = 'CNY';
    cnyInputLabel.style.marginRight = '5px';
    cnyInputRow.appendChild(cnyInputLabel);

    const cnyInput = document.createElement('input');
    cnyInput.type = 'number';
    Object.assign(cnyInput.style, {
        flex: '1',
        padding: '5px',
        border: '1px solid #ddd'
    });
    cnyInput.placeholder = '输入金额';
    cnyInputRow.appendChild(cnyInput);

    cnyConversion.appendChild(cnyInputRow);

    const cnyResult = document.createElement('div');
    cnyResult.style.marginTop = '8px';
    cnyResult.textContent = `${currencyInfo.symbol}: 0.00`;
    cnyResult.style.fontWeight = 'bold';
    cnyConversion.appendChild(cnyResult);

    rateDisplay.appendChild(cnyConversion);


    const foreignConversion = document.createElement('div');

    const foreignLabel = document.createElement('div');
    foreignLabel.textContent = `${currencyInfo.symbol} → 人民币(CNY)`;
    foreignLabel.style.fontSize = '11px';
    foreignLabel.style.marginBottom = '5px';
    foreignLabel.style.color = '#666';
    foreignConversion.appendChild(foreignLabel);

    const foreignInputRow = document.createElement('div');
    foreignInputRow.style.display = 'flex';
    foreignInputRow.style.alignItems = 'center';

    const foreignInputLabel = document.createElement('span');
    foreignInputLabel.textContent = currencyInfo.symbol;
    foreignInputLabel.style.marginRight = '5px';
    foreignInputRow.appendChild(foreignInputLabel);

    const foreignInput = document.createElement('input');
    foreignInput.type = 'number';
    Object.assign(foreignInput.style, {
        flex: '1',
        padding: '5px',
        border: '1px solid #ddd'
    });
    foreignInput.placeholder = '输入金额';
    foreignInputRow.appendChild(foreignInput);

    foreignConversion.appendChild(foreignInputRow);

    const foreignResult = document.createElement('div');
    foreignResult.style.marginTop = '8px';
    foreignResult.textContent = 'CNY: 0.00';
    foreignResult.style.fontWeight = 'bold';
    foreignConversion.appendChild(foreignResult);

    rateDisplay.appendChild(foreignConversion);


    const lockButton = document.createElement('button');
    lockButton.textContent = isLocked ? '已锁定位置 🔒' : '未锁定位置 🔓';
    lockButton.style.marginTop = '15px';
    lockButton.style.padding = '5px 0';
    lockButton.style.backgroundColor = isLocked ? '#e0e0e0' : '#f0f0f0';
    lockButton.style.border = '1px solid #ddd';
    lockButton.style.borderRadius = '4px';
    rateDisplay.appendChild(lockButton);

    document.body.appendChild(rateDisplay);


    function updateAllDisplays() {
        const currencyInfo = getCurrencyInfo();


        currencySelector.value = selectedCurrency;


        rateInfo.textContent = `1 CNY = ${rates[selectedCurrency].toFixed(2)} ${currencyInfo.symbol}`;


        foreignLabel.textContent = `${currencyInfo.symbol} → 人民币(CNY)`;
        foreignInputLabel.textContent = currencyInfo.symbol;


        cnyInput.dispatchEvent(new Event('input'));
        foreignInput.dispatchEvent(new Event('input'));
    }


    cnyInput.addEventListener('input', () => {
        const cnyAmount = parseFloat(cnyInput.value);
        if (!isNaN(cnyAmount)) {
            const foreignAmount = (cnyAmount * rates[selectedCurrency]).toFixed(2);
            const currencyInfo = getCurrencyInfo();
            cnyResult.textContent = `${currencyInfo.symbol}: ${foreignAmount}`;
        } else {
            cnyResult.textContent = `${getCurrencyInfo().symbol}: 0.00`;
        }
    });

    foreignInput.addEventListener('input', () => {
        const foreignAmount = parseFloat(foreignInput.value);
        if (!isNaN(foreignAmount)) {
            const cnyAmount = (foreignAmount / rates[selectedCurrency]).toFixed(2);
            foreignResult.textContent = `CNY: ${cnyAmount}`;
        } else {
            foreignResult.textContent = 'CNY: 0.00';
        }
    });


    currencySelector.addEventListener('change', () => {
        selectedCurrency = currencySelector.value;
        GM_setValue("selectedCurrency", selectedCurrency);
        updateAllDisplays();
    });


    manualButton.addEventListener('click', async () => {
        const currencyInfo = getCurrencyInfo();
        const currentRate = rates[selectedCurrency];

        const rateInput = prompt(
            `请输入手动汇率（1 CNY = ? ${currencyInfo.symbol}）:`,
            currentRate.toFixed(2)
        );

        if (rateInput !== null) {
            const newRate = parseFloat(rateInput);
            if (!isNaN(newRate) && newRate > 0) {

                manualRates[selectedCurrency] = newRate;
                GM_setValue("manualRates", manualRates);


                rates[selectedCurrency] = newRate;

                updateAllDisplays();
            } else {
                alert("请输入有效的汇率数值");
            }
        }
    });


    lockButton.addEventListener('click', () => {
        isLocked = !isLocked;
        GM_setValue("isLocked", isLocked);

        lockButton.textContent = isLocked ? '已锁定位置 🔒' : '未锁定位置 🔓';
        lockButton.style.backgroundColor = isLocked ? '#e0e0e0' : '#f0f0f0';

        if (isLocked) {
            rateDisplay.style.cursor = 'default';
            rateDisplay.removeEventListener('mousedown', initDrag);
        } else {
            rateDisplay.style.cursor = 'move';
            rateDisplay.addEventListener('mousedown', initDrag);
        }
    });


    function initDrag(e) {
        if (isLocked) return;
        let offsetX = e.clientX - rateDisplay.getBoundingClientRect().left;
        let offsetY = e.clientY - rateDisplay.getBoundingClientRect().top;

        function dragMove(e) {
            const x = Math.max(0, Math.min(window.innerWidth - rateDisplay.offsetWidth, e.clientX - offsetX));
            const y = Math.max(0, Math.min(window.innerHeight - rateDisplay.offsetHeight, e.clientY - offsetY));
            rateDisplay.style.left = `${x}px`;
            rateDisplay.style.right = 'auto';
            rateDisplay.style.top = `${y}px`;
        }

        function dragEnd() {
            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('mouseup', dragEnd);
        }

        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);
    }


    if (!isLocked) {
        rateDisplay.style.cursor = 'move';
        rateDisplay.addEventListener('mousedown', initDrag);
    }


    updateAllDisplays();
})();


