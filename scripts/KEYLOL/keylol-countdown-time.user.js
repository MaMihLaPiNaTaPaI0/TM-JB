// ==UserScript==
// @name         Keylol倒计时结束时间显示
// @name:zh      Keylol倒计时结束时间显示
// @name:en      Keylol Countdown End Time Display
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      3.3.3
// @description  在keylol.com的倒计时下方居中显示结束时间 | Display end time below countdown on keylol.com
// @description:zh 在keylol.com的倒计时下方居中显示结束时间
// @description:en Display end time below countdown on keylol.com
// @author       MaMihLaPiNaTaPaI0
// @license      MIT
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/KEYLOL/keylol-countdown-time.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/KEYLOL/keylol-countdown-time.user.js
// @match        *://keylol.com/*
// @grant        none
// @run-at       document-end
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    const waitForContainer = setInterval(() => {
        const container = document.querySelector('iframe[src*="micxp_countdown:countdown"]')?.parentNode;
        if (container) {
            clearInterval(waitForContainer);
            addEndTimeDisplay(container);
        }
    }, 500);

    function addEndTimeDisplay(container) {
        const iframe = container.querySelector('iframe[src*="micxp_countdown:countdown"]');
        const src = iframe.getAttribute('src');
        const timestampMatch = src.match(/[?&]t=(\d+)/);
        if (!timestampMatch) return;

        const endTimestamp = parseInt(timestampMatch[1]) * 1000;
        const endTime = new Date(endTimestamp);

        const formatTime = (date) => {
            return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
        };

        const endTimeDisplay = document.createElement('div');
        endTimeDisplay.id = 'end-time-display';
        endTimeDisplay.innerHTML = `
            <div style="font-size: 15px; font-weight: bold; margin-bottom: 3px;">
                倒计时结束时间为：
            </div>
            <div style="font-size: 16px; color: #D32F2F; font-weight: bold;">
                ${formatTime(endTime)}
            </div>
            <span id="end-time-close" title="关闭本次显示">×</span>
        `;
        endTimeDisplay.style.cssText = `
            text-align: center;
            margin: 8px 0;
            padding: 10px 15px;
            background: rgba(255, 245, 245, 0.95);
            border-radius: 6px;
            border: 1px solid #FFCDD2;
            position: relative;
            max-width: calc(100% - 130px);
            margin-left: auto;
            margin-right: auto;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        `;

        const closeBtn = endTimeDisplay.querySelector('#end-time-close');
        closeBtn.style.cssText = `
            position: absolute;
            right: 8px;
            top: 8px;
            cursor: pointer;
            font-size: 18px;
            color: #999;
            width: 22px;
            height: 22px;
            text-align: center;
            line-height: 20px;
            border-radius: 50%;
            transition: all 0.2s;
        `;
        
        closeBtn.addEventListener('mouseover', () => {
            closeBtn.style.background = '#FFEBEE';
            closeBtn.style.color = '#D32F2F';
            closeBtn.style.transform = 'scale(1.1)';
        });
        closeBtn.addEventListener('mouseout', () => {
            closeBtn.style.background = 'transparent';
            closeBtn.style.color = '#999';
            closeBtn.style.transform = 'scale(1)';
        });
        
        closeBtn.addEventListener('click', () => {
            endTimeDisplay.style.display = 'none';
        });

        container.insertBefore(endTimeDisplay, iframe.nextSibling);
    }
})();
