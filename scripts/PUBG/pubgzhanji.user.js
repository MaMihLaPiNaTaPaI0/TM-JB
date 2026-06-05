// ==UserScript==
// @name         PUBG.plus战绩完整统计20260301
// @version      22.0
// @description  包含吃鸡数、排名统计和每日统计的pubg.plus战绩分析，新增存活时间筛选功能

// @match        https://pubg.plus/*
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/PUBG/pubgzhanji.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/PUBG/pubgzhanji.user.js

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

    console.log('PUBG.plus战绩完整统计已加载');

    // 存活时间筛选选项
    const SURVIVAL_FILTERS = {
        'all': '不限',
        '5min': '≥5分钟',
        '10min': '≥10分钟',
        '15min': '≥15分钟',
        '20min': '≥20分钟',
        '25min': '≥25分钟',
        '30min': '≥30分钟'
    };

    // 创建按钮
    function createButton() {
        if (document.getElementById('pubg-stats-extract-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'pubg-stats-extract-btn';
        btn.innerHTML = '🏆 战绩统计';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #333;
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

        btn.addEventListener('click', function() {
            showStatsPanel();
        });

        document.body.appendChild(btn);
    }

    // 创建面板
    function showStatsPanel() {
        // 移除现有的面板
        const existingPanel = document.getElementById('pubg-stats-panel');
        if (existingPanel) existingPanel.remove();

        const panel = document.createElement('div');
        panel.id = 'pubg-stats-panel';
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
            width: 550px;
            max-height: 750px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.6);
            border: 2px solid #FFD700;
            overflow-y: auto;
            backdrop-filter: blur(5px);
        `;

        // 获取日期
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        // 生成存活时间筛选选项
        let survivalOptions = '';
        for (const [value, label] of Object.entries(SURVIVAL_FILTERS)) {
            survivalOptions += `<option value="${value}">${label}</option>`;
        }

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
                <div style="font-size: 16px; font-weight: bold; color: #FFD700;">🏆 PUBG完整战绩统计</div>
                <button id="close-panel-btn" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px; line-height: 20px; border-radius: 50%;">×</button>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="color: #FF9800; font-size: 13px; margin-bottom: 5px;">统计设置</div>

                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <div style="flex: 1;">
                        <div style="font-size: 11px; color: #aaa; margin-bottom: 2px;">开始日期</div>
                        <input type="date" id="start-date" value="${formatDate(lastWeek)}" style="width: 100%; padding: 5px; background: #333; border: 1px solid #555; color: white; border-radius: 3px;">
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 11px; color: #aaa; margin-bottom: 2px;">结束日期</div>
                        <input type="date" id="end-date" value="${formatDate(today)}" style="width: 100%; padding: 5px; background: #333; border: 1px solid #555; color: white; border-radius: 3px;">
                    </div>
                </div>

                <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                    <button id="today-btn" style="flex: 1; padding: 8px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">今天</button>
                    <button id="yesterday-btn" style="flex: 1; padding: 8px; background: #673AB7; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">昨天</button>
                    <button id="week-btn" style="flex: 1; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">最近7天</button>
                </div>

                <div style="margin-top: 10px;">
                    <div style="font-size: 11px; color: #aaa; margin-bottom: 2px;">存活时间筛选</div>
                    <select id="survival-filter" style="width: 100%; padding: 5px; background: #333; border: 1px solid #555; color: white; border-radius: 3px;">
                        ${survivalOptions}
                    </select>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                    <button id="test-btn" style="flex: 1; padding: 10px; background: #9C27B0; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">🛠️ 测试</button>
                    <button id="simple-btn" style="flex: 1; padding: 10px; background: #FF9800; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">📅 页内统计</button>
                </div>

                <button id="extract-btn" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #FF9800, #F57C00); color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 14px;">📅 筛选统计</button>
            </div>

            <div id="loading" style="display: none; text-align: center; padding: 20px; color: #FFD700;">
                <div style="margin-bottom: 10px;">⏳ 正在解析战绩数据...</div>
                <div style="font-size: 12px; color: #aaa;">请稍候</div>
            </div>

            <div id="test-results" style="display: none;">
                <div style="color: #9C27B0; font-size: 13px; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">🔍 元素识别测试</div>
                <div id="test-content" style="font-size: 11px; background: rgba(156, 39, 176, 0.1); padding: 10px; border-radius: 5px; max-height: 300px; overflow-y: auto;"></div>
            </div>

            <div id="results" style="display: none;">
                <div style="color: #FFD700; font-size: 13px; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">📈 统计结果</div>
                <div id="stats-content" style="font-size: 12px; line-height: 1.6;"></div>
            </div>

            <div id="error" style="display: none; color: #FF5252; font-size: 12px; margin-top: 10px; padding: 10px; background: rgba(255, 82, 82, 0.1); border-radius: 5px;"></div>
        `;

        document.body.appendChild(panel);

        // 添加事件监听
        document.getElementById('close-panel-btn').addEventListener('click', () => {
            panel.remove();
        });

        document.getElementById('today-btn').addEventListener('click', () => {
            const today = new Date();
            document.getElementById('start-date').value = formatDate(today);
            document.getElementById('end-date').value = formatDate(today);
        });

        document.getElementById('yesterday-btn').addEventListener('click', () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            document.getElementById('start-date').value = formatDate(yesterday);
            document.getElementById('end-date').value = formatDate(yesterday);
        });

        document.getElementById('week-btn').addEventListener('click', () => {
            const today = new Date();
            const lastWeek = new Date(today);
            lastWeek.setDate(lastWeek.getDate() - 7);
            document.getElementById('start-date').value = formatDate(lastWeek);
            document.getElementById('end-date').value = formatDate(today);
        });

        document.getElementById('test-btn').addEventListener('click', testElementRecognition);
        document.getElementById('simple-btn').addEventListener('click', () => extractAndAnalyzeStats(true));
        document.getElementById('extract-btn').addEventListener('click', () => extractAndAnalyzeStats(false));
    }

    // 测试元素识别
    function testElementRecognition() {
        document.getElementById('test-results').style.display = 'block';
        document.getElementById('results').style.display = 'none';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'none';

        const testContent = document.getElementById('test-content');

        let html = '';

        // 1. 直接查找 .match-item 元素
        const matchItems = document.querySelectorAll('.match-item');
        html += `<div style="margin-bottom: 10px;"><strong>1. 查找 .match-item 元素:</strong> 找到 ${matchItems.length} 个</div>`;

        if (matchItems.length > 0) {
            html += `<div style="margin-bottom: 10px;">第一个元素的结构:</div>`;
            html += `<div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; margin-bottom: 10px; font-family: monospace; font-size: 10px; overflow-x: auto;">`;
            html += matchItems[0].outerHTML.substring(0, 800);
            if (matchItems[0].outerHTML.length > 800) html += '...';
            html += `</div>`;

            // 解析第一个元素
            const firstMatch = parseMatchItem(matchItems[0]);
            html += `<div style="background: rgba(76, 175, 80, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 10px;">`;
            html += `<strong>解析结果:</strong><br>`;
            html += `日期: ${firstMatch.date}<br>`;
            html += `时间: ${firstMatch.time}<br>`;
            html += `地图: ${firstMatch.map}<br>`;
            html += `排名: ${firstMatch.rank}<br>`;
            html += `总人数: ${firstMatch.totalPlayers}<br>`;
            html += `淘汰: ${firstMatch.kills}<br>`;
            html += `伤害: ${firstMatch.damage}<br>`;
            html += `存活时间: ${firstMatch.survival} (${firstMatch.survivalMinutes}分钟)<br>`;
            html += `模式: ${firstMatch.mode}<br>`;
            html += `</div>`;
        }

        // 2. 查找其他可能的元素
        html += `<div style="margin-bottom: 10px;"><strong>2. 其他查找方式:</strong></div>`;

        const byClass = document.querySelectorAll('[class*="match"]').length;
        const byVictory = document.querySelectorAll('.victory').length;
        const byRank = document.querySelectorAll('.match-rank').length;
        const byStats = document.querySelectorAll('.match-stats').length;

        html += `<div style="margin-bottom: 5px;">• 包含"match"的class: ${byClass} 个</div>`;
        html += `<div style="margin-bottom: 5px;">• .victory class: ${byVictory} 个</div>`;
        html += `<div style="margin-bottom: 5px;">• .match-rank class: ${byRank} 个</div>`;
        html += `<div style="margin-bottom: 10px;">• .match-stats class: ${byStats} 个</div>`;

        // 3. 显示所有找到的元素数量
        html += `<div style="margin-bottom: 10px;"><strong>3. 页面元素统计:</strong></div>`;
        html += `<div style="margin-bottom: 5px;">• 总div数量: ${document.querySelectorAll('div').length}</div>`;
        html += `<div style="margin-bottom: 5px;">• 总.match-item数量: ${matchItems.length}</div>`;
        html += `<div style="margin-bottom: 5px;">• 页面标题: ${document.title}</div>`;

        testContent.innerHTML = html;
    }

    // 将存活时间转换为分钟数
    function parseSurvivalTime(survivalText) {
        if (!survivalText || survivalText === '--:--') return 0;

        try {
            // 处理格式如 "15:23" 或 "1:30:45"
            const parts = survivalText.split(':');

            if (parts.length === 2) {
                // 格式: mm:ss
                const minutes = parseInt(parts[0]) || 0;
                const seconds = parseInt(parts[1]) || 0;
                return minutes + (seconds / 60);
            } else if (parts.length === 3) {
                // 格式: hh:mm:ss
                const hours = parseInt(parts[0]) || 0;
                const minutes = parseInt(parts[1]) || 0;
                const seconds = parseInt(parts[2]) || 0;
                return (hours * 60) + minutes + (seconds / 60);
            }
        } catch (e) {
            console.log('解析存活时间失败:', survivalText, e);
        }

        return 0;
    }

    // 检查是否满足存活时间筛选条件
    function meetsSurvivalFilter(survivalMinutes, filter) {
        if (filter === 'all') return true;

        const minTime = parseInt(filter.replace('min', ''));
        return survivalMinutes >= minTime;
    }

    // 解析单个战绩元素
    function parseMatchItem(element) {
        // 提取排名
        let rank = 0;
        let totalPlayers = 0;
        const rankElement = element.querySelector('.rank-number');
        const totalElement = element.querySelector('.rank-total');

        if (rankElement) {
            const rankText = rankElement.textContent.trim();
            const rankMatch = rankText.match(/#?\s*(\d+)/);
            if (rankMatch) {
                rank = parseInt(rankMatch[1]) || 0;
            }
        }

        if (totalElement) {
            const totalText = totalElement.textContent.trim();
            const totalMatch = totalText.match(/\/(\d+)/);
            if (totalMatch) {
                totalPlayers = parseInt(totalMatch[1]) || 0;
            }
        }

        // 提取日期和时间
        let date = '', time = '';
        const timeElement = element.querySelector('.match-time-small');
        if (timeElement) {
            const timeText = timeElement.textContent.trim();
            const timeMatch = timeText.match(/(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})/);
            if (timeMatch) {
                const month = parseInt(timeMatch[1]);
                const day = parseInt(timeMatch[2]);
                const hour = parseInt(timeMatch[3]);
                const minute = parseInt(timeMatch[4]);

                if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    date = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                }
            }
        }

        // 提取地图
        let map = '未知';
        const mapElement = element.querySelector('.match-map');
        if (mapElement) {
            map = mapElement.textContent.trim();
        }

        // 提取模式
        let mode = '';
        const modeElement = element.querySelector('.match-type');
        if (modeElement) {
            mode = modeElement.textContent.trim();
        }

        // 提取存活时间
        let survival = '00:00';
        let survivalMinutes = 0;
        const surviveElement = element.querySelector('.survive-stat .match-stat-value');
        if (surviveElement) {
            survival = surviveElement.textContent.trim();
            survivalMinutes = parseSurvivalTime(survival);
        }

        // 提取伤害
        let damage = 0;
        const damageElement = element.querySelector('.damage-stat .match-stat-value');
        if (damageElement) {
            damage = parseInt(damageElement.textContent.trim()) || 0;
        }

        // 提取淘汰
        let kills = 0;
        const killElement = element.querySelector('.kill-stat .match-stat-value');
        if (killElement) {
            kills = parseInt(killElement.textContent.trim()) || 0;
        }

        return {
            date: date,  // MM-DD格式
            time: time,
            map: map,
            rank: rank,
            totalPlayers: totalPlayers,
            kills: kills,
            damage: damage,
            survival: survival,
            survivalMinutes: survivalMinutes,
            mode: mode,
            element: element
        };
    }

    // 检查日期是否在范围内（忽略年份）
    function isDateInRange(matchDate, startDate, endDate) {
        if (!matchDate || !startDate || !endDate) return false;

        // 将MM-DD格式转换为月份和日期
        const [matchMonth, matchDay] = matchDate.split('-').map(Number);

        // 将YYYY-MM-DD格式转换为月份和日期
        const startParts = startDate.split('-');
        const endParts = endDate.split('-');

        if (startParts.length < 2 || endParts.length < 2) return false;

        const startMonth = parseInt(startParts[1]) || 1;
        const startDay = parseInt(startParts[2]) || 1;
        const endMonth = parseInt(endParts[1]) || 12;
        const endDay = parseInt(endParts[2]) || 31;

        console.log(`日期比较: 战绩${matchMonth}-${matchDay} vs 范围${startMonth}-${startDay}到${endMonth}-${endDay}`);

        // 简化的比较：只比较月份和日期，忽略年份
        // 先比较月份
        if (matchMonth < startMonth || matchMonth > endMonth) {
            return false;
        }

        // 同一个月内比较日期
        if (matchMonth === startMonth && matchDay < startDay) {
            return false;
        }

        if (matchMonth === endMonth && matchDay > endDay) {
            return false;
        }

        return true;
    }

    // 提取和分析数据
    function extractAndAnalyzeStats(ignoreDateFilter = false) {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const survivalFilter = document.getElementById('survival-filter').value;

        // 显示加载中
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').style.display = 'none';
        document.getElementById('test-results').style.display = 'none';
        document.getElementById('error').style.display = 'none';

        // 延迟执行
        setTimeout(() => {
            try {
                const stats = analyzeDOMData(startDate, endDate, survivalFilter, ignoreDateFilter);
                displayResults(stats);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('results').style.display = 'block';
            } catch (error) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').textContent = `错误: ${error.message}\n请先点击"测试"按钮`;
                console.error('分析数据失败:', error);
            }
        }, 100);
    }

    // 分析DOM数据
    function analyzeDOMData(startDate, endDate, survivalFilter, ignoreDateFilter = false) {
        console.log('开始分析DOM数据...', { startDate, endDate, survivalFilter, ignoreDateFilter });

        // 直接查找 .match-item 元素
        const matchItems = document.querySelectorAll('.match-item');
        console.log(`找到 ${matchItems.length} 个 .match-item 元素`);

        const allMatches = [];
        const dailyStats = {}; // 用于按天统计数据
        const survivalStats = { // 存活时间分布统计
            '5min': { count: 0, kills: 0, damage: 0, wins: 0 },
            '10min': { count: 0, kills: 0, damage: 0, wins: 0 },
            '15min': { count: 0, kills: 0, damage: 0, wins: 0 },
            '20min': { count: 0, kills: 0, damage: 0, wins: 0 },
            '25min': { count: 0, kills: 0, damage: 0, wins: 0 },
            '30min': { count: 0, kills: 0, damage: 0, wins: 0 }
        };

        // 解析每个战绩元素
        matchItems.forEach((element, index) => {
            try {
                const match = parseMatchItem(element);
                if (match && match.rank > 0) {
                    allMatches.push(match);

                    // 按天统计
                    if (match.date) {
                        if (!dailyStats[match.date]) {
                            dailyStats[match.date] = {
                                matches: 0,
                                kills: 0,
                                damage: 0,
                                survival: 0
                            };
                        }
                        dailyStats[match.date].matches++;
                        dailyStats[match.date].kills += match.kills;
                        dailyStats[match.date].damage += match.damage;
                        dailyStats[match.date].survival += match.survivalMinutes;
                    }

                    // 统计存活时间分布
                    if (match.survivalMinutes >= 5) survivalStats['5min'].count++;
                    if (match.survivalMinutes >= 10) survivalStats['10min'].count++;
                    if (match.survivalMinutes >= 15) survivalStats['15min'].count++;
                    if (match.survivalMinutes >= 20) survivalStats['20min'].count++;
                    if (match.survivalMinutes >= 25) survivalStats['25min'].count++;
                    if (match.survivalMinutes >= 30) survivalStats['30min'].count++;

                    console.log(`解析元素 #${index+1}:`, match);
                }
            } catch (e) {
                console.log(`解析元素 #${index+1} 失败:`, e);
            }
        });

        console.log(`成功解析 ${allMatches.length} 场比赛数据`);

        // 筛选数据
        let filteredMatches;
        if (ignoreDateFilter) {
            // 忽略日期筛选，只按存活时间筛选
            filteredMatches = allMatches.filter(match => {
                return meetsSurvivalFilter(match.survivalMinutes, survivalFilter);
            });
            console.log('忽略日期筛选，按存活时间筛选:', filteredMatches.length);
        } else {
            // 根据日期和存活时间筛选
            filteredMatches = allMatches.filter(match => {
                if (!match.date) return false;
                const inDateRange = isDateInRange(match.date, startDate, endDate);
                const meetsSurvival = meetsSurvivalFilter(match.survivalMinutes, survivalFilter);
                return inDateRange && meetsSurvival;
            });
            console.log(`日期范围和存活时间筛选后: ${filteredMatches.length} 场`);
        }

        // 统计结果
        const stats = {
            startDate: startDate,
            endDate: endDate,
            survivalFilter: survivalFilter,
            ignoreDateFilter: ignoreDateFilter,
            totalMatches: filteredMatches.length,
            totalKills: 0,
            totalDamage: 0,
            totalSurvival: 0,
            mapStats: {},
            rankStats: {
                wins: 0,
                top10: 0,
                top12: 0,
                top20: 0
            },
            dailyStats: dailyStats,
            survivalStats: survivalStats
        };

        // 处理每场比赛
        filteredMatches.forEach(match => {
            const map = match.map;
            const rank = match.rank;

            // 统计地图数据
            if (!stats.mapStats[map]) {
                stats.mapStats[map] = {
                    count: 0,
                    kills: 0,
                    damage: 0,
                    survival: 0,
                    wins: 0,
                    top10: 0,
                    top12: 0,
                    top20: 0
                };
            }

            stats.mapStats[map].count++;
            stats.mapStats[map].kills += match.kills;
            stats.mapStats[map].damage += match.damage;
            stats.mapStats[map].survival += match.survivalMinutes;

            // 统计排名数据
            if (rank === 1) {
                stats.rankStats.wins++;
                stats.mapStats[map].wins++;
            }
            if (rank <= 10 && rank > 0) {
                stats.rankStats.top10++;
                stats.mapStats[map].top10++;
            }
            if (rank <= 12 && rank > 0) {
                stats.rankStats.top12++;
                stats.mapStats[map].top12++;
            }
            if (rank <= 20 && rank > 0) {
                stats.rankStats.top20++;
                stats.mapStats[map].top20++;
            }

            stats.totalKills += match.kills;
            stats.totalDamage += match.damage;
            stats.totalSurvival += match.survivalMinutes;
        });

        // 计算百分比和平均值
        if (stats.totalMatches > 0) {
            stats.rankStats.winRate = ((stats.rankStats.wins / stats.totalMatches) * 100).toFixed(1);
            stats.rankStats.top10Rate = ((stats.rankStats.top10 / stats.totalMatches) * 100).toFixed(1);
            stats.rankStats.top12Rate = ((stats.rankStats.top12 / stats.totalMatches) * 100).toFixed(1);
            stats.rankStats.top20Rate = ((stats.rankStats.top20 / stats.totalMatches) * 100).toFixed(1);

            stats.avgKills = (stats.totalKills / stats.totalMatches).toFixed(1);
            stats.avgDamage = (stats.totalDamage / stats.totalMatches).toFixed(0);
            stats.avgSurvival = (stats.totalSurvival / stats.totalMatches).toFixed(1);
        }

        // 添加调试信息
        stats.debug = {
            totalElements: matchItems.length,
            parsedMatches: allMatches.length,
            filteredMatches: filteredMatches.length
        };

        return stats;
    }

    // 显示结果
    function displayResults(stats) {
        const contentDiv = document.getElementById('stats-content');

        if (stats.totalMatches === 0) {
            contentDiv.innerHTML = `
                <div style="color: #FF9800; text-align: center; padding: 20px;">
                    <div style="margin-bottom: 10px;">⚠️ 未找到有效战绩数据</div>
                    <div style="font-size: 11px; color: #aaa;">
                        ${stats.ignoreDateFilter ? '页内统计模式' : `统计范围: ${stats.startDate} 至 ${stats.endDate}`}<br>
                        存活筛选: ${SURVIVAL_FILTERS[stats.survivalFilter]}<br>
                        找到 .match-item 元素: ${stats.debug.totalElements} 个<br>
                        成功解析: ${stats.debug.parsedMatches} 场<br>
                        统计场次: ${stats.debug.filteredMatches} 场<br>
                        ${!stats.ignoreDateFilter ? '请检查日期范围和存活时间设置' : '当前页面可能没有显示战绩'}
                    </div>
                </div>
            `;
            return;
        }

        // 格式化日期
        const formatDateForDisplay = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('zh-CN');
        };

        let html = `
            <div style="background: rgba(76, 175, 80, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>统计模式:</span>
                    <span style="color: #4CAF50; font-weight: bold;">${stats.ignoreDateFilter ? '📅 页内统计（所有比赛）' : `📝 ${formatDateForDisplay(stats.startDate)} 至 ${formatDateForDisplay(stats.endDate)}`}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>存活筛选:</span>
                    <span style="color: #2196F3; font-weight: bold;">${SURVIVAL_FILTERS[stats.survivalFilter]}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>总场次:</span>
                    <span style="color: #2196F3; font-weight: bold;">${stats.totalMatches}场</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>总击杀:</span>
                    <span style="color: #9C27B0; font-weight: bold;">${stats.totalKills}个</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>场均击杀:</span>
                    <span style="color: #FF9800; font-weight: bold;">${stats.avgKills || '0'}个</span>
                </div>
            </div>

            <div style="background: rgba(255, 215, 0, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                <div style="color: #FFD700; font-size: 13px; margin-bottom: 10px; border-bottom: 1px solid rgba(255, 215, 0, 0.3); padding-bottom: 5px;">🏆 排名统计</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div style="text-align: center;">
                        <div style="font-size: 20px; font-weight: bold; color: #FFD700;">${stats.rankStats.wins}</div>
                        <div style="font-size: 10px; color: #aaa;">吃鸡数</div>
                        <div style="font-size: 11px; color: #4CAF50;">${stats.rankStats.winRate || '0'}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 20px; font-weight: bold; color: #FF9800;">${stats.rankStats.top10}</div>
                        <div style="font-size: 10px; color: #aaa;">前十数</div>
                        <div style="font-size: 11px; color: #4CAF50;">${stats.rankStats.top10Rate || '0'}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 20px; font-weight: bold; color: #2196F3;">${stats.rankStats.top12}</div>
                        <div style="font-size: 10px; color: #aaa;">前十二数</div>
                        <div style="font-size: 11px; color: #4CAF50;">${stats.rankStats.top12Rate || '0'}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 20px; font-weight: bold; color: #9C27B0;">${stats.rankStats.top20}</div>
                        <div style="font-size: 10px; color: #aaa;">前二十数</div>
                        <div style="font-size: 11px; color: #4CAF50;">${stats.rankStats.top20Rate || '0'}%</div>
                    </div>
                </div>
                <div style="font-size: 11px; color: #aaa; margin-top: 5px; text-align: center;">
                    吃鸡率: ${stats.rankStats.winRate || '0'}% | 前十率: ${stats.rankStats.top10Rate || '0'}%
                </div>
            </div>

            <div style="background: rgba(33, 150, 243, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                <div style="color: #2196F3; font-size: 13px; margin-bottom: 10px; border-bottom: 1px solid rgba(33, 150, 243, 0.3); padding-bottom: 5px;">⏱️ 存活时间分布</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div style="text-align: center;">
                        <div style="font-size: 16px; font-weight: bold; color: ${stats.survivalStats['5min'].count > 0 ? '#4CAF50' : '#666'};">${stats.survivalStats['5min'].count}</div>
                        <div style="font-size: 10px; color: #aaa;">≥5分钟</div>
        <div style="font-size: 9px; color: #4CAF50;">${stats.totalMatches > 0 ? ((stats.survivalStats['5min'].count / stats.totalMatches) * 100).toFixed(0) : 0}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 16px; font-weight: bold; color: ${stats.survivalStats['10min'].count > 0 ? '#4CAF50' : '#666'};">${stats.survivalStats['10min'].count}</div>
                        <div style="font-size: 10px; color: #aaa;">≥10分钟</div>
                        <div style="font-size: 9px; color: #4CAF50;">${stats.totalMatches > 0 ? ((stats.survivalStats['10min'].count / stats.totalMatches) * 100).toFixed(0) : 0}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 16px; font-weight: bold; color: ${stats.survivalStats['15min'].count > 0 ? '#4CAF50' : '#666'};">${stats.survivalStats['15min'].count}</div>
                        <div style="font-size: 10px; color: #aaa;">≥15分钟</div>
                        <div style="font-size: 9px; color: #4CAF50;">${stats.totalMatches > 0 ? ((stats.survivalStats['15min'].count / stats.totalMatches) * 100).toFixed(0) : 0}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 16px; font-weight: bold; color: ${stats.survivalStats['20min'].count > 0 ? '#4CAF50' : '#666'};">${stats.survivalStats['20min'].count}</div>
                        <div style="font-size: 10px; color: #aaa;">≥20分钟</div>
                        <div style="font-size: 9px; color: #4CAF50;">${stats.totalMatches > 0 ? ((stats.survivalStats['20min'].count / stats.totalMatches) * 100).toFixed(0) : 0}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 16px; font-weight: bold; color: ${stats.survivalStats['25min'].count > 0 ? '#4CAF50' : '#666'};">${stats.survivalStats['25min'].count}</div>
                        <div style="font-size: 10px; color: #aaa;">≥25分钟</div>
                        <div style="font-size: 9px; color: #4CAF50;">${stats.totalMatches > 0 ? ((stats.survivalStats['25min'].count / stats.totalMatches) * 100).toFixed(0) : 0}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 16px; font-weight: bold; color: ${stats.survivalStats['30min'].count > 0 ? '#4CAF50' : '#666'};">${stats.survivalStats['30min'].count}</div>
                        <div style="font-size: 10px; color: #aaa;">≥30分钟</div>
                        <div style="font-size: 9px; color: #4CAF50;">${stats.totalMatches > 0 ? ((stats.survivalStats['30min'].count / stats.totalMatches) * 100).toFixed(0) : 0}%</div>
                    </div>
                </div>
                <div style="font-size: 11px; color: #aaa; margin-top: 5px; text-align: center;">
                    场均存活: ${stats.avgSurvival || '0'}分钟
                </div>
            </div>
        `;

        // 添加每日统计
        html += `<div style="color: #2196F3; font-size: 13px; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">📅 每日统计</div>`;
        html += `<div style="margin-bottom: 15px;">`;

        // 获取日期并排序
        const dates = Object.keys(stats.dailyStats).sort((a, b) => {
            const [aMonth, aDay] = a.split('-').map(Number);
            const [bMonth, bDay] = b.split('-').map(Number);

            // 如果月份不同，按月份降序排序
            if (aMonth !== bMonth) {
                return bMonth - aMonth;
            }
            // 如果月份相同，按日期降序排序
            return bDay - aDay;
        });

        if (dates.length > 0) {
            dates.forEach(date => {
                const dayStats = stats.dailyStats[date];
                const avgKills = dayStats.matches > 0 ? (dayStats.kills / dayStats.matches).toFixed(1) : 0;
                const avgDamage = dayStats.matches > 0 ? (dayStats.damage / dayStats.matches).toFixed(0) : 0;
                const avgSurvival = dayStats.matches > 0 ? (dayStats.survival / dayStats.matches).toFixed(1) : 0;

                html += `
                    <div style="background: rgba(33, 150, 243, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="font-weight: bold; color: #2196F3;">${date}</span>
                            <span style="background: rgba(255, 152, 0, 0.2); padding: 2px 8px; border-radius: 20px; font-size: 11px;">
                                ${dayStats.matches}场
                            </span>
                        </div>

                        <div style="display: flex; justify-content: space-between; font-size: 11px;">
                            <div>
                                <span>总淘汰</span>
                                <span style="color: #FF9800; margin-left: 5px;">${dayStats.kills}个</span>
                            </div>
                            <div>
                                <span>场均</span>
                                <span style="color: #FF9800; margin-left: 5px;">${avgKills}个</span>
                            </div>
                            <div>
                                <span>总伤害</span>
                                <span style="color: #9C27B0; margin-left: 5px;">${dayStats.damage}</span>
                            </div>
                            <div>
                                <span>场均</span>
                                <span style="color: #9C27B0; margin-left: 5px;">${avgDamage}</span>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 3px;">
                            <div>
                                <span>总存活</span>
                                <span style="color: #4CAF50; margin-left: 5px;">${dayStats.survival.toFixed(1)}分钟</span>
                            </div>
                            <div>
                                <span>场均</span>
                                <span style="color: #4CAF50; margin-left: 5px;">${avgSurvival}分钟</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div style="text-align: center; padding: 10px; color: #aaa; font-size: 11px;">
                暂无每日统计数据
            </div>`;
        }

        html += `</div>`; // 结束每日统计部分

        // 显示地图统计
        const sortedMaps = Object.keys(stats.mapStats).sort((a, b) => stats.mapStats[b].count - stats.mapStats[a].count);

        if (sortedMaps.length > 0) {
            html += `<div style="color: #FF9800; font-size: 13px; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">🗺️ 地图统计</div>`;

            sortedMaps.forEach(mapName => {
                const mapStat = stats.mapStats[mapName];
                const percentage = ((mapStat.count / stats.totalMatches) * 100).toFixed(0);
                const avgSurvival = mapStat.count > 0 ? (mapStat.survival / mapStat.count).toFixed(1) : 0;

                html += `
                    <div style="background: rgba(255, 152, 0, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="font-weight: bold;">${mapName}</span>
                            <div>
                                <span style="color: #4CAF50; margin-right: 10px;">${mapStat.count}场</span>
                                <span style="color: #aaa; font-size: 11px;">${percentage}%</span>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 5px; font-size: 11px;">
                            <div style="text-align: center;">
                                <div style="color: #FFD700; font-weight: bold;">${mapStat.wins}</div>
                                <div style="font-size: 9px; color: #aaa;">吃鸡</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="color: #FF9800; font-weight: bold;">${mapStat.top10}</div>
                                <div style="font-size: 9px; color: #aaa;">前十</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="color: #2196F3; font-weight: bold;">${mapStat.top12}</div>
                                <div style="font-size: 9px; color: #aaa;">前12</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="color: #9C27B0; font-weight: bold;">${mapStat.top20}</div>
                                <div style="font-size: 9px; color: #aaa;">前20</div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px;">
                            <div>
                                <span>总击杀:</span>
                                <span style="color: #FF9800; margin-left: 5px;">${mapStat.kills}个</span>
                            </div>
                            <div>
                                <span>场均:</span>
                                <span style="color: #FF9800; margin-left: 5px;">${(mapStat.kills / mapStat.count).toFixed(1)}个</span>
                            </div>
                            <div>
                                <span>总伤害:</span>
                                <span style="color: #9C27B0; margin-left: 5px;">${mapStat.damage}</span>
                            </div>
                            <div>
                                <span>场均:</span>
                                <span style="color: #9C27B0; margin-left: 5px;">${(mapStat.damage / mapStat.count).toFixed(0)}</span>
                            </div>
                            <div>
                                <span>总存活:</span>
                                <span style="color: #4CAF50; margin-left: 5px;">${mapStat.survival.toFixed(1)}分钟</span>
                            </div>
                            <div>
                                <span>场均:</span>
                                <span style="color: #4CAF50; margin-left: 5px;">${avgSurvival}分钟</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div style="text-align: center; padding: 10px; color: #aaa; font-size: 11px;">
                暂无地图统计数据
            </div>`;
        }

        // 添加数据总结
        html += `
            <div style="background: rgba(156, 39, 176, 0.1); padding: 10px; border-radius: 5px; margin-top: 15px; margin-bottom: 10px;">
                <div style="color: #9C27B0; font-size: 13px; margin-bottom: 10px; border-bottom: 1px solid rgba(156, 39, 176, 0.3); padding-bottom: 5px;">📊 数据总结</div>
                <div style="font-size: 11px; color: #aaa; margin-bottom: 5px;">
                    统计范围: ${stats.ignoreDateFilter ? '页面内显示的所有比赛' : `从 ${stats.startDate} 到 ${stats.endDate}`}
                </div>
                <div style="font-size: 11px; color: #aaa; margin-bottom: 5px;">
                    存活筛选: ${SURVIVAL_FILTERS[stats.survivalFilter]}
                </div>
                <div style="font-size: 11px; color: #aaa; margin-bottom: 5px;">
                    总场次: ${stats.totalMatches} | 总击杀: ${stats.totalKills} | 总伤害: ${stats.totalDamage}
                </div>
                <div style="font-size: 11px; color: #aaa; margin-bottom: 5px;">
                    场均击杀: ${stats.avgKills} | 场均伤害: ${stats.avgDamage} | 场均存活: ${stats.avgSurvival}分钟
                </div>
                <div style="font-size: 11px; color: #aaa; margin-bottom: 5px;">
                    吃鸡率: ${stats.rankStats.winRate}% | 前十率: ${stats.rankStats.top10Rate}%
                </div>
            </div>
        `;

        // 调试信息
        html += `
            <div style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 5px; font-size: 10px; color: #666; text-align: center;">
                <div>解析元素数量: ${stats.debug.totalElements} | 解析比赛: ${stats.debug.parsedMatches} | 统计比赛: ${stats.debug.filteredMatches}</div>
            </div>
        `;

        contentDiv.innerHTML = html;
    }

    // 初始化按钮
    function init() {
        createButton();
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
