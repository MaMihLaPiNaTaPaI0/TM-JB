// ==UserScript==
// @name         PUBG.plus武器统计与缓存（20260301增强版）
// @version      17.2
// @description  武器统计、缓存对比、导入导出、锁定保护、重命名功能

// @match        https://pubg.plus/*
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/PUBG/pubgwuqi.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/PUBG/pubgwuqi.user.js

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

    console.log('PUBG.plus武器统计与缓存（增强版）已加载');

    // 武器统计功能
    const WeaponStats = {
        // 鎖定狀態存儲鍵
        LOCK_STATE_KEY: 'weapon_cache_lock_states',

        // 初始化
        init: function() {
            console.log('初始化武器统计功能...');
            this.createWeaponStatsButton();
            this.loadCacheList();
        },

        // 创建武器统计按钮
        createWeaponStatsButton: function() {
            console.log('正在创建武器统计按钮...');

            // 等待页面完全加载
            if (!document.body) {
                console.log('页面未完全加载，等待1秒...');
                setTimeout(() => this.createWeaponStatsButton(), 1000);
                return;
            }

            // 如果按钮已存在，先移除
            const existingBtn = document.getElementById('weapon-stats-btn');
            if (existingBtn) {
                console.log('移除已存在的按钮');
                existingBtn.remove();
            }

            const btn = document.createElement('button');
            btn.id = 'weapon-stats-btn';
            btn.innerHTML = '🔫 武器统计';
            btn.style.cssText = `
                position: fixed;
                bottom: 70px;
                right: 20px;
                background: linear-gradient(135deg, #FF5722, #E64A19);
                color: white;
                border: none;
                padding: 12px 25px;
                border-radius: 50px;
                cursor: pointer;
                z-index: 99999;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            `;

            btn.addEventListener('mouseover', () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
            });

            btn.addEventListener('mouseout', () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
            });

            btn.addEventListener('click', () => this.showWeaponStatsPanel());
            document.body.appendChild(btn);

            console.log('武器统计按钮创建成功');
        },

        // 显示武器统计面板
        showWeaponStatsPanel: function() {
            console.log('显示武器统计面板...');

            // 移除现有的面板
            const existingPanel = document.getElementById('weapon-stats-panel');
            if (existingPanel) {
                console.log('移除已存在的面板');
                existingPanel.remove();
            }

            const panel = document.createElement('div');
            panel.id = 'weapon-stats-panel';
            panel.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 99998;
                font-family: 'Microsoft YaHei', Arial, sans-serif;
                font-size: 14px;
                width: 500px;
                max-height: 700px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.6);
                border: 2px solid #FF5722;
                overflow-y: auto;
                backdrop-filter: blur(5px);
            `;

            panel.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
                    <div style="font-size: 16px; font-weight: bold; color: #FF5722;">🔫 武器统计与缓存（增强版）</div>
                    <button id="close-weapon-panel-btn" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px; line-height: 20px; border-radius: 50%;">×</button>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="color: #FF9800; font-size: 13px; margin-bottom: 8px;">当前页面武器数据</div>

                    <div id="current-weapons-info" style="background: rgba(255, 87, 34, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>找到武器:</span>
                            <span id="weapons-count" style="color: #4CAF50; font-weight: bold;">0</span>
                        </div>
                        <div style="margin-top: 5px; color: #aaa; font-size: 11px;">
                            请确保在武器统计页面使用此功能
                        </div>
                    </div>

                    <button id="analyze-weapons-btn" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #FF5722, #E64A19); color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; margin-bottom: 10px; font-size: 14px;">
                        🔍 分析当前武器
                    </button>

                    <div style="color: #FF9800; font-size: 13px; margin: 15px 0 8px 0;">缓存操作</div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <button id="save-cache-btn" style="padding: 10px; background: linear-gradient(135deg, #4CAF50, #2E7D32); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                            💾 保存当前缓存
                        </button>
                        <button id="compare-cache-btn" style="padding: 10px; background: linear-gradient(135deg, #2196F3, #1976D2); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                            🔄 对比缓存
                        </button>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <button id="export-cache-btn" style="padding: 10px; background: linear-gradient(135deg, #9C27B0, #7B1FA2); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                            📤 导出缓存
                        </button>
                        <button id="import-cache-btn" style="padding: 10px; background: linear-gradient(135deg, #009688, #00796B); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                            📥 导入缓存
                        </button>
                    </div>

                    <div style="color: #FF9800; font-size: 13px; margin-bottom: 8px;">缓存管理</div>

                    <div id="cache-list" style="max-height: 200px; overflow-y: auto; margin-bottom: 15px; font-size: 12px;">
                        <div style="color: #aaa; text-align: center; padding: 10px;">加载中...</div>
                    </div>

                    <div id="cache-controls" style="display: none;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button id="delete-selected-btn" style="padding: 8px; background: linear-gradient(135deg, #FF9800, #F57C00); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 11px;">
                                ✂️ 删除选中
                            </button>
                            <button id="clear-all-cache-btn" style="padding: 8px; background: linear-gradient(135deg, #FF5252, #D32F2F); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 11px;">
                                🚫 清空全部
                            </button>
                        </div>
                    </div>
                </div>

                <div id="weapon-analysis" style="display: none;">
                    <div style="color: #4CAF50; font-size: 13px; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">📊 武器数据</div>
                    <div id="weapons-data" style="font-size: 12px;"></div>
                </div>

                <div id="weapon-comparison" style="display: none;">
                    <div style="color: #2196F3; font-size: 13px; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">🔄 缓存对比</div>
                    <div id="comparison-data" style="font-size: 12px;"></div>
                </div>

                <div id="import-export-area" style="display: none;">
                    <div style="color: #9C27B0; font-size: 13px; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">📁 导入导出</div>
                    <div id="import-export-data" style="font-size: 12px;"></div>
                </div>

                <div id="weapon-error" style="display: none; color: #FF5252; font-size: 12px; margin-top: 10px; padding: 10px; background: rgba(255, 82, 82, 0.1); border-radius: 5px;"></div>

                <div id="weapon-loading" style="display: none; text-align: center; padding: 15px; color: #FF5722;">
                    <div style="margin-bottom: 5px;">⏳ 正在处理...</div>
                    <div style="font-size: 12px; color: #aaa;">请稍候</div>
                </div>
            `;

            document.body.appendChild(panel);
            console.log('武器统计面板创建成功');

            // 添加事件监听
            document.getElementById('close-weapon-panel-btn').addEventListener('click', () => {
                console.log('关闭面板');
                panel.remove();
            });

            document.getElementById('analyze-weapons-btn').addEventListener('click', () => {
                console.log('点击分析武器按钮');
                this.analyzeCurrentWeapons();
            });

            document.getElementById('save-cache-btn').addEventListener('click', () => {
                console.log('点击保存缓存按钮');
                this.saveCurrentCache();
            });

            document.getElementById('compare-cache-btn').addEventListener('click', () => {
                console.log('点击对比缓存按钮');
                this.showCacheComparison();
            });

            document.getElementById('export-cache-btn').addEventListener('click', () => {
                console.log('点击导出缓存按钮');
                this.exportCache();
            });

            document.getElementById('import-cache-btn').addEventListener('click', () => {
                console.log('点击导入缓存按钮');
                this.showImportCache();
            });

            document.getElementById('delete-selected-btn').addEventListener('click', () => {
                console.log('点击删除选中按钮');
                this.deleteSelectedCache();
            });

            // 添加清空全部按钮事件监听
            document.getElementById('clear-all-cache-btn').addEventListener('click', () => {
                console.log('点击清空全部按钮');
                this.clearAllCache();
            });

            // 初始更新武器计数和缓存列表
            this.updateWeaponsCount();
            this.loadCacheList();
        },

        // 获取锁定状态
        getLockStates: function() {
            try {
                const lockStates = GM_getValue(this.LOCK_STATE_KEY, '{}');
                return JSON.parse(lockStates);
            } catch (e) {
                return {};
            }
        },

        // 设置锁定状态
        setLockState: function(cacheId, isLocked) {
            try {
                const lockStates = this.getLockStates();
                lockStates[cacheId] = isLocked;
                GM_setValue(this.LOCK_STATE_KEY, JSON.stringify(lockStates));
                console.log(`缓存 ${cacheId} 锁定状态: ${isLocked}`);
            } catch (e) {
                console.error('设置锁定状态失败:', e);
            }
        },

        // 检查是否锁定
        isCacheLocked: function(cacheId) {
            const lockStates = this.getLockStates();
            return lockStates[cacheId] === true;
        },

        // 更新武器计数
        updateWeaponsCount: function() {
            const weapons = this.extractWeaponsFromPage();
            const count = weapons.length;
            const countElement = document.getElementById('weapons-count');
            if (countElement) {
                countElement.textContent = count;

                const infoElement = document.getElementById('current-weapons-info');
                if (infoElement) {
                    if (count > 0) {
                        infoElement.style.background = 'rgba(76, 175, 80, 0.1)';
                    } else {
                        infoElement.style.background = 'rgba(255, 87, 34, 0.1)';
                    }
                }
            }
        },

        // 提取页面中的武器数据
        extractWeaponsFromPage: function() {
            const weapons = [];

            // 查找所有武器元素
            const weaponElements = document.querySelectorAll('.weapon-header');

            weaponElements.forEach(element => {
                try {
                    const weapon = this.parseWeaponElement(element);
                    if (weapon) {
                        weapons.push(weapon);
                    }
                } catch (e) {
                    console.log('解析武器元素失败:', e);
                }
            });

            return weapons;
        },

        // 解析武器元素
        parseWeaponElement: function(element) {
            // 武器名称
            const nameElement = element.querySelector('.weapon-name');
            const name = nameElement ? nameElement.textContent.trim() : '未知';

            // 武器段位和等级
            const tierElement = element.querySelector('.tier-value');
            const levelElement = element.querySelector('.level-value');
            const tier = tierElement ? tierElement.textContent.trim() : '未知';
            const level = levelElement ? levelElement.textContent.trim() : '未知';

            // 总淘汰数
            const totalKillsElement = element.querySelector('.stat-summary-row:nth-child(1) .stat-summary-value');
            let totalKills = 0;
            if (totalKillsElement) {
                const killsText = totalKillsElement.textContent.trim();
                totalKills = parseInt(killsText.replace(/,/g, '')) || 0;
            }

            // 最远淘汰距离
            const longestKillElement = element.querySelector('.stat-summary-row:nth-child(2) .stat-summary-value');
            let longestKill = '0m';
            if (longestKillElement) {
                longestKill = longestKillElement.textContent.trim();
            }

            // 武器图标
            const iconElement = element.querySelector('.weapon-icon');
            const iconUrl = iconElement ? iconElement.src : '';

            return {
                name: name,
                tier: tier,
                level: level,
                kills: totalKills,
                longestKill: longestKill,
                icon: iconUrl,
                timestamp: new Date().getTime()
            };
        },

        // 分析当前武器
        analyzeCurrentWeapons: function() {
            this.showLoading(true);
            const analysisElement = document.getElementById('weapon-analysis');
            const comparisonElement = document.getElementById('weapon-comparison');
            const importExportElement = document.getElementById('import-export-area');
            const errorElement = document.getElementById('weapon-error');

            if (analysisElement) analysisElement.style.display = 'none';
            if (comparisonElement) comparisonElement.style.display = 'none';
            if (importExportElement) importExportElement.style.display = 'none';
            if (errorElement) errorElement.style.display = 'none';

            setTimeout(() => {
                try {
                    const weapons = this.extractWeaponsFromPage();

                    if (weapons.length === 0) {
                        this.showError('未找到武器数据，请确保在武器统计页面');
                        return;
                    }

                    this.displayWeaponsData(weapons);
                    this.showLoading(false);
                    if (analysisElement) analysisElement.style.display = 'block';
                } catch (error) {
                    this.showError(`分析失败: ${error.message}`);
                    this.showLoading(false);
                }
            }, 100);
        },

        // 显示武器数据
        displayWeaponsData: function(weapons) {
            const container = document.getElementById('weapons-data');
            if (!container) return;

            // 按击杀数排序
            const sortedWeapons = weapons.sort((a, b) => b.kills - a.kills);
            const totalKills = sortedWeapons.reduce((sum, w) => sum + w.kills, 0);

            let html = `
                <div style="background: rgba(76, 175, 80, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>武器总数:</span>
                        <span style="color: #4CAF50; font-weight: bold;">${weapons.length}把</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>总击杀数:</span>
                        <span style="color: #FF5722; font-weight: bold;">${totalKills.toLocaleString()}</span>
                    </div>
                    <div style="font-size: 11px; color: #aaa; margin-top: 5px;">
                        🕒 统计时间: ${new Date().toLocaleString('zh-CN')}
                    </div>
                </div>
            `;

            sortedWeapons.forEach((weapon, index) => {
                const isTop3 = index < 3;
                const rank = index + 1;

                html += `
                    <div style="background: ${isTop3 ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 152, 0, 0.1)'}; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            ${weapon.icon ? `<img src="${weapon.icon}" style="width: 32px; height: 32px; border-radius: 4px;">` : ''}
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 5px;">
                                    <span style="font-size: 11px; color: #aaa;">#${rank}</span>
                                    <span style="font-weight: bold; color: ${isTop3 ? '#FFD700' : '#FF9800'};">${weapon.name}</span>
                                </div>
                                <div style="font-size: 11px; color: #aaa;">${weapon.tier} · ${weapon.level}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 16px; font-weight: bold; color: #FF5722;">${weapon.kills.toLocaleString()}</div>
                                <div style="font-size: 10px; color: #aaa;">总淘汰</div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa;">
                            <div>最远击杀: <span style="color: #2196F3;">${weapon.longestKill}</span></div>
                            <div>占比: <span style="color: #4CAF50;">${totalKills > 0 ? ((weapon.kills / totalKills * 100).toFixed(1)) : '0'}%</span></div>
                        </div>
                    </div>
                `;
            });

            // 添加总结
            html += `
                <div style="background: rgba(76, 175, 80, 0.1); padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 11px;">
                    <div style="color: #4CAF50; margin-bottom: 5px;">📊 数据总结</div>
                    <div>• 最高击杀武器: <span style="color: #FFD700;">${sortedWeapons[0]?.name || '无'}</span> (${sortedWeapons[0]?.kills.toLocaleString() || 0} 击杀)</div>
                    <div>• 平均每把武器击杀: <span style="color: #FF5722;">${(totalKills / weapons.length).toFixed(0)}</span></div>
                    <div>• 前3名武器占比: <span style="color: #2196F3;">${totalKills > 0 ? ((sortedWeapons.slice(0, 3).reduce((sum, w) => sum + w.kills, 0) / totalKills * 100).toFixed(1)) : '0'}%</span></div>
                </div>
            `;

            container.innerHTML = html;
        },

        // 保存当前缓存
        saveCurrentCache: function() {
            this.showLoading(true);

            setTimeout(() => {
                try {
                    const weapons = this.extractWeaponsFromPage();

                    if (weapons.length === 0) {
                        this.showError('没有找到武器数据，无法保存缓存');
                        return;
                    }

                    // 创建缓存数据 - 添加默认名称
                    const cacheData = {
                        weapons: weapons,
                        date: new Date().toLocaleString('zh-CN'),
                        timestamp: new Date().getTime(),
                        totalKills: weapons.reduce((sum, w) => sum + w.kills, 0),
                        weaponCount: weapons.length,
                        name: `武器缓存 ${new Date().toLocaleDateString('zh-CN')}`  // 添加默认名称
                    };

                    // 生成缓存ID
                    const cacheId = `weapon_cache_${Date.now()}`;

                    // 保存到Tampermonkey存储
                    GM_setValue(cacheId, JSON.stringify(cacheData));

                    // 管理缓存数量（最多15个）
                    this.manageCacheLimit();

                    // 重新加载缓存列表
                    this.loadCacheList();

                    // 显示成功消息
                    this.showError(`✅ 缓存保存成功！ (${new Date().toLocaleDateString('zh-CN')})`, false);

                    this.showLoading(false);
                } catch (error) {
                    this.showError(`保存失败: ${error.message}`);
                    this.showLoading(false);
                }
            }, 100);
        },

        // 管理缓存数量限制
        manageCacheLimit: function() {
            try {
                const allCacheIds = GM_listValues().filter(key => key.startsWith('weapon_cache_') && key !== this.LOCK_STATE_KEY);

                if (allCacheIds.length > 15) {
                    // 按时间戳排序，删除最旧的未锁定缓存
                    const sortedCaches = allCacheIds.map(id => {
                        const data = JSON.parse(GM_getValue(id, '{}'));
                        return {
                            id: id,
                            timestamp: data.timestamp || 0,
                            isLocked: this.isCacheLocked(id)
                        };
                    }).sort((a, b) => a.timestamp - b.timestamp);

                    // 只删除未锁定的缓存
                    const cachesToDelete = [];
                    let unlockedCount = sortedCaches.filter(cache => !cache.isLocked).length;

                    for (const cache of sortedCaches) {
                        if (!cache.isLocked && unlockedCount > 15) {
                            cachesToDelete.push(cache);
                            unlockedCount--;
                        }
                    }

                    // 删除最旧的未锁定缓存，保留至少15个
                    cachesToDelete.forEach(cache => {
                        GM_deleteValue(cache.id);
                        // 也删除锁定状态
                        this.setLockState(cache.id, false);
                    });

                    if (cachesToDelete.length > 0) {
                        console.log(`删除了 ${cachesToDelete.length} 个旧缓存`);
                    }
                }
            } catch (error) {
                console.error('管理缓存失败:', error);
            }
        },

        // 加载缓存列表
        loadCacheList: function() {
            try {
                const container = document.getElementById('cache-list');
                if (!container) return;

                // 修改这里：排除锁定状态的存储键
                const allCacheIds = GM_listValues().filter(key =>
                    key.startsWith('weapon_cache_') &&
                    key !== this.LOCK_STATE_KEY  // 排除锁定状态键
                );

                if (allCacheIds.length === 0) {
                    container.innerHTML = '<div style="color: #aaa; text-align: center; padding: 10px;">暂无缓存数据</div>';
                    const controls = document.getElementById('cache-controls');
                    if (controls) controls.style.display = 'none';
                    return;
                }

                let html = '';

                // 按时间戳倒序排列（最新的在前面）
                const sortedCacheIds = allCacheIds.map(id => {
                    const data = JSON.parse(GM_getValue(id, '{}'));
                    return {
                        id: id,
                        timestamp: data.timestamp || 0,
                        date: data.date || '未知日期',
                        weaponCount: data.weaponCount || 0,
                        totalKills: data.totalKills || 0,
                        name: data.name || `武器缓存 ${new Date(data.timestamp).toLocaleDateString('zh-CN')}`,
                        isLocked: this.isCacheLocked(id)
                    };
                }).sort((a, b) => b.timestamp - a.timestamp);

                sortedCacheIds.forEach((cache, index) => {
                    const date = new Date(cache.timestamp);
                    const dateStr = date.toLocaleDateString('zh-CN');
                    const timeStr = date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});

                    html += `
                        <div style="background: ${cache.isLocked ? 'rgba(255, 193, 7, 0.2)' : 'rgba(66, 165, 245, 0.1)'}; padding: 8px; border-radius: 5px; margin-bottom: 5px; cursor: pointer; border-left: 3px solid ${cache.isLocked ? '#FFC107' : '#42A5F5'};">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" class="cache-checkbox" data-cache-id="${cache.id}" data-locked="${cache.isLocked}" style="margin: 0;">
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <!-- 添加可点击的名称 -->
                                            <span class="cache-name" data-cache-id="${cache.id}" style="font-weight: bold; color: ${cache.isLocked ? '#FFC107' : '#FF9800'}; cursor: pointer; padding: 2px 5px; border-radius: 3px; transition: background 0.2s;">
                                                ${cache.name}
                                            </span>
                                            ${cache.isLocked ? '<span style="font-size: 10px; color: #FFC107; margin-left: 5px;">🔒 已锁定</span>' : ''}
                                        </div>
                                        <span style="font-size: 11px; color: #4CAF50;">${cache.weaponCount}把武器</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-top: 3px;">
                                        <span>${dateStr} ${timeStr}</span>
                                        <span>${cache.totalKills.toLocaleString()} 击杀</span>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 5px;">
                                    <button class="lock-cache-btn" data-cache-id="${cache.id}" data-locked="${cache.isLocked}" style="background: transparent; border: none; color: ${cache.isLocked ? '#FFC107' : '#aaa'}; cursor: pointer; font-size: 12px; padding: 2px 5px;">
                                        ${cache.isLocked ? '🔓 解锁' : '🔒 锁定'}
                                    </button>
                                    <button class="delete-single-cache-btn" data-cache-id="${cache.id}" style="background: transparent; border: none; color: #FF5252; cursor: pointer; font-size: 12px; padding: 2px 5px;" ${cache.isLocked ? 'disabled' : ''}>
                                        🗑️ 删除
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });

                container.innerHTML = html;
                const controls = document.getElementById('cache-controls');
                if (controls) controls.style.display = 'block';

                // 添加复选框事件
                document.querySelectorAll('.cache-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', function() {
                        const parent = this.closest('div[style*="background: rgba"]');
                        const isLocked = this.dataset.locked === 'true';

                        if (this.checked) {
                            parent.style.background = 'rgba(255, 152, 0, 0.2)';
                        } else {
                            if (isLocked) {
                                parent.style.background = 'rgba(255, 193, 7, 0.2)';
                            } else {
                                parent.style.background = 'rgba(66, 165, 245, 0.1)';
                            }
                        }
                    });
                });

                // 添加缓存名称点击事件（重命名功能）
                document.querySelectorAll('.cache-name').forEach(nameElement => {
                    nameElement.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const cacheId = nameElement.dataset.cacheId;
                        this.renameCache(cacheId);
                    });

                    // 添加鼠标悬停效果
                    nameElement.addEventListener('mouseover', function() {
                        this.style.background = 'rgba(255, 152, 0, 0.2)';
                    });

                    nameElement.addEventListener('mouseout', function() {
                        this.style.background = 'transparent';
                    });
                });

                // 添加锁定按钮事件
                document.querySelectorAll('.lock-cache-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const cacheId = btn.dataset.cacheId;
                        const isCurrentlyLocked = btn.dataset.locked === 'true';

                        if (isCurrentlyLocked) {
                            if (confirm('确定要解锁这个缓存吗？解锁后可以被删除。')) {
                                this.setLockState(cacheId, false);
                                this.loadCacheList();
                                this.showError('✅ 缓存已解锁', false);
                            }
                        } else {
                            this.setLockState(cacheId, true);
                            this.loadCacheList();
                            this.showError('✅ 缓存已锁定（不会被自动清理）', false);
                        }
                    });
                });

                // 添加单个删除按钮事件
                document.querySelectorAll('.delete-single-cache-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const cacheId = btn.dataset.cacheId;

                        if (this.isCacheLocked(cacheId)) {
                            this.showError('❌ 此缓存已被锁定，请先解锁再删除');
                            return;
                        }

                        if (confirm('确定要删除这个缓存吗？此操作不可恢复！')) {
                            try {
                                GM_deleteValue(cacheId);
                                this.setLockState(cacheId, false); // 清除锁定状态
                                this.loadCacheList();
                                this.showError('✅ 缓存已删除', false);
                            } catch (error) {
                                this.showError(`删除失败: ${error.message}`);
                            }
                        }
                    });
                });

            } catch (error) {
                console.error('加载缓存列表失败:', error);
            }
        },

        // 重命名缓存
        renameCache: function(cacheId) {
            try {
                // 获取当前缓存数据
                const data = JSON.parse(GM_getValue(cacheId, '{}'));
                const currentName = data.name || `武器缓存 ${new Date(data.timestamp).toLocaleDateString('zh-CN')}`;

                // 显示重命名对话框
                const newName = prompt('请输入新的缓存名称:', currentName);

                if (newName === null) {
                    return; // 用户取消
                }

                if (newName.trim() === '') {
                    this.showError('缓存名称不能为空');
                    return;
                }

                // 更新缓存数据
                data.name = newName.trim();
                GM_setValue(cacheId, JSON.stringify(data));

                // 重新加载缓存列表
                this.loadCacheList();

                this.showError('✅ 缓存名称已更新', false);

            } catch (error) {
                console.error('重命名缓存失败:', error);
                this.showError(`重命名失败: ${error.message}`);
            }
        },
        // 删除选中的缓存
        deleteSelectedCache: function() {
            try {
                // 修改这里：只删除未锁定的选中缓存
                const selectedCaches = Array.from(document.querySelectorAll('.cache-checkbox:checked'))
                    .map(checkbox => ({
                        id: checkbox.dataset.cacheId,
                        isLocked: checkbox.dataset.locked === 'true'
                    }))
                    .filter(cache => !cache.isLocked)
                    .map(cache => cache.id);

                if (selectedCaches.length === 0) {
                    this.showError('请先选择要删除的缓存（已锁定的缓存不可删除）');
                    return;
                }

                if (!confirm(`确定要删除选中的 ${selectedCaches.length} 个缓存吗？此操作不可恢复！`)) {
                    return;
                }

                // 遍历删除每个选中的缓存
                let deletedCount = 0;
                selectedCaches.forEach(cacheId => {
                    try {
                        if (!this.isCacheLocked(cacheId)) {
                            GM_deleteValue(cacheId);
                            this.setLockState(cacheId, false); // 清除锁定状态
                            console.log(`已删除缓存: ${cacheId}`);
                            deletedCount++;
                        }
                    } catch (e) {
                        console.error(`删除缓存 ${cacheId} 失败:`, e);
                    }
                });

                // 重新加载缓存列表
                this.loadCacheList();

                // 显示成功消息
                this.showError(`✅ 已删除 ${deletedCount} 个缓存`, false);

            } catch (error) {
                console.error('删除缓存失败:', error);
                this.showError(`删除失败: ${error.message}`);
            }
        },

        // 清空所有缓存（保留锁定缓存）
        clearAllCache: function() {
            try {
                if (!confirm('确定要清空所有未锁定的缓存吗？此操作不可恢复！')) {
                    return;
                }

                const allCacheIds = GM_listValues().filter(key =>
                    key.startsWith('weapon_cache_') &&
                    key !== this.LOCK_STATE_KEY
                );

                if (allCacheIds.length === 0) {
                    this.showError('没有可清除的缓存');
                    return;
                }

                let deletedCount = 0;
                let skippedCount = 0;

                // 只删除未锁定的缓存
                allCacheIds.forEach(cacheId => {
                    if (!this.isCacheLocked(cacheId)) {
                        try {
                            GM_deleteValue(cacheId);
                            // 清除锁定状态
                            this.setLockState(cacheId, false);
                            deletedCount++;
                        } catch (e) {
                            console.error(`删除缓存 ${cacheId} 失败:`, e);
                        }
                    } else {
                        skippedCount++;
                    }
                });

                // 重新加载缓存列表
                this.loadCacheList();

                // 显示结果
                let message = `✅ 缓存已清空！`;
                message += `<br>• 已删除: ${deletedCount} 个缓存`;
                message += `<br>• 已跳过: ${skippedCount} 个（已锁定）`;

                this.showError(message, false);

            } catch (error) {
                console.error('清空缓存失败:', error);
                this.showError(`清空缓存失败: ${error.message}`);
            }
        },

        // 导出缓存
        exportCache: function() {
            this.showLoading(true);

            setTimeout(() => {
                try {
                    const allCacheIds = GM_listValues().filter(key =>
                        key.startsWith('weapon_cache_') &&
                        key !== this.LOCK_STATE_KEY
                    );

                    if (allCacheIds.length === 0) {
                        this.showError('没有缓存数据可以导出');
                        return;
                    }

                    // 获取所有缓存数据
                    const exportData = {};
                    const lockStates = this.getLockStates();

                    allCacheIds.forEach(cacheId => {
                        const data = GM_getValue(cacheId);
                        if (data) {
                            const parsedData = JSON.parse(data);
                            exportData[cacheId] = {
                                data: parsedData,
                                locked: lockStates[cacheId] || false
                            };
                        }
                    });

                    // 转换为JSON字符串
                    const exportString = JSON.stringify(exportData, null, 2);

                    // 创建导出界面
                    this.showExportData(exportString);

                    this.showLoading(false);
                } catch (error) {
                    this.showError(`导出失败: ${error.message}`);
                    this.showLoading(false);
                }
            }, 100);
        },

        // 显示导出数据
        showExportData: function(exportString) {
            const analysisElement = document.getElementById('weapon-analysis');
            const comparisonElement = document.getElementById('weapon-comparison');
            const importExportElement = document.getElementById('import-export-area');
            const importExportData = document.getElementById('import-export-data');

            if (analysisElement) analysisElement.style.display = 'none';
            if (comparisonElement) comparisonElement.style.display = 'none';
            if (importExportElement) importExportElement.style.display = 'block';

            if (importExportData) {
                const cacheCount = Object.keys(JSON.parse(exportString)).length;

                importExportData.innerHTML = `
                    <div style="background: rgba(156, 39, 176, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                        <div style="color: #9C27B0; font-size: 13px; margin-bottom: 10px;">📤 导出数据</div>
                        <div style="font-size: 11px; color: #aaa; margin-bottom: 10px;">
                            共导出 ${cacheCount} 个缓存
                        </div>
                        <textarea id="export-textarea" style="width: 100%; height: 200px; background: rgba(0, 0, 0, 0.5); color: white; border: 1px solid #9C27B0; border-radius: 5px; padding: 10px; font-family: monospace; font-size: 11px; resize: vertical;">${exportString}</textarea>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                            <button id="copy-export-btn" style="padding: 10px; background: linear-gradient(135deg, #9C27B0, #7B1FA2); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                📋 复制到剪贴板
                            </button>
                            <button id="download-export-btn" style="padding: 10px; background: linear-gradient(135deg, #009688, #00796B); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                ⬇️ 下载文件
                            </button>
                        </div>
                        <div style="font-size: 11px; color: #aaa; margin-top: 10px;">
                            💡 提示：保存好导出的数据，可用于在不同设备间同步
                        </div>
                    </div>
                `;

                // 添加复制按钮事件
                document.getElementById('copy-export-btn').addEventListener('click', () => {
                    const textarea = document.getElementById('export-textarea');
                    textarea.select();
                    try {
                        if (typeof GM_setClipboard !== 'undefined') {
                            GM_setClipboard(textarea.value);
                            this.showError('✅ 已复制到剪贴板', false);
                        } else if (document.execCommand('copy')) {
                            this.showError('✅ 已复制到剪贴板', false);
                        } else {
                            this.showError('❌ 复制失败，请手动复制');
                        }
                    } catch (e) {
                        console.error('复制失败:', e);
                        this.showError('❌ 复制失败，请手动复制');
                    }
                });

                // 添加下载按钮事件
                document.getElementById('download-export-btn').addEventListener('click', () => {
                    try {
                        const textarea = document.getElementById('export-textarea');
                        const dataStr = textarea.value;
                        const dateStr = new Date().toISOString().split('T')[0];
                        const fileName = `pubg_weapon_cache_${dateStr}.json`;

                        const blob = new Blob([dataStr], {type: 'application/json'});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        this.showError('✅ 文件下载成功', false);
                    } catch (e) {
                        console.error('下载失败:', e);
                        this.showError('❌ 下载失败');
                    }
                });
            }
        },

        // 显示导入缓存界面
        showImportCache: function() {
            const analysisElement = document.getElementById('weapon-analysis');
            const comparisonElement = document.getElementById('weapon-comparison');
            const importExportElement = document.getElementById('import-export-area');
            const importExportData = document.getElementById('import-export-data');

            if (analysisElement) analysisElement.style.display = 'none';
            if (comparisonElement) comparisonElement.style.display = 'none';
            if (importExportElement) importExportElement.style.display = 'block';

            if (importExportData) {
                importExportData.innerHTML = `
                    <div style="background: rgba(0, 150, 136, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                        <div style="color: #009688; font-size: 13px; margin-bottom: 10px;">📥 导入缓存数据</div>

                        <div style="font-size: 11px; color: #aaa; margin-bottom: 10px;">
                            请粘贴之前导出的缓存数据，或选择JSON文件：
                        </div>

                        <textarea id="import-textarea" placeholder="请粘贴导出的JSON数据..." style="width: 100%; height: 150px; background: rgba(0, 0, 0, 0.5); color: white; border: 1px solid #009688; border-radius: 5px; padding: 10px; font-family: monospace; font-size: 11px; resize: vertical;"></textarea>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; margin-bottom: 15px;">
                            <button id="browse-file-btn" style="padding: 10px; background: linear-gradient(135deg, #607D8B, #455A64); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                📁 选择文件
                            </button>
                            <input type="file" id="import-file-input" accept=".json" style="display: none;">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button id="import-data-btn" style="padding: 10px; background: linear-gradient(135deg, #009688, #00796B); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                ✅ 导入数据
                            </button>
                            <button id="cancel-import-btn" style="padding: 10px; background: linear-gradient(135deg, #757575, #616161); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                ❌ 取消
                            </button>
                        </div>

                        <div style="font-size: 11px; color: #aaa; margin-top: 10px;">
                            ⚠️ 注意：导入时会保留原有的缓存名称和锁定状态
                        </div>
                    </div>
                `;

                // 添加文件选择按钮事件
                document.getElementById('browse-file-btn').addEventListener('click', () => {
                    document.getElementById('import-file-input').click();
                });

                // 添加文件输入事件
                document.getElementById('import-file-input').addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                const content = event.target.result;
                                document.getElementById('import-textarea').value = content;
                            } catch (error) {
                                this.showError('❌ 读取文件失败');
                            }
                        };
                        reader.readAsText(file);
                    }
                });

                // 添加导入按钮事件
                document.getElementById('import-data-btn').addEventListener('click', () => {
                    this.importCacheData();
                });

                // 添加取消按钮事件
                document.getElementById('cancel-import-btn').addEventListener('click', () => {
                    importExportElement.style.display = 'none';
                });
            }
        },

        // 导入缓存数据
        importCacheData: function() {
            this.showLoading(true);

            setTimeout(() => {
                try {
                    const textarea = document.getElementById('import-textarea');
                    const importData = textarea.value.trim();

                    if (!importData) {
                        this.showError('请输入要导入的数据');
                        return;
                    }

                    // 解析导入数据
                    const parsedData = JSON.parse(importData);

                    if (typeof parsedData !== 'object' || parsedData === null) {
                        this.showError('导入数据格式不正确');
                        return;
                    }

                    // 统计信息
                    let importedCount = 0;
                    let skippedCount = 0;
                    let lockedCount = 0;

                    // 导入缓存
                    Object.entries(parsedData).forEach(([cacheId, cacheInfo]) => {
                        try {
                            // 检查是否已存在
                            const existingData = GM_getValue(cacheId);
                            if (existingData) {
                                skippedCount++;
                                return;
                            }

                            // 保存缓存数据（包含名称信息）
                            GM_setValue(cacheId, JSON.stringify(cacheInfo.data));

                            // 保存锁定状态
                            if (cacheInfo.locked) {
                                this.setLockState(cacheId, true);
                                lockedCount++;
                            }

                            importedCount++;
                        } catch (e) {
                            console.error(`导入缓存 ${cacheId} 失败:`, e);
                            skippedCount++;
                        }
                    });

                    // 重新加载缓存列表
                    this.loadCacheList();

                    // 显示导入结果
                    let message = `✅ 导入完成！<br>`;
                    message += `• 成功导入: ${importedCount} 个缓存<br>`;
                    message += `• 已跳过: ${skippedCount} 个（已存在）<br>`;
                    if (lockedCount > 0) {
                        message += `• 已锁定: ${lockedCount} 个缓存<br>`;
                    }
                    message += `• 缓存名称已保留`;

                    this.showError(message, false);
                    this.showLoading(false);

                } catch (error) {
                    this.showError(`导入失败: ${error.message}`);
                    this.showLoading(false);
                }
            }, 100);
        },

        // 显示缓存对比
        showCacheComparison: function() {
            this.showLoading(true);
            const analysisElement = document.getElementById('weapon-analysis');
            const comparisonElement = document.getElementById('weapon-comparison');
            const importExportElement = document.getElementById('import-export-area');
            const errorElement = document.getElementById('weapon-error');

            if (analysisElement) analysisElement.style.display = 'none';
            if (comparisonElement) comparisonElement.style.display = 'none';
            if (importExportElement) importExportElement.style.display = 'none';
            if (errorElement) errorElement.style.display = 'none';

            setTimeout(() => {
                try {
                    // 修改这里：允许选中所有缓存，包括锁定的
                    const selectedCaches = Array.from(document.querySelectorAll('.cache-checkbox:checked'))
                        .map(checkbox => checkbox.dataset.cacheId);

                    if (selectedCaches.length < 2) {
                        this.showError('请至少选择2个缓存进行对比');
                        return;
                    }

                    // 获取缓存数据
                    const cacheDataList = selectedCaches.map(cacheId => {
                        const data = JSON.parse(GM_getValue(cacheId, '{}'));
                        return {
                            id: cacheId,
                            ...data
                        };
                    }).filter(data => data.weapons); // 只保留有武器数据的缓存

                    if (cacheDataList.length < 2) {
                        this.showError('选中的缓存数据不完整，无法对比');
                        return;
                    }

                    // 按时间排序
                    cacheDataList.sort((a, b) => a.timestamp - b.timestamp);

                    // 进行对比分析
                    this.displayCacheComparison(cacheDataList);

                    this.showLoading(false);
                    if (comparisonElement) comparisonElement.style.display = 'block';
                } catch (error) {
                    this.showError(`对比失败: ${error.message}`);
                    this.showLoading(false);
                }
            }, 100);
        },

        // 显示缓存对比结果
        displayCacheComparison: function(cacheDataList) {
            const container = document.getElementById('comparison-data');
            if (!container) return;

            // 最早的缓存和最晚的缓存
            const oldCache = cacheDataList[0];
            const newCache = cacheDataList[cacheDataList.length - 1];

            // 创建武器映射
            const oldWeaponsMap = {};
            oldCache.weapons.forEach(weapon => {
                oldWeaponsMap[weapon.name] = weapon;
            });

            const newWeaponsMap = {};
            newCache.weapons.forEach(weapon => {
                newWeaponsMap[weapon.name] = weapon;
            });

            // 计算增长
            const growthData = [];
            const allWeaponNames = new Set([
                ...Object.keys(oldWeaponsMap),
                ...Object.keys(newWeaponsMap)
            ]);

            allWeaponNames.forEach(weaponName => {
                const oldKills = oldWeaponsMap[weaponName]?.kills || 0;
                const newKills = newWeaponsMap[weaponName]?.kills || 0;
                const growth = newKills - oldKills;

                growthData.push({
                    name: weaponName,
                    oldKills: oldKills,
                    newKills: newKills,
                    growth: growth,
                    growthRate: oldKills > 0 ? ((growth / oldKills) * 100) : growth > 0 ? 100 : 0,
                    icon: newWeaponsMap[weaponName]?.icon || oldWeaponsMap[weaponName]?.icon
                });
            });

            // 按增长数排序
            growthData.sort((a, b) => b.growth - a.growth);

            // 计算总增长
            const totalOldKills = oldCache.totalKills || 0;
            const totalNewKills = newCache.totalKills || 0;
            const totalGrowth = totalNewKills - totalOldKills;
            const totalGrowthRate = totalOldKills > 0 ? ((totalGrowth / totalOldKills) * 100) : totalGrowth > 0 ? 100 : 0;

            let html = `
                <div style="background: rgba(66, 165, 245, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                    <div style="color: #2196F3; font-size: 13px; margin-bottom: 10px; border-bottom: 1px solid rgba(33, 150, 243, 0.3); padding-bottom: 5px;">📅 对比范围</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <div>
                            <div style="font-size: 11px; color: #aaa;">开始时间</div>
                            <div style="font-weight: bold; color: #FF9800;">${oldCache.name || oldCache.date || '未知'}</div>
                            <div style="font-size: 11px; color: #aaa;">${oldCache.weaponCount || 0}把武器</div>
                            <div style="font-size: 11px; color: #FF5722;">${totalOldKills.toLocaleString()} 击杀</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: #aaa;">结束时间</div>
                            <div style="font-weight: bold; color: #4CAF50;">${newCache.name || newCache.date || '未知'}</div>
                            <div style="font-size: 11px; color: #aaa;">${newCache.weaponCount || 0}把武器</div>
                            <div style="font-size: 11px; color: #FF5722;">${totalNewKills.toLocaleString()} 击杀</div>
                        </div>
                    </div>
                    <div style="text-align: center; font-size: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <div style="color: #aaa;">总击杀增长:</div>
                        <div style="font-size: 18px; font-weight: bold; color: ${totalGrowth >= 0 ? '#4CAF50' : '#FF5252'};">${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toLocaleString()}</div>
                        <div style="font-size: 11px; color: #aaa;">增长率: ${totalGrowthRate.toFixed(1)}%</div>
                    </div>
                </div>

                <div style="color: #FF9800; font-size: 13px; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">📈 武器增长排行</div>
            `;

            // 显示增长最多的武器
            const topGrowthWeapons = growthData.filter(w => w.growth > 0).slice(0, 10);

            if (topGrowthWeapons.length === 0) {
                html += '<div style="color: #aaa; text-align: center; padding: 10px;">无增长数据</div>';
            } else {
                topGrowthWeapons.forEach((weapon, index) => {
                    const isTop3 = index < 3;

                    html += `
                        <div style="background: ${isTop3 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)'}; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                ${weapon.icon ? `<img src="${weapon.icon}" style="width: 32px; height: 32px; border-radius: 4px;">` : ''}
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 5px;">
                                        <span style="font-size: 11px; color: #aaa;">#${index + 1}</span>
                                        <span style="font-weight: bold; color: ${isTop3 ? '#4CAF50' : '#FF9800'};">${weapon.name}</span>
                                    </div>
                                    <div style="font-size: 11px; color: #aaa;">
                                        ${weapon.oldKills.toLocaleString()} → ${weapon.newKills.toLocaleString()}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 16px; font-weight: bold; color: ${weapon.growth >= 0 ? '#4CAF50' : '#FF5252'};">${weapon.growth >= 0 ? '+' : ''}${weapon.growth.toLocaleString()}</div>
                                    <div style="font-size: 10px; color: #aaa;">增长</div>
                                </div>
                            </div>
                            <div style="font-size: 11px; color: #aaa; text-align: right;">
                                增长率: <span style="color: #2196F3;">${weapon.growthRate.toFixed(1)}%</span>
                            </div>
                        </div>
                    `;
                });
            }

            // 添加总结
            html += `
                <div style="background: rgba(76, 175, 80, 0.1); padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 11px;">
                    <div style="color: #4CAF50; margin-bottom: 5px;">📊 对比总结</div>
                    <div>• 时间跨度: ${Math.round((newCache.timestamp - oldCache.timestamp) / (1000 * 60 * 60 * 24))} 天</div>
                    <div>• 总击杀增长: <span style="color: ${totalGrowth >= 0 ? '#4CAF50' : '#FF5252'};">${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toLocaleString()}</span> (${totalGrowthRate.toFixed(1)}%)</div>
                    <div>• 增长最多的武器: <span style="color: #FF9800;">${topGrowthWeapons[0]?.name || '无'}</span> (${topGrowthWeapons[0]?.growth.toLocaleString() || 0} 击杀)</div>
                    <div>• 有增长的武器: <span style="color: #4CAF50;">${topGrowthWeapons.length}</span> 把</div>
                    <div>• 对比缓存: <span style="color: #2196F3;">${oldCache.name || '缓存1'}</span> ↔ <span style="color: #2196F3;">${newCache.name || '缓存2'}</span></div>
                </div>
            `;

            container.innerHTML = html;
        },

        // 显示加载状态
        showLoading: function(show) {
            const loadingElement = document.getElementById('weapon-loading');
            if (loadingElement) {
                loadingElement.style.display = show ? 'block' : 'none';
            }
        },

        // 显示错误信息
        showError: function(message, isError = true) {
            const errorElement = document.getElementById('weapon-error');
            if (errorElement) {
                // 支持HTML内容
                errorElement.innerHTML = message;
                errorElement.style.display = 'block';
                errorElement.style.color = isError ? '#FF5252' : '#4CAF50';
                errorElement.style.background = isError ? 'rgba(255, 82, 82, 0.1)' : 'rgba(76, 175, 80, 0.1)';

                // 3秒后自动隐藏
                if (!isError) {
                    setTimeout(() => {
                        errorElement.style.display = 'none';
                    }, 3000);
                }
            }
        },

        // 调试功能
        debugCacheSystem: function() {
            console.log('=== 缓存系统调试信息 ===');

            // 获取所有缓存
            const allValues = GM_listValues();
            console.log('所有存储的键:', allValues);

            const cacheKeys = allValues.filter(key => key.startsWith('weapon_cache_') && key !== this.LOCK_STATE_KEY);
            console.log('缓存键:', cacheKeys);

            // 检查每个缓存的状态
            cacheKeys.forEach(key => {
                try {
                    const data = GM_getValue(key);
                    if (data) {
                        const parsed = JSON.parse(data);
                        console.log(`缓存 ${key}:`, {
                            名称: parsed.name || '未命名',
                            时间: parsed.date || '未知',
                            武器数量: parsed.weaponCount || 0,
                            总击杀: parsed.totalKills || 0,
                            锁定状态: this.isCacheLocked(key)
                        });
                    } else {
                        console.log(`缓存 ${key}: 空数据`);
                    }
                } catch (e) {
                    console.log(`缓存 ${key}: 解析失败`, e);
                }
            });

            // 检查锁定状态
            console.log('锁定状态:', this.getLockStates());
            console.log('=== 调试结束 ===');
        }
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded: 初始化武器统计');
            WeaponStats.init();
        });
    } else {
        console.log('页面已加载: 直接初始化武器统计');
        WeaponStats.init();
    }

    // 添加页面观察器，动态检测内容变化
    let observer = null;
    setTimeout(() => {
        try {
            observer = new MutationObserver((mutations) => {
                // 检查按钮是否存在
                const existingBtn = document.getElementById('weapon-stats-btn');
                if (!existingBtn) {
                    console.log('检测到按钮消失，重新创建');
                    WeaponStats.createWeaponStatsButton();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            console.log('页面观察器已启动');
        } catch (e) {
            console.error('启动页面观察器失败:', e);
        }
    }, 3000);

    // 添加键盘快捷键
    document.addEventListener('keydown', (e) => {
        // Alt + W 打开武器统计面板
        if (e.altKey && e.key === 'w') {
            e.preventDefault();
            WeaponStats.showWeaponStatsPanel();
        }

        // Esc 关闭面板
        if (e.key === 'Escape') {
            const panel = document.getElementById('weapon-stats-panel');
            if (panel) {
                panel.remove();
            }
        }
    });

    // 添加全局样式
    GM_addStyle(`
        #weapon-stats-btn:hover {
            background: linear-gradient(135deg, #FF7043, #D84315) !important;
        }

        #weapon-stats-panel::-webkit-scrollbar {
            width: 8px;
        }

        #weapon-stats-panel::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        }

        #weapon-stats-panel::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #FF5722, #E64A19);
            border-radius: 4px;
        }

        #weapon-stats-panel::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #FF7043, #D84315);
        }

        .cache-checkbox {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }

        .cache-checkbox:checked {
            accent-color: #FF5722;
        }

        .cache-checkbox:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }

        .cache-name:hover {
            background: rgba(255, 152, 0, 0.3) !important;
        }

        .lock-cache-btn:hover {
            color: #FFC107 !important;
        }

        .delete-single-cache-btn:hover:not(:disabled) {
            color: #FF8A80 !important;
        }

        .delete-single-cache-btn:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }

        /* 重命名提示样式 */
        .cache-name-edit-hint {
            font-size: 10px !important;
            color: #aaa !important;
            margin-left: 5px !important;
            display: inline-block !important;
        }
    `);

    console.log('PUBG.plus武器统计脚本（增强版）加载完成！');

    // 添加手动触发函数（用于调试）
    window.showWeaponStats = () => {
        WeaponStats.showWeaponStatsPanel();
    };

    window.debugWeaponStats = () => {
        WeaponStats.debugCacheSystem();
    };

    window.checkButton = () => {
        const btn = document.getElementById('weapon-stats-btn');
        if (btn) {
            console.log('按钮存在，位置:', btn.style);
        } else {
            console.log('按钮不存在');
            WeaponStats.createWeaponStatsButton();
        }
    };

    // 添加重命名功能的快捷方式
    window.renameAllCaches = () => {
        const allCacheIds = GM_listValues().filter(key =>
            key.startsWith('weapon_cache_') &&
            key !== WeaponStats.LOCK_STATE_KEY
        );

        allCacheIds.forEach(cacheId => {
            setTimeout(() => {
                WeaponStats.renameCache(cacheId);
            }, 500);
        });
    };
})();
