// ==UserScript==
// @name         STEAM市场汇率转换+汇率悬浮窗CNY↔RUB 带开关可折叠20260606版
// @version      6.6.6
// @description  转换Steam市场表格价格，解决闪动和收入负值问题

// @match        *://steamcommunity.com/market/*
// @connect      api.augmentedsteam.com

// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM/STEAM-huilvjiaqing.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM/STEAM-huilvjiaqing.user.js

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

(function() {
    'use strict';

    // 全局变量
    let currentExchangeRate = 0.08;
    let isProcessing = false;
    let lastProcessTime = 0;
    let processedCells = new Set(); // 记录已处理的单元格
    let mutationObserver = null;
    let lastTableCheck = 0;
    let conversionEnabled = GM_getValue("conversionEnabled", true); // 新增：是否启用价格转换

    // 等待页面完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 1000);
    }

    async function init() {
        console.log('[汇率转换] 脚本已启动（稳定修复版）');

        // 获取汇率
        currentExchangeRate = await getExchangeRate();

        // 添加CSS样式（一次性）
        addConversionStyles();

        // 开始转换市场表格（如果启用）
        if (conversionEnabled) {
            convertAllMarketPrices();
        }

        // 定期检查新表格（延长间隔，减少闪动）
        setInterval(() => {
            const now = Date.now();
            if (conversionEnabled && now - lastTableCheck > 3000) { // 5秒检查一次
                lastTableCheck = now;
                convertAllMarketPrices();
            }
        }, 3000);

        // 监听DOM变化（优化版本）
        startOptimizedMutationObserver();

        // 添加悬浮窗
        setTimeout(() => {
            createEnhancedRateFloatingWindow(currentExchangeRate);
        }, 2000);
    }

    // ==================== 表格转换部分（修复闪动问题） ====================

    // 获取汇率
    async function getExchangeRate() {
        const cachedRate = GM_getValue('market_exchange_rate');
        const cacheTime = GM_getValue('market_exchange_rate_time');

        if (cachedRate && cacheTime && (Date.now() - cacheTime) < 3600000) {
            return cachedRate;
        }

        try {
            const rate = await fetchExchangeRate();
            GM_setValue('market_exchange_rate', rate);
            GM_setValue('market_exchange_rate_time', Date.now());
            return rate;
        } catch (error) {
            return 0.08;
        }
    }

    function fetchExchangeRate() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://api.augmentedsteam.com/rates/v1?to=CNY",
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            const rubToCny = data["RUB"]["CNY"];
                            resolve(rubToCny);
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(new Error(`请求失败: ${response.status}`));
                    }
                },
                onerror: function(error) {
                    reject(error);
                }
            });
        });
    }

    // 转换所有市场表格价格（优化防闪动）
    function convertAllMarketPrices() {
        // 如果转换被禁用，清理所有转换元素
        if (!conversionEnabled) {
            document.querySelectorAll('.cny-price-converted, .cny-income-converted').forEach(el => el.remove());
            processedCells.clear();
            return;
        }

        // 防止重复处理
        const now = Date.now();
        if (isProcessing || (now - lastProcessTime < 1000)) {
            return;
        }

        isProcessing = true;
        lastProcessTime = now;

        try {
            // 1. 处理普通出售表格
            convertSellTables();

            // 2. 处理购买请求表格
            convertBuyRequestTables();

            // 3. 清理已删除的单元格记录
            cleanupProcessedCells();
        } catch (error) {
            console.error('[汇率转换] 转换错误:', error);
        } finally {
            isProcessing = false;
        }
    }

    // 处理出售表格（普通表格）
    function convertSellTables() {
        const marketTables = document.querySelectorAll('.market_commodity_orders_table');

        marketTables.forEach(table => {
            // 跳过购买请求表格
            if (table.closest('#market_commodity_buyreqeusts_table')) return;

            const rows = table.querySelectorAll('tr');

            rows.forEach((row, rowIndex) => {
                // 跳过表头
                if (row.querySelector('th')) return;

                const cells = row.querySelectorAll('td');
                if (cells.length < 2) return;

                // 处理价格列
                if (cells[0]) {
                    processPriceCell(cells[0], 'first', rowIndex, 0);
                }

                // 处理不含手续费列
                if (cells[1]) {
                    processPriceCell(cells[1], 'second', rowIndex, 1);
                }
            });
        });
    }

    // 处理购买请求表格（特殊处理）
    function convertBuyRequestTables() {
        const buyRequestTable = document.querySelector('#market_commodity_buyreqeusts_table');
        if (!buyRequestTable) return;

        const table = buyRequestTable.querySelector('.market_commodity_orders_table');
        if (!table) return;

        const rows = table.querySelectorAll('tr');

        rows.forEach((row, rowIndex) => {
            // 跳过表头
            if (row.querySelector('th')) return;

            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return;

            // 第一列：价格
            if (cells[0]) {
                processBuyRequestPriceCell(cells[0], rowIndex, 0);
            }

            // 第二列：收入（需要特殊处理）
            if (cells[1]) {
                processBuyRequestMarginCell(cells[0], cells[1], rowIndex, 1);
            }
        });
    }

    // 处理普通价格单元格（防止重复处理） - 修改为不换行显示
    function processPriceCell(cell, columnType, rowIndex, cellIndex) {
        const cellId = `price_${rowIndex}_${cellIndex}_${columnType}`;

        // 如果已经处理过，只更新文本
        const existingConversion = cell.querySelector('.cny-price-converted');
        if (existingConversion) {
            updatePriceCellText(cell, existingConversion, columnType);
            processedCells.add(cellId);
            return;
        }

        // 检查是否需要处理
        const text = cell.textContent.trim();
        if (!text.includes('₽') || text.includes('或更高') || text === '₽') {
            processedCells.delete(cellId);
            return;
        }

        // 处理新单元格
        const priceMatch = text.match(/[\d.,]+/);
        if (!priceMatch) return;

        const rubPrice = parseFloat(priceMatch[0].replace(',', '.'));
        const cnyPrice = (rubPrice * currentExchangeRate).toFixed(2);

        // 创建人民币价格显示（修改：不换行）
        const cnySpan = document.createElement('span');
        cnySpan.className = `cny-price-converted ${columnType}-column`;
        cnySpan.textContent = ` (¥${cnyPrice})`;

        // 添加到价格单元格（插入到卢布价格后面）
        const rubSpan = cell.querySelector('.market_listing_price');
        if (rubSpan) {
            rubSpan.appendChild(cnySpan);
        } else {
            // 如果没有找到特定的价格元素，直接添加到单元格
            cell.appendChild(cnySpan);
        }
        processedCells.add(cellId);
    }

    // 处理购买请求价格单元格 - 修改为不换行显示
    function processBuyRequestPriceCell(cell, rowIndex, cellIndex) {
        const cellId = `buy_price_${rowIndex}_${cellIndex}`;

        // 如果已经处理过，只更新文本
        const existingConversion = cell.querySelector('.cny-price-converted');
        if (existingConversion) {
            updateBuyRequestPriceCellText(cell, existingConversion);
            processedCells.add(cellId);
            return;
        }

        // 检查是否需要处理
        const text = cell.textContent.trim();
        if (!text.includes('₽') || text === '₽') {
            processedCells.delete(cellId);
            return;
        }

        // 提取价格数字（去掉"或更低"等文字）
        let priceText = text;
        if (priceText.includes('或更低')) {
            priceText = priceText.replace('或更低', '').trim();
        }

        const priceMatch = priceText.match(/[\d.,]+/);
        if (!priceMatch) return;

        const rubPrice = parseFloat(priceMatch[0].replace(',', '.'));
        const cnyPrice = (rubPrice * currentExchangeRate).toFixed(2);

        // 创建人民币价格显示（修改：不换行）
        const cnySpan = document.createElement('span');
        cnySpan.className = 'cny-price-converted buy-request-price';
        cnySpan.textContent = ` (¥${cnyPrice})`;

        // 添加到价格单元格
        cell.appendChild(cnySpan);
        processedCells.add(cellId);
    }

    // 处理购买请求收入单元格（修复负值问题）- 修改为不换行显示
    function processBuyRequestMarginCell(priceCell, marginCell, rowIndex, cellIndex) {
        const cellId = `buy_margin_${rowIndex}_${cellIndex}`;

        // 如果已经处理过，只更新文本
        const existingConversion = marginCell.querySelector('.cny-income-converted');
        if (existingConversion) {
            updateBuyRequestMarginCellText(priceCell, marginCell, existingConversion);
            processedCells.add(cellId);
            return;
        }

        // 获取价格列的价格
        const priceText = priceCell.textContent.trim();
        let priceMatchText = priceText;
        if (priceMatchText.includes('或更低')) {
            priceMatchText = priceMatchText.replace('或更低', '').trim();
        }
        const priceMatch = priceMatchText.match(/[\d.,]+/);
        if (!priceMatch) return;

        const rubPrice = parseFloat(priceMatch[0].replace(',', '.'));

        // 获取收入列的负值
        const marginSpan = marginCell.querySelector('span');
        if (!marginSpan) return;

        const marginText = marginSpan.textContent.trim();
        const marginMatch = marginText.match(/-?[\d.,]+/);
        if (!marginMatch) return;

        const marginRub = Math.abs(parseFloat(marginMatch[0].replace(',', '.')));

        // 计算实际收入：价格 - 负值（负负得正）
        const actualIncomeRub = rubPrice - marginRub;
        const actualIncomeCny = (actualIncomeRub * currentExchangeRate).toFixed(2);

        // 创建人民币收入显示（修改：不换行）
        const cnySpan = document.createElement('span');
        cnySpan.className = 'cny-income-converted buy-request-income';
        cnySpan.textContent = ` (¥${actualIncomeCny})`;

        // 添加到收入单元格（放在原有内容后面）
        marginSpan.appendChild(cnySpan);
        processedCells.add(cellId);
    }

    // 更新普通价格单元格文本（不重新创建元素）
    function updatePriceCellText(cell, conversionSpan, columnType) {
        const text = cell.textContent.trim();
        if (!text.includes('₽') || text.includes('或更高') || text === '₽') {
            conversionSpan.remove();
            return;
        }

        const priceMatch = text.match(/[\d.,]+/);
        if (!priceMatch) return;

        const rubPrice = parseFloat(priceMatch[0].replace(',', '.'));
        const cnyPrice = (rubPrice * currentExchangeRate).toFixed(2);

        // 只更新文本内容
        conversionSpan.textContent = ` (¥${cnyPrice})`;
    }

    // 更新购买请求价格单元格文本
    function updateBuyRequestPriceCellText(cell, conversionSpan) {
        const text = cell.textContent.trim();
        if (!text.includes('₽') || text === '₽') {
            conversionSpan.remove();
            return;
        }

        let priceText = text;
        if (priceText.includes('或更低')) {
            priceText = priceText.replace('或更低', '').trim();
        }

        const priceMatch = priceText.match(/[\d.,]+/);
        if (!priceMatch) return;

        const rubPrice = parseFloat(priceMatch[0].replace(',', '.'));
        const cnyPrice = (rubPrice * currentExchangeRate).toFixed(2);

        conversionSpan.textContent = ` (¥${cnyPrice})`;
    }

    // 更新购买请求收入单元格文本
    function updateBuyRequestMarginCellText(priceCell, marginCell, conversionSpan) {
        // 获取价格列的价格
        const priceText = priceCell.textContent.trim();
        let priceMatchText = priceText;
        if (priceMatchText.includes('或更低')) {
            priceMatchText = priceMatchText.replace('或更低', '').trim();
        }
        const priceMatch = priceMatchText.match(/[\d.,]+/);
        if (!priceMatch) {
            conversionSpan.remove();
            return;
        }

        const rubPrice = parseFloat(priceMatch[0].replace(',', '.'));

        // 获取收入列的负值
        const marginSpan = marginCell.querySelector('span');
        if (!marginSpan) {
            conversionSpan.remove();
            return;
        }

        const marginText = marginSpan.textContent.trim();
        const marginMatch = marginText.match(/-?[\d.,]+/);
        if (!marginMatch) {
            conversionSpan.remove();
            return;
        }

        const marginRub = Math.abs(parseFloat(marginMatch[0].replace(',', '.')));

        // 计算实际收入：价格 - 负值（负负得正）
        const actualIncomeRub = rubPrice - marginRub;
        const actualIncomeCny = (actualIncomeRub * currentExchangeRate).toFixed(2);

        conversionSpan.textContent = ` (¥${actualIncomeCny})`;
    }

    // 清理已删除的单元格记录
    function cleanupProcessedCells() {
        const currentCells = new Set();

        // 收集当前存在的所有转换元素
        document.querySelectorAll('.cny-price-converted, .cny-income-converted').forEach(el => {
            const parent = el.parentElement;
            if (parent) {
                // 创建一个唯一的ID
                const parentId = parent.id || parent.getAttribute('data-cell-id');
                if (parentId) {
                    currentCells.add(parentId);
                }
            }
        });

        // 删除已不存在的单元格记录
        for (const cellId of processedCells) {
            if (!currentCells.has(cellId)) {
                processedCells.delete(cellId);
            }
        }
    }

    // 添加CSS样式（一次性）- 修改为不换行样式
    function addConversionStyles() {
        if (document.querySelector('#market-conversion-styles')) return;

        const style = document.createElement('style');
        style.id = 'market-conversion-styles';
        style.textContent = `
            /* 普通表格样式 - 修改为不换行 */
            .cny-price-converted {
                display: inline;
                margin-left: 5px;
                font-family: Arial, sans-serif;
                transition: opacity 0.3s ease;
            }

            /* 第一列：价格 */
            .cny-price-converted.first-column {
                color: #90ba3c;
                font-size: 11px;
                font-weight: bold;
            }

            /* 第二列：不含手续费 */
            .cny-price-converted.second-column {
                color: #4CAF50;
                font-size: 11px;
                font-weight: normal;
            }

            /* 购买请求表格样式 */
            .cny-price-converted.buy-request-price {
                color: #90ba3c;
                font-size: 11px;
                font-weight: bold;
            }

            .cny-income-converted.buy-request-income {
                color: #4CAF50;
                font-size: 11px;
                font-weight: normal;
                display: inline;
                margin-left: 5px;
            }

            /* 防止页面跳动 */
            td {
                min-height: 24px;
                overflow: hidden;
            }

            /* 确保价格单元格内容不会换行 */
            .market_commodity_orders_table td {
                white-space: nowrap;
            }
        `;
        document.head.appendChild(style);
    }

    // 优化的MutationObserver（减少监听频率）
    function startOptimizedMutationObserver() {
        if (mutationObserver) {
            mutationObserver.disconnect();
        }

        let pendingUpdate = false;
        let lastMutationTime = 0;

        mutationObserver = new MutationObserver((mutations) => {
            // 防止频繁触发
            const now = Date.now();
            if (pendingUpdate || (now - lastMutationTime < 1000)) {
                return;
            }

            let hasTableChange = false;

            // 只检查添加的节点
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            if (node.classList &&
                                (node.classList.contains('market_commodity_orders_table') ||
                                 node.classList.contains('market_commodity_orders_table_container'))) {
                                hasTableChange = true;
                                break;
                            }
                        }
                    }
                }
                if (hasTableChange) break;
            }

            if (hasTableChange) {
                lastMutationTime = now;
                pendingUpdate = true;

                // 延迟处理，避免干扰页面渲染
                setTimeout(() => {
                    if (conversionEnabled) {
                        convertAllMarketPrices();
                    }
                    pendingUpdate = false;
                }, 500);
            }
        });

        // 只监听body的子节点变化，减少监听范围
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: false
        });
    }
    // ==================== 悬浮窗部分（添加开启/关闭功能） ====================

    function createEnhancedRateFloatingWindow(initialRate) {
        // 等待页面完全稳定后再创建悬浮窗
        setTimeout(() => {
            let exchangeRates = {
                CNYtoRUB: 1 / initialRate,
                RUBtoCNY: initialRate
            };
            let manualRateMode = GM_getValue("manualRateMode", false);
            let isLocked = GM_getValue("isLocked", false);
            let currentDirection = GM_getValue("conversionDirection", "CNYtoRUB");
            let isExpanded = GM_getValue("isExpanded", false);
            let conversionEnabled = GM_getValue("conversionEnabled", true); // 新增：是否启用价格转换

            // 如果手动模式，加载手动汇率
            if (manualRateMode) {
                const manualRates = GM_getValue("manualExchangeRates", exchangeRates);
                exchangeRates.CNYtoRUB = manualRates.CNYtoRUB;
                exchangeRates.RUBtoCNY = manualRates.RUBtoCNY;
            }

            // 添加悬浮窗CSS样式
            addFloatingWindowStyles();

            // 创建主容器
            const rateDisplay = document.createElement('div');
            rateDisplay.id = 'steam-rate-display';
            rateDisplay.className = 'steam-rate-container';

            // 设置初始位置
            const savedPosition = GM_getValue("floatWindowPosition");
            if (savedPosition) {
                rateDisplay.style.left = savedPosition.x + 'px';
                rateDisplay.style.top = savedPosition.y + 'px';
                rateDisplay.style.right = 'auto';
            } else {
                rateDisplay.style.right = '20px';
                rateDisplay.style.top = '80px';
            }

            // 创建折叠图标（只在折叠状态显示）
            const foldIcon = document.createElement('div');
            foldIcon.className = 'fold-icon';
            foldIcon.textContent = '₽¥';
            foldIcon.title = '点击展开汇率工具';
            foldIcon.style.display = isExpanded ? 'none' : 'flex';
            rateDisplay.appendChild(foldIcon);

            // 创建展开/折叠按钮（只在展开状态显示）
            const expandBtn = document.createElement('button');
            expandBtn.className = 'expand-btn';
            expandBtn.textContent = '×';
            expandBtn.title = '折叠';
            expandBtn.style.display = isExpanded ? 'flex' : 'none';
            rateDisplay.appendChild(expandBtn);

            // 标题
            const title = document.createElement('div');
            title.className = 'rate-title';
            title.innerHTML = '🎮 <span>Steam汇率工具</span>';
            rateDisplay.appendChild(title);

            // 汇率信息
            const rateInfo = document.createElement('div');
            rateInfo.className = 'rate-info';
            updateRateInfoDisplay();
            rateDisplay.appendChild(rateInfo);

            // 方向切换
            const directionGroup = document.createElement('div');
            directionGroup.className = 'direction-group';

            const cnyToRubBtn = document.createElement('button');
            cnyToRubBtn.className = `direction-btn ${currentDirection === 'CNYtoRUB' ? 'active' : ''}`;
            cnyToRubBtn.textContent = 'CNY → RUB';

            const rubToCnyBtn = document.createElement('button');
            rubToCnyBtn.className = `direction-btn ${currentDirection === 'RUBtoCNY' ? 'active' : ''}`;
            rubToCnyBtn.textContent = 'RUB → CNY';

            directionGroup.appendChild(cnyToRubBtn);
            directionGroup.appendChild(rubToCnyBtn);
            rateDisplay.appendChild(directionGroup);

            // 转换容器
            const conversionContainer = document.createElement('div');
            conversionContainer.className = 'conversion-container';

            // 输入行
            const inputRow = document.createElement('div');
            inputRow.className = 'input-row';

            const inputCurrency = document.createElement('div');
            inputCurrency.className = 'currency-label';
            inputCurrency.textContent = currentDirection === 'CNYtoRUB' ? 'CNY' : 'RUB';

            const inputField = document.createElement('input');
            inputField.type = 'number';
            inputField.min = '0';
            inputField.step = '0.01';
            inputField.className = 'amount-input';
            inputField.placeholder = '0.00';
            inputField.value = GM_getValue("lastInputAmount", "");

            inputRow.appendChild(inputCurrency);
            inputRow.appendChild(inputField);
            conversionContainer.appendChild(inputRow);

            // 箭头
            const arrowRow = document.createElement('div');
            arrowRow.className = 'conversion-arrow';
            arrowRow.textContent = '↓';
            conversionContainer.appendChild(arrowRow);

            // 输出行
            const outputRow = document.createElement('div');
            outputRow.className = 'output-row';

            const outputCurrency = document.createElement('div');
            outputCurrency.className = 'currency-label';
            outputCurrency.textContent = currentDirection === 'CNYtoRUB' ? 'RUB' : 'CNY';

            const outputField = document.createElement('div');
            outputField.className = 'amount-output';
            outputField.textContent = '0.00';

            outputRow.appendChild(outputCurrency);
            outputRow.appendChild(outputField);
            conversionContainer.appendChild(outputRow);

            rateDisplay.appendChild(conversionContainer);

            // 控制行 - 修改为三列布局
            const controlRow = document.createElement('div');
            controlRow.className = 'control-row';

            const lockButton = document.createElement('button');
            lockButton.className = 'lock-btn';
            lockButton.textContent = isLocked ? '🔒' : '🔓';
            lockButton.title = isLocked ? '解锁位置' : '锁定位置';

            const toggleButton = document.createElement('button');
            toggleButton.className = `mode-btn ${manualRateMode ? 'manual' : 'auto'}`;
            toggleButton.textContent = manualRateMode ? '手动' : '自动';
            toggleButton.title = manualRateMode ? '切换到自动汇率' : '切换到手动汇率';

            // 新增：价格转换开关按钮
            const conversionToggle = document.createElement('button');
            conversionToggle.className = `conversion-toggle ${conversionEnabled ? 'enabled' : 'disabled'}`;
            conversionToggle.textContent = conversionEnabled ? '✅' : '❌';
            conversionToggle.title = conversionEnabled ? '关闭价格转换' : '开启价格转换';

            controlRow.appendChild(lockButton);
            controlRow.appendChild(toggleButton);
            controlRow.appendChild(conversionToggle);
            rateDisplay.appendChild(controlRow);

            document.body.appendChild(rateDisplay);

            // 设置初始展开状态
            updateExpandState();

            // 初始计算
            calculateConversion();

            // 更新展开状态
            function updateExpandState() {
                if (isExpanded) {
                    rateDisplay.classList.remove('collapsed');
                    rateDisplay.classList.add('expanded');
                    foldIcon.style.display = 'none';
                    expandBtn.style.display = 'flex';
                    rateDisplay.style.cursor = isLocked ? 'default' : 'move';

                    // 更新拖动事件
                    if (!isLocked) {
                        rateDisplay.addEventListener('mousedown', initDrag);
                    }
                } else {
                    rateDisplay.classList.remove('expanded');
                    rateDisplay.classList.add('collapsed');
                    foldIcon.style.display = 'flex';
                    expandBtn.style.display = 'none';
                    rateDisplay.style.cursor = 'pointer';

                    // 移除拖动事件
                    rateDisplay.removeEventListener('mousedown', initDrag);
                }
            }

            // 切换展开状态
            function toggleExpand() {
                isExpanded = !isExpanded;
                GM_setValue("isExpanded", isExpanded);
                updateExpandState();
            }

            // 折叠图标点击事件
            foldIcon.addEventListener('click', toggleExpand);

            // 展开按钮点击事件
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleExpand();
            });

            // 更新汇率信息
            function updateRateInfoDisplay() {
                rateInfo.innerHTML = `
                    <div>
                        <span class="label">1 CNY =</span>
                        <span class="value">${exchangeRates.CNYtoRUB.toFixed(2)} RUB</span>
                    </div>
                    <div>
                        <span class="label">1 RUB =</span>
                        <span class="value">${exchangeRates.RUBtoCNY.toFixed(4)} CNY</span>
                    </div>
                    <div style="margin-top: 5px; font-size: 11px; color: #888; text-align: center;">
                        ${manualRateMode ? '💡 手动汇率模式' : '🔄 自动汇率模式'}
                        ${!conversionEnabled ? '<br>⚠️ 价格转换已关闭' : ''}
                    </div>
                `;
            }

            // 更新方向显示
            function updateDirectionDisplay() {
                inputCurrency.textContent = currentDirection === 'CNYtoRUB' ? 'CNY' : 'RUB';
                outputCurrency.textContent = currentDirection === 'CNYtoRUB' ? 'RUB' : 'CNY';

                cnyToRubBtn.className = `direction-btn ${currentDirection === 'CNYtoRUB' ? 'active' : ''}`;
                rubToCnyBtn.className = `direction-btn ${currentDirection === 'RUBtoCNY' ? 'active' : ''}`;

                calculateConversion();
            }

            // 计算转换
            function calculateConversion() {
                const inputAmount = parseFloat(inputField.value);
                if (!isNaN(inputAmount) && inputAmount >= 0) {
                    let result;
                    if (currentDirection === 'CNYtoRUB') {
                        result = (inputAmount * exchangeRates.CNYtoRUB).toFixed(2);
                    } else {
                        result = (inputAmount * exchangeRates.RUBtoCNY).toFixed(2);
                    }
                    outputField.textContent = result;

                    // 保存输入值
                    GM_setValue("lastInputAmount", inputField.value);
                } else {
                    outputField.textContent = '0.00';
                }
            }

            // 输入框事件（使用防抖）
            let inputTimeout;
            inputField.addEventListener('input', () => {
                clearTimeout(inputTimeout);
                inputTimeout = setTimeout(calculateConversion, 300);
            });

            // 方向切换事件
            cnyToRubBtn.addEventListener('click', () => {
                currentDirection = 'CNYtoRUB';
                GM_setValue("conversionDirection", currentDirection);
                updateDirectionDisplay();
            });

            rubToCnyBtn.addEventListener('click', () => {
                currentDirection = 'RUBtoCNY';
                GM_setValue("conversionDirection", currentDirection);
                updateDirectionDisplay();
            });

            // 模式切换事件
            toggleButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!manualRateMode) {
                    // 切换到手动模式
                    const cnyToRubInput = prompt("请输入 1 CNY = ? RUB：", exchangeRates.CNYtoRUB.toFixed(2));
                    if (cnyToRubInput !== null) {
                        const cnyToRub = parseFloat(cnyToRubInput);
                        if (!isNaN(cnyToRub) && cnyToRub > 0) {
                            const rubToCny = 1 / cnyToRub;
                            exchangeRates.CNYtoRUB = cnyToRub;
                            exchangeRates.RUBtoCNY = rubToCny;

                            // 保存手动汇率
                            GM_setValue("manualExchangeRates", exchangeRates);
                            manualRateMode = true;
                            GM_setValue("manualRateMode", true);

                            // 更新当前汇率
                            currentExchangeRate = rubToCny;
                            GM_setValue('market_exchange_rate', rubToCny);
                            GM_setValue('market_exchange_rate_time', Date.now());

                            // 重新转换表格价格
                            if (conversionEnabled) {
                                document.querySelectorAll('.cny-price-converted, .cny-income-converted').forEach(el => el.remove());
                                processedCells.clear();
                                convertAllMarketPrices();
                            }

                            toggleButton.className = 'mode-btn manual';
                            toggleButton.textContent = '手动';
                            updateRateInfoDisplay();
                            calculateConversion();

                            // 显示通知
                            showNotification('已切换到手动汇率模式');
                        }
                    }
                } else {
                    // 切换到自动模式
                    try {
                        const newRate = await fetchExchangeRate();
                        exchangeRates.CNYtoRUB = 1 / newRate;
                        exchangeRates.RUBtoCNY = newRate;

                        manualRateMode = false;
                        GM_setValue("manualRateMode", false);

                        // 更新当前汇率
                        currentExchangeRate = newRate;
                        GM_setValue('market_exchange_rate', newRate);
                        GM_setValue('market_exchange_rate_time', Date.now());

                        // 重新转换表格价格
                        if (conversionEnabled) {
                            document.querySelectorAll('.cny-price-converted, .cny-income-converted').forEach(el => el.remove());
                            processedCells.clear();
                            convertAllMarketPrices();
                        }

                        toggleButton.className = 'mode-btn auto';
                        toggleButton.textContent = '自动';
                        updateRateInfoDisplay();
                        calculateConversion();

                        // 显示通知
                        showNotification('已切换到自动汇率模式');
                    } catch (error) {
                        showNotification('无法获取自动汇率，请检查网络连接');
                    }
                }
            });

            // 锁定按钮事件
            lockButton.addEventListener('click', (e) => {
                e.stopPropagation();
                isLocked = !isLocked;
                GM_setValue("isLocked", isLocked);
                lockButton.textContent = isLocked ? '🔒' : '🔓';
                lockButton.title = isLocked ? '解锁位置' : '锁定位置';

                if (isExpanded) {
                    rateDisplay.style.cursor = isLocked ? 'default' : 'move';
                    if (!isLocked) {
                        rateDisplay.addEventListener('mousedown', initDrag);
                    } else {
                        rateDisplay.removeEventListener('mousedown', initDrag);
                    }
                }
            });

            // 新增：价格转换开关事件
            conversionToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                conversionEnabled = !conversionEnabled;
                GM_setValue("conversionEnabled", conversionEnabled);

                // 更新按钮状态
                conversionToggle.className = `conversion-toggle ${conversionEnabled ? 'enabled' : 'disabled'}`;
                conversionToggle.textContent = conversionEnabled ? '✅' : '❌';
                conversionToggle.title = conversionEnabled ? '关闭价格转换' : '开启价格转换';

                // 更新汇率信息显示
                updateRateInfoDisplay();

                if (conversionEnabled) {
                    // 开启价格转换
                    convertAllMarketPrices();
                    showNotification('价格转换已开启');
                } else {
                    // 关闭价格转换，移除所有转换元素
                    document.querySelectorAll('.cny-price-converted, .cny-income-converted').forEach(el => el.remove());
                    processedCells.clear();
                    showNotification('价格转换已关闭');
                }
            });

            // 拖动功能
            function initDrag(e) {
                if (isLocked || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

                e.preventDefault();
                let offsetX = e.clientX - rateDisplay.getBoundingClientRect().left;
                let offsetY = e.clientY - rateDisplay.getBoundingClientRect().top;

                function dragMove(e) {
                    const x = Math.max(5, Math.min(window.innerWidth - rateDisplay.offsetWidth - 5, e.clientX - offsetX));
                    const y = Math.max(5, Math.min(window.innerHeight - rateDisplay.offsetHeight - 5, e.clientY - offsetY));

                    rateDisplay.style.left = `${x}px`;
                    rateDisplay.style.top = `${y}px`;
                    rateDisplay.style.right = 'auto';
                }

                function dragEnd() {
                    document.removeEventListener('mousemove', dragMove);
                    document.removeEventListener('mouseup', dragEnd);

                    // 保存位置
                    const rect = rateDisplay.getBoundingClientRect();
                    GM_setValue("floatWindowPosition", {
                        x: rect.left,
                        y: rect.top
                    });
                }

                document.addEventListener('mousemove', dragMove);
                document.addEventListener('mouseup', dragEnd);
            }

            // 添加窗口大小变化监听
            window.addEventListener('resize', () => {
                const rect = rateDisplay.getBoundingClientRect();
                if (rect.right > window.innerWidth) {
                    rateDisplay.style.left = `${window.innerWidth - rect.width - 10}px`;
                    rateDisplay.style.right = 'auto';
                }
                if (rect.bottom > window.innerHeight) {
                    rateDisplay.style.top = `${window.innerHeight - rect.height - 10}px`;
                }
            });
            // 悬浮窗CSS样式 - 修改为支持三列布局
            function addFloatingWindowStyles() {
                if (document.querySelector('#floating-window-styles')) return;

                const style = document.createElement('style');
                style.id = 'floating-window-styles';
                style.textContent = `
                    .steam-rate-container {
                        position: fixed;
                        z-index: 10000;
                        color: #333;
                        font-size: 13px;
                        background-color: rgba(255, 255, 255, 0.98);
                        border: 1px solid #e0e0e0;
                        border-radius: 10px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                        font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
                        backdrop-filter: blur(5px);
                        transition: all 0.3s ease;
                        overflow: hidden;
                        min-height: 50px;
                        min-width: 50px;
                    }

                    .steam-rate-container.collapsed {
                        width: 50px;
                        height: 50px;
                        padding: 0;
                        cursor: pointer;
                    }

                    .steam-rate-container.expanded {
                        min-width: 160px;
                        max-width: 220px;
                        padding: 15px;
                    }

                    .steam-rate-container:hover {
                        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
                    }

                    .fold-icon {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: 24px;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(135deg, #4CAF50, #45a049);
                        color: white;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }

                    .fold-icon:hover {
                        transform: translate(-50%, -50%) scale(1.1);
                    }

                    .expand-btn {
                        position: absolute;
                        top: 5px;
                        right: 5px;
                        background: rgba(255, 255, 255, 0.8);
                        border: none;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        font-size: 12px;
                        color: #666;
                        z-index: 10;
                        transition: all 0.2s;
                    }

                    .expand-btn:hover {
                        background: white;
                        color: #333;
                        transform: scale(1.1);
                    }

                    .rate-title {
                        font-weight: 600;
                        margin-bottom: 12px;
                        padding-bottom: 8px;
                        border-bottom: 2px solid #4CAF50;
                        color: #2c3e50;
                        font-size: 14px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .rate-info {
                        margin-bottom: 15px;
                        line-height: 1.5;
                        font-size: 12px;
                        opacity: 1;
                        transition: opacity 0.3s ease;
                    }

                    .collapsed .rate-info {
                        opacity: 0;
                        height: 0;
                        margin: 0;
                        overflow: hidden;
                    }

                    .rate-info div {
                        margin-bottom: 3px;
                        display: flex;
                        justify-content: space-between;
                    }

                    .rate-info .label {
                        color: #666;
                        min-width: 70px;
                    }

                    .rate-info .value {
                        color: #2c3e50;
                        font-weight: 500;
                    }

                    .direction-group {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                        margin-bottom: 15px;
                        opacity: 1;
                        transition: opacity 0.3s ease;
                    }

                    .collapsed .direction-group {
                        opacity: 0;
                        height: 0;
                        margin: 0;
                        overflow: hidden;
                    }

                    .direction-btn {
                        padding: 8px 6px;
                        border: 2px solid #e0e0e0;
                        border-radius: 6px;
                        background: #f8f9fa;
                        color: #495057;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 500;
                        text-align: center;
                        transition: all 0.2s;
                        min-width: 60px;
                    }

                    .direction-btn:hover {
                        background: #e9ecef;
                        border-color: #adb5bd;
                    }

                    .direction-btn.active {
                        background: linear-gradient(135deg, #4CAF50, #45a049);
                        border-color: #4CAF50;
                        color: white;
                        box-shadow: 0 2px 5px rgba(76, 175, 80, 0.3);
                    }

                    .conversion-container {
                        background: #f8f9fa;
                        padding: 12px;
                        border-radius: 8px;
                        margin-bottom: 15px;
                        opacity: 1;
                        transition: opacity 0.3s ease;
                    }

                    .collapsed .conversion-container {
                        opacity: 0;
                        height: 0;
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                    }

                    .input-row, .output-row {
                        display: flex;
                        align-items: center;
                        margin-bottom: 10px;
                        gap: 10px;
                    }

                    .currency-label {
                        font-weight: 600;
                        color: #2c3e50;
                        min-width: 35px;
                        font-size: 12px;
                    }

                    .amount-input {
                        flex: 1;
                        min-width: 0;
                        padding: 8px 10px;
                        border: 2px solid #e0e0e0;
                        border-radius: 6px;
                        font-size: 13px;
                        transition: all 0.2s;
                        background: white;
                    }

                    .amount-input:focus {
                        outline: none;
                        border-color: #4CAF50;
                        box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
                    }

                    .amount-output {
                        flex: 1;
                        min-width: 0;
                        padding: 8px 10px;
                        border: 2px solid #4CAF50;
                        border-radius: 6px;
                        background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
                        font-size: 13px;
                        font-weight: 600;
                        color: #2c3e50;
                        min-height: 37px;
                        display: flex;
                        align-items: center;
                    }

                    .conversion-arrow {
                        text-align: center;
                        color: #4CAF50;
                        font-size: 18px;
                        margin: 5px 0;
                        opacity: 0.7;
                    }

                    /* 修改控制行为三列布局 */
                    .control-row {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 8px;
                        opacity: 1;
                        transition: opacity 0.3s ease;
                    }

                    .collapsed .control-row {
                        opacity: 0;
                        height: 0;
                        margin: 0;
                        overflow: hidden;
                    }

                    .lock-btn {
                        width: auto;
                        padding: 8px;
                        border: 2px solid #e0e0e0;
                        border-radius: 6px;
                        background: #f8f9fa;
                        cursor: pointer;
                        font-size: 16px;
                        transition: all 0.2s;
                    }

                    .lock-btn:hover {
                        background: #e9ecef;
                        border-color: #adb5bd;
                    }

                    .mode-btn {
                        padding: 8px 6px;
                        border: 2px solid;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                        text-align: center;
                        transition: all 0.2s;
                    }

                    .mode-btn.auto {
                        background: linear-gradient(135deg, #4CAF50, #45a049);
                        border-color: #4CAF50;
                        color: white;
                    }

                    .mode-btn.manual {
                        background: linear-gradient(135deg, #ffeb3b, #fbc02d);
                        border-color: #ffc107;
                        color: #333;
                    }

                    .mode-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 3px 8px rgba(0,0,0,0.1);
                    }

                    /* 新增：价格转换开关按钮样式 */
                    .conversion-toggle {
                        padding: 8px 6px;
                        border: 2px solid #e0e0e0;
                        border-radius: 6px;
                        background: #f8f9fa;
                        cursor: pointer;
                        font-size: 16px;
                        transition: all 0.2s;
                        text-align: center;
                    }

                    .conversion-toggle.enabled {
                        background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
                        border-color: #4CAF50;
                    }

                    .conversion-toggle.disabled {
                        background: linear-gradient(135deg, #ffebee, #ffcdd2);
                        border-color: #f44336;
                    }

                    .conversion-toggle:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 3px 8px rgba(0,0,0,0.1);
                    }
                `;
                document.head.appendChild(style);
            }
        }, 1000); // 延迟1秒加载悬浮窗
    }

    // ==================== 辅助函数 ====================

    // 显示通知函数
    function showNotification(message) {
        // 移除旧的通知
        const oldNotifications = document.querySelectorAll('.rate-notification');
        oldNotifications.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = 'rate-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            z-index: 10001;
            font-size: 14px;
            font-family: Arial, sans-serif;
            animation: fadeInOut 2s ease-in-out;
            pointer-events: none;
        `;

        // 添加动画样式（如果不存在）
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -40%); }
                    20% { opacity: 1; transform: translate(-50%, -50%); }
                    80% { opacity: 1; transform: translate(-50%, -50%); }
                    100% { opacity: 0; transform: translate(-50%, -60%); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 2000);
    }

    // 刷新汇率（手动调用）
    async function refreshExchangeRate() {
        try {
            const newRate = await fetchExchangeRate();
            currentExchangeRate = newRate;
            GM_setValue('market_exchange_rate', newRate);
            GM_setValue('market_exchange_rate_time', Date.now());

            // 如果转换启用，更新所有已转换的价格
            if (conversionEnabled) {
                document.querySelectorAll('.cny-price-converted, .cny-income-converted').forEach(el => {
                    const parent = el.parentElement;
                    if (parent) {
                        // 获取原始卢布价格
                        const text = parent.textContent.trim();
                        const priceMatch = text.match(/[\d.,]+/);
                        if (priceMatch) {
                            const rubPrice = parseFloat(priceMatch[0].replace(',', '.'));
                            const cnyPrice = (rubPrice * currentExchangeRate).toFixed(2);

                            // 根据元素类型更新
                            if (el.classList.contains('cny-income-converted')) {
                                // 对于收入，需要特殊处理
                                if (parent.previousElementSibling) {
                                    const priceText = parent.previousElementSibling.textContent.trim();
                                    let priceMatchText = priceText;
                                    if (priceMatchText.includes('或更低')) {
                                        priceMatchText = priceMatchText.replace('或更低', '').trim();
                                    }
                                    const priceMatch2 = priceMatchText.match(/[\d.,]+/);
                                    if (priceMatch2) {
                                        const rubPrice2 = parseFloat(priceMatch2[0].replace(',', '.'));
                                        const marginRub = Math.abs(rubPrice);
                                        const actualIncomeRub = rubPrice2 - marginRub;
                                        const actualIncomeCny = (actualIncomeRub * currentExchangeRate).toFixed(2);
                                        el.textContent = ` (¥${actualIncomeCny})`;
                                    }
                                }
                            } else {
                                el.textContent = ` (¥${cnyPrice})`;
                            }
                        }
                    }
                });
            }

            // 更新悬浮窗（如果存在）
            const rateDisplay = document.getElementById('steam-rate-display');
            if (rateDisplay && !GM_getValue("manualRateMode", false)) {
                // 触发汇率更新
                showNotification('汇率已刷新');
            }

            return newRate;
        } catch (error) {
            console.error('[汇率转换] 刷新汇率失败:', error);
            return currentExchangeRate;
        }
    }

    // 添加刷新按钮到页面（可选功能）
    function addRefreshButton() {
        // 检查是否已存在刷新按钮
        if (document.querySelector('#rate-refresh-btn')) return;

        // 寻找合适的位置（Steam页面的某个位置）
        const header = document.querySelector('.market_header');
        if (header) {
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'rate-refresh-btn';
            refreshBtn.className = 'btn_green_white_innerfade btn_medium';
            refreshBtn.style.cssText = `
                margin-left: 10px;
                font-size: 12px;
                padding: 4px 8px;
            `;
            refreshBtn.innerHTML = '<span>🔄 刷新汇率</span>';
            refreshBtn.title = '手动刷新当前汇率';

            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<span>刷新中...</span>';

                try {
                    await refreshExchangeRate();
                    setTimeout(() => {
                        refreshBtn.disabled = false;
                        refreshBtn.innerHTML = '<span>🔄 刷新汇率</span>';
                    }, 1000);
                } catch (error) {
                    refreshBtn.disabled = false;
                    refreshBtn.innerHTML = '<span>🔄 刷新汇率</span>';
                }
            });

            header.appendChild(refreshBtn);
        }
    }

    // 添加键盘快捷键（可选功能）
    function addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl + Shift + R 刷新汇率
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                refreshExchangeRate();
            }

            // Ctrl + Shift + H 显示/隐藏悬浮窗
            if (e.ctrlKey && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                const rateDisplay = document.getElementById('steam-rate-display');
                if (rateDisplay) {
                    const isExpanded = GM_getValue("isExpanded", true);
                    rateDisplay.querySelector(isExpanded ? '.expand-btn' : '.fold-icon')?.click();
                }
            }

            // Ctrl + Shift + T 切换价格转换开关
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                const rateDisplay = document.getElementById('steam-rate-display');
                if (rateDisplay) {
                    const conversionToggle = rateDisplay.querySelector('.conversion-toggle');
                    if (conversionToggle) {
                        conversionToggle.click();
                    }
                }
            }
        });
    }

    // 页面卸载时的清理
    window.addEventListener('beforeunload', () => {
        if (mutationObserver) {
            mutationObserver.disconnect();
        }
    });

    // 初始加载完成后的额外设置
    setTimeout(() => {
        // 可选：添加刷新按钮
        // addRefreshButton();

        // 可选：添加快捷键
        addKeyboardShortcuts();

        console.log('[汇率转换] 脚本完全加载完成');
    }, 3000);

    // 导出函数到全局（便于调试）
    window.steamRateConverter = {
        refreshRate: refreshExchangeRate,
        convertAllPrices: convertAllMarketPrices,
        getCurrentRate: () => currentExchangeRate,
        toggleConversion: () => {
            conversionEnabled = !conversionEnabled;
            GM_setValue("conversionEnabled", conversionEnabled);
            if (conversionEnabled) {
                convertAllMarketPrices();
            } else {
                document.querySelectorAll('.cny-price-converted, .cny-income-converted').forEach(el => el.remove());
                processedCells.clear();
            }
            return conversionEnabled;
        },
        showNotification: showNotification
    };
})();
