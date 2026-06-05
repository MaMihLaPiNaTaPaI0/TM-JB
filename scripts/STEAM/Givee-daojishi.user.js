// ==UserScript==
// @name         Givee 全站结束时间显示增强版20260606
// @version      6.6.6
// @description  在主页和详情页显示活动结束时间，并在导航栏显示最晚结束活动
// @match        *://givee.club/*

// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM/Givee-daojishi.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM/Givee-daojishi.user.js

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

    // 格式化日期为简洁格式：月/日 时:分
    function formatDate(date) {
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // 处理主页活动卡片
    function processMainPageCards() {
        document.querySelectorAll('.event-timeleft[data-timeleft]').forEach(timer => {
            if (timer.nextElementSibling?.classList?.contains('givee-end-time')) return;

            const secondsLeft = parseInt(timer.dataset.timeleft);
            const endTime = new Date(Date.now() + secondsLeft * 1000);

            const endTimeDisplay = document.createElement('div');
            endTimeDisplay.className = 'givee-end-time';
            endTimeDisplay.textContent = `结束: ${formatDate(endTime)}`;

            endTimeDisplay.style.cssText = `
                display: inline-block;
                margin-left: 8px;
                padding: 4px 8px;
                background-color: rgba(0, 0, 0, 0.8);
                color: #fff;
                border-radius: 3px;
                font-size: 12px;
                font-weight: bold;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                line-height: 1.2;
            `;

            timer.insertAdjacentElement('afterend', endTimeDisplay);
        });
    }

    // 处理详情页倒计时
    function processDetailPage() {
        const countdownContainer = document.querySelector('.event-countdown[data-timeleft]');
        if (!countdownContainer) return;

        if (document.querySelector('.givee-end-time-detail')) return;

        const secondsLeft = parseInt(countdownContainer.dataset.timeleft);
        const endTime = new Date(Date.now() + secondsLeft * 1000);

        const endTimeContainer = document.createElement('div');
        endTimeContainer.className = 'givee-end-time-detail';
        endTimeContainer.innerHTML = `
            <div style="
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                margin-top: 15px;
                font-size: 16px;
                text-align: center;
                box-shadow: 0 3px 10px rgba(0,0,0,0.25);
                font-weight: bold;
                border: 1px solid rgba(255,255,255,0.1);
            ">
                <span style="opacity:0.9;">${getLocalizedText('EventEnd')}:</span>
                <span style="font-size:17px; color:#ffdd00;">${formatDate(endTime)}</span>
            </div>
        `;

        const parentContainer = countdownContainer.closest('.event-description-stats');
        if (parentContainer) parentContainer.appendChild(endTimeContainer);
    }

    // 在导航栏显示最晚结束时间
    function showLatestEndTimeInNav() {
        // 获取所有活动剩余时间
        const timers = document.querySelectorAll('.event-timeleft[data-timeleft]');
        if (timers.length === 0) return;

        // 找出最大剩余时间
        let maxSeconds = 0;
        timers.forEach(timer => {
            const seconds = parseInt(timer.dataset.timeleft);
            if (seconds > maxSeconds) maxSeconds = seconds;
        });

        // 计算最晚结束时间
        const latestEndTime = new Date(Date.now() + maxSeconds * 1000);

        // 创建显示元素
        const timeDisplay = document.createElement('div');
        timeDisplay.id = 'givee-latest-endtime';
        timeDisplay.innerHTML = `
            <div style="
                display: inline-block;
                margin-left: 15px;
                padding: 6px 12px;
                background: rgba(0, 0, 0, 0.8);
                color: #fff;
                border-radius: 5px;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                border: 1px solid rgba(255,255,255,0.15);
            ">
                <i class="fa fa-clock-o" style="margin-right:5px;"></i>
                <span>${getLocalizedText('LatestEnd')}: ${formatDate(latestEndTime)}</span>
            </div>
        `;

        // 插入到导航栏
        const navContainer = document.querySelector('nav[role="navigation"]');
        if (navContainer) {
            // 移除可能存在的旧元素
            const oldElement = document.getElementById('givee-latest-endtime');
            if (oldElement) oldElement.remove();

            navContainer.insertAdjacentElement('afterbegin', timeDisplay);
        }
    }

    // 多语言支持
    function getLocalizedText(key) {
        const lang = document.documentElement.lang || 'zh';
        const translations = {
            'zh': {
                'EventEnd': '活动结束时间',
                'LatestEnd': '最晚结束'
            },
            'en': {
                'EventEnd': 'Event ends',
                'LatestEnd': 'Latest ends'
            },
            'ru': {
                'EventEnd': 'Завершение',
                'LatestEnd': 'Самое позднее'
            },
            // 添加更多语言支持...
            'default': {
                'EventEnd': 'End time',
                'LatestEnd': 'Latest ends'
            }
        };

        return translations[lang]?.[key] || translations.default[key];
    }

    // 页面加载完成后执行
    window.addEventListener('load', function() {
        // 主页功能
        if (document.querySelector('.event-list') ||
            window.location.pathname.split('/').filter(Boolean).length <= 1) {
            processMainPageCards();
            showLatestEndTimeInNav();
        }

        // 详情页功能
        if (document.querySelector('.event-info-block')) {
            processDetailPage();
        }
    });
})();
