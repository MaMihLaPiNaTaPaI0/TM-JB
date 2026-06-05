// ==UserScript==
// @name         消逝的光芒内购计算器优化
// @name:zh      消逝的光芒内购计算器优化
// @name:en      Dying Light In-App Purchase Calculator (Optimized)
// @version      6.6.6
// @description  帮助计算游戏内购物品总价和所需代币
// @description:en Optimized calculator for Dying Light in-app purchases with all features

// @match        https://pilgrimoutpost.techlandgg.com/armory
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Dying Light/dying-light-calculator.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/Dying Light/dying-light-calculator.user.js

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

    // 添加自定义样式
    GM_addStyle(`
        .cost-calculator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgb(16, 23, 40);
            background: linear-gradient(145deg, rgb(15, 22, 40) 0%, rgb(25, 30, 50) 100%);
            color: #e0e0ff;
            border: 2px solid #3a5f8a;
            border-radius: 12px;
            box-shadow: 0 0 30px rgba(0, 50, 150, 0.8);
            z-index: 9999;
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            width: 340px;
            max-height: 80vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            backdrop-filter: blur(8px);
            transform-style: preserve-3d;
            transition: all 0.3s ease;
        }

        .cost-calculator.minimized {
            width: 220px;
            height: 40px;
            overflow: hidden;
        }

        .calculator-header {
            background: linear-gradient(90deg, #1a2a4a 0%, #2a3a6a 100%);
            padding: 12px 25px;
            border-bottom: 1px solid #4d7bc5;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0, 10, 30, 0.5);
            cursor: pointer;
            position: relative;
        }

        .calculator-title {
            margin: 0;
            color: #a5f6ff;
            font-size: 16px;
            text-shadow: 0 0 12px rgba(100, 200, 255, 0.7);
            font-weight: 700;
            letter-spacing: 0.5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .minimize-btn {
            background: none;
            border: none;
            color: #a5f6ff;
            font-size: 18px;
            cursor: pointer;
            padding: 0 5px;
        }

        .minimized-view {
            display: none;
            padding: 8px 15px;
            font-size: 13px;
            color: #a5f6ff;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .cost-calculator.minimized .minimized-view {
            display: block;
        }

        .cost-calculator.minimized .calculator-body,
        .cost-calculator.minimized .calculator-footer {
            display: none;
        }

        .calculator-body {
            padding: 15px;
            overflow-y: auto;
            max-height: 45vh;
            background: rgba(15, 22, 40, 0.4);
        }

        .item-list {
            margin-bottom: 15px;
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid rgba(74, 110, 169, 0.5);
            border-radius: 8px;
            background: rgba(10, 18, 35, 0.6);
            padding: 8px;
            box-shadow: inset 0 0 10px rgba(0, 20, 50, 0.5);
        }

        .calculator-footer {
            padding: 15px;
            background: rgba(20, 30, 50, 0.8);
            border-top: 1px solid #4d7bc5;
        }

        .item-row {
            display: flex;
            align-items: center;
            padding: 8px 10px;
            margin-bottom: 5px;
            transition: all 0.3s ease;
            border-radius: 6px;
            background: rgba(20, 30, 50, 0.4);
            border: 1px solid rgba(74, 110, 169, 0.3);
        }

        .item-row.selected {
            background: linear-gradient(90deg, rgba(74, 110, 169, 0.4) 0%, rgba(90, 157, 233, 0.3) 100%);
            border: 1px solid rgba(90, 157, 233, 0.7);
        }

        .item-checkbox {
            margin-right: 12px;
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #4d7bc5;
        }

        .item-name {
            flex-grow: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 14px;
            color: #d0e0ff;
        }

        .item-price {
            color: #ffcc66;
            font-weight: bold;
            margin-left: 8px;
            min-width: 45px;
            text-align: right;
            font-size: 14px;
        }

        .control-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }

        .calc-button {
            flex: 1;
            padding: 10px;
            background: linear-gradient(to bottom, #4a6ea9, #2a4a7a);
            border: 1px solid #5a9de9;
            color: #e0f0ff;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            text-align: center;
        }

        /* 精简统计样式 */
        .stats-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 10px;
            background: rgba(15, 25, 45, 0.8);
            border-radius: 6px;
            font-size: 13px;
        }

        .stat-label {
            color: #a5d6ff;
        }

        .stat-value {
            color: #ffdd77;
            font-weight: bold;
        }

        .token-icon {
            width: 16px;
            height: 16px;
            margin-left: 4px;
            vertical-align: middle;
        }

        .select-all-container {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        }

        .select-all-label {
            margin-left: 10px;
            font-size: 14px;
            color: #b8d6ff;
        }

        .section-title {
            font-size: 15px;
            color: #a5f6ff;
            margin: 12px 0 8px;
            font-weight: 600;
        }

        .progress-container {
            width: 100%;
            height: 4px;
            background: rgba(50, 70, 100, 0.5);
            border-radius: 2px;
            margin: 5px 0 8px;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #4a8ac9, #5a9de9);
            border-radius: 2px;
        }
    `);

    // 创建计算器容器
    const calculator = document.createElement('div');
    calculator.className = 'cost-calculator';
    calculator.innerHTML = `
        <div class="calculator-header">
            <h3 class="calculator-title">
                <span>内购计算器</span>
                <button class="minimize-btn">−</button>
            </h3>
        </div>
        <div class="minimized-view">
            已选: <span id="min-selected">0</span>/<span id="min-total">0</span> |
            花费: <span id="min-cost">0</span> |
            还需: <span id="min-needed">0</span>
        </div>
        <div class="calculator-body">
            <div class="section-title">商城物品</div>
            <div class="select-all-container">
                <input type="checkbox" id="selectAll" class="item-checkbox">
                <label for="selectAll" class="select-all-label">全选/取消全选</label>
            </div>
            <div class="item-list" id="itemListContainer"></div>
            <div class="control-buttons">
                <div class="calc-button" id="calculateBtn">计算</div>
                <div class="calc-button" id="resetBtn">重置</div>
            </div>
        </div>
        <div class="calculator-footer">
            <div class="section-title">计算结果</div>
            <div class="stats-container">
                <div class="stat-row">
                    <span class="stat-label">已选物品</span>
                    <span class="stat-value" id="selectedItems">0/0</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" id="progressBar" style="width:0%"></div>
                </div>
                <div class="stat-row">
                    <span class="stat-label">当前代币</span>
                    <span class="stat-value" id="currentTokens">0 <img src="/img/icon_token.png" class="token-icon"></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">总花费</span>
                    <span class="stat-value" id="totalCost">0 <img src="/img/icon_token.png" class="token-icon"></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">还需代币</span>
                    <span class="stat-value" id="neededTokens">0 <img src="/img/icon_token.png" class="token-icon"></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">还需周任务</span>
                    <span class="stat-value" id="neededWeeks">0次</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(calculator);

    // 获取关键元素
    const itemListContainer = document.getElementById('itemListContainer');
    const selectAllCheckbox = document.getElementById('selectAll');
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const currentTokensDisplay = document.getElementById('currentTokens');
    const totalCostDisplay = document.getElementById('totalCost');
    const neededTokensDisplay = document.getElementById('neededTokens');
    const neededWeeksDisplay = document.getElementById('neededWeeks');
    const selectedItemsDisplay = document.getElementById('selectedItems');
    const progressBar = document.getElementById('progressBar');
    const minimizeBtn = calculator.querySelector('.minimize-btn');
    const minSelected = calculator.querySelector('#min-selected');
    const minTotal = calculator.querySelector('#min-total');
    const minCost = calculator.querySelector('#min-cost');
    const minNeeded = calculator.querySelector('#min-needed');

    // 最小化/最大化功能
    minimizeBtn.addEventListener('click', function() {
        calculator.classList.toggle('minimized');
        this.textContent = calculator.classList.contains('minimized') ? '+' : '−';
    });

    // 更新最小化视图
    function updateMinimizedView(selectedCount, totalItems, totalCost, neededTokens) {
        minSelected.textContent = selectedCount;
        minTotal.textContent = totalItems;
        minCost.textContent = totalCost;
        minNeeded.textContent = neededTokens;
    }

    // 存储商品数据
    let items = [];
    let currentTokens = 0;
    let lastItemCount = 0;

    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }

    // 获取当前代币数量
    function getCurrentTokens() {
        try {
            const tokenElement = document.querySelector('#tokensMiniInfo');
            if (tokenElement) {
                const tokens = parseInt(tokenElement.textContent.trim());
                return isNaN(tokens) ? 0 : tokens;
            }
        } catch (e) {
            console.error('获取代币数量时出错:', e);
        }
        return 0;
    }

    // 初始化函数
    function initializeCalculator() {
        // 获取当前代币数量
        currentTokens = getCurrentTokens();
        currentTokensDisplay.innerHTML = `${currentTokens} <img src="/img/icon_token.png" class="token-icon">`;

        // 获取页面中的商品
        const itemElements = document.querySelectorAll('.armory__item-header');
        const currentItemCount = itemElements.length;

        // 如果商品数量没有变化，则跳过重新初始化
        if (currentItemCount === lastItemCount && lastItemCount !== 0) {
            return;
        }
        lastItemCount = currentItemCount;

        // 清空当前列表
        items = [];
        itemListContainer.innerHTML = '';

        // 处理每个商品
        itemElements.forEach((item, index) => {
            const nameElement = item.querySelector('.armory__item-name');
            const priceElement = item.querySelector('.armory__item-price strong');

            if (nameElement && priceElement) {
                const name = nameElement.textContent.trim();
                const price = parseInt(priceElement.textContent.trim());

                if (!isNaN(price)) {
                    const itemId = `item-${index}`;

                    // 添加商品到列表
                    items.push({
                        id: itemId,
                        name: name,
                        price: price,
                        element: item,
                        selected: false
                    });

                    // 创建列表项
                    const row = document.createElement('div');
                    row.className = 'item-row';
                    row.innerHTML = `
                        <input type="checkbox" class="item-checkbox" id="${itemId}">
                        <div class="item-name" title="${name}">${name}</div>
                        <div class="item-price">${price}</div>
                    `;
                    itemListContainer.appendChild(row);
                }
            }
        });

        // 更新物品总数
        selectedItemsDisplay.textContent = `0/${items.length}`;
        minTotal.textContent = items.length;
        progressBar.style.width = '0%';

        // 添加事件监听器
        setupEventListeners();

        // 初始计算
        calculateTotal();
    }

    // 设置事件监听器
    function setupEventListeners() {
        // 事件委托处理商品选择
        itemListContainer.addEventListener('change', function(event) {
            if (event.target.classList.contains('item-checkbox') && event.target.type === 'checkbox') {
                const itemId = event.target.id;
                const item = items.find(i => i.id === itemId);
                if (item) {
                    item.selected = event.target.checked;
                    // 更新行样式
                    const row = event.target.closest('.item-row');
                    if (row) {
                        row.classList.toggle('selected', event.target.checked);
                    }
                    updateSelectAllState();
                    calculateTotal();
                }
            }
        });

        // 全选复选框
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            items.forEach(item => {
                item.selected = isChecked;
                const checkbox = document.getElementById(item.id);
                if (checkbox) {
                    checkbox.checked = isChecked;
                    // 更新行样式
                    const row = checkbox.closest('.item-row');
                    if (row) {
                        row.classList.toggle('selected', isChecked);
                    }
                }
            });
            calculateTotal();
        });

        // 计算按钮
        calculateBtn.addEventListener('click', function() {
            calculateTotal();
        });

        // 重置按钮
        resetBtn.addEventListener('click', function() {
            items.forEach(item => {
                item.selected = false;
                const checkbox = document.getElementById(item.id);
                if (checkbox) {
                    checkbox.checked = false;
                    // 移除行样式
                    const row = checkbox.closest('.item-row');
                    if (row) {
                        row.classList.remove('selected');
                    }
                }
            });
            selectAllCheckbox.checked = false;
            if (selectAllCheckbox.indeterminate !== undefined) {
                selectAllCheckbox.indeterminate = false;
            }
            calculateTotal();
        });
    }

    // 更新全选复选框状态
    function updateSelectAllState() {
        const allSelected = items.length > 0 && items.every(item => item.selected);
        const someSelected = items.some(item => item.selected);

        selectAllCheckbox.checked = allSelected;
        if (selectAllCheckbox.indeterminate !== undefined) {
            selectAllCheckbox.indeterminate = !allSelected && someSelected;
        }
    }

    // 计算总计
    function calculateTotal() {
        const selectedItems = items.filter(item => item.selected);
        const selectedCount = selectedItems.length;
        const totalItems = items.length;
        const total = selectedItems.reduce((sum, item) => sum + item.price, 0);

        // 计算完成率
        const completionRate = totalItems > 0 ? Math.round((selectedCount / totalItems) * 100) : 0;

        // 更新当前代币数量
        currentTokens = getCurrentTokens();

        // 计算还需代币数量
        const neededTokens = Math.max(0, total - currentTokens);

        // 计算还需周任务次数
        const neededWeeks = Math.ceil(neededTokens / 25);

        // 更新显示
        selectedItemsDisplay.textContent = `${selectedCount}/${totalItems}`;
        progressBar.style.width = `${completionRate}%`;
        currentTokensDisplay.innerHTML = `${currentTokens} <img src="/img/icon_token.png" class="token-icon">`;
        totalCostDisplay.innerHTML = `${total} <img src="/img/icon_token.png" class="token-icon">`;
        neededTokensDisplay.innerHTML = `${neededTokens} <img src="/img/icon_token.png" class="token-icon">`;
        neededWeeksDisplay.textContent = `${neededWeeks}次`;

        // 更新最小化视图
        updateMinimizedView(selectedCount, totalItems, total, neededTokens);
    }

    // 初始化计算器（使用防抖版本）
    const debouncedInitialize = debounce(initializeCalculator, 500);

    // 尝试找到一个商品列表容器来观察
    let targetNode = document.body;
    const firstItem = document.querySelector('.armory__item-header');
    if (firstItem) {
        // 假设商品列表在一个公共容器内
        targetNode = firstItem.closest('.container') || document.body;
    }

    // 初始化
    setTimeout(() => {
        initializeCalculator();

        // 创建观察器
        const observer = new MutationObserver(debouncedInitialize);
        observer.observe(targetNode, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });
    }, 1500);
})();
