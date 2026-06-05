// ==UserScript==
// @name         PUBG—DC社群活動表單自動填充含队友ID(买的号)20260606
// @version      6.6.6
// @description  自動填充 PUBG 活動表單中的遊戲暱稱、Steam ID 和 Discord 暱稱
// @match        https://docs.google.com/forms/d/e/*/viewform
// @match        https://docs.google.com/forms/d/e/*/viewform*

// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/PUBG/pubg-dc-tianbiao.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/PUBG/pubg-dc-tianbiao.user.js

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

    // ========================================
    // 填充數據
    // ========================================
    const FORM_DATA = {
        gameNickname: "游戏名",
        steamId: "steam.自己ID",
        discordNickname: "DC名字",
        teammateSteamId: "steam.队友ID" // 隊友的Steam ID，如果沒有就留空
    };

    // 檢查是否為 PUBG 活動表單
    function isPUBGForm() {
        const formContent = document.body.textContent || '';
        const formTitle = document.title || '';

        // 檢查關鍵特徵
        const keywords = [
            '擊殺挑戰',
            '遊戲暱稱',
            'STEAM 數字 ID',
            '數字前面要加 [steam.]',
            'Discord 暱稱',
            'Discord 使用者名稱',
            'kraftontw.info/Discord',
            '若您不加入，將無法參與活動',
            'PUBG',
            '吃雞'
        ];

        // 檢查是否有足夠的關鍵詞
        let matchCount = 0;
        for (const keyword of keywords) {
            if (formContent.includes(keyword) || formTitle.includes(keyword)) {
                matchCount++;
            }
        }

        // 如果有2個以上的關鍵詞匹配，就認為是 PUBG 表單
        return matchCount >= 2;
    }

    // 尋找並填充表單欄位
    function fillFormFields() {
        console.log('開始查找表單欄位...');

        // 方法1：通過標籤文本查找
        fillByQuestionText();

        // 方法2：通過輸入框索引查找
        fillByInputIndex();

        // 方法3：嘗試所有輸入框
        fillAllInputs();

        console.log('表單填充完成！');
    }

    // 方法1：通過問題文本查找對應的輸入框
    function fillByQuestionText() {
        // 查找所有問題元素
        const questions = document.querySelectorAll('.Qr7Oae, .geS5n, .RZJk3b, [role="listitem"]');

        questions.forEach((question, index) => {
            const questionText = question.textContent || '';

            // 查找問題中的標籤
            const labels = question.querySelectorAll('.M7eMe, .o3Dpx, .zYfL0d, .vQES8d, .geS5n');

            labels.forEach(label => {
                const labelText = label.textContent || '';
                const fullText = (labelText + ' ' + questionText).toLowerCase();

                // 檢查是否為遊戲暱稱
                if (labelText.includes('遊戲暱稱') || questionText.includes('遊戲暱稱')) {
                    const input = findInputInContainer(question);
                    if (input && !input.value) {
                        input.value = FORM_DATA.gameNickname;
                        triggerEvents(input);
                        console.log('已填充遊戲暱稱:', FORM_DATA.gameNickname);
                    }
                }

                // 檢查是否為 Discord 暱稱
                else if (labelText.includes('Discord') || questionText.includes('Discord')) {
                    const input = findInputInContainer(question);
                    if (input && !input.value) {
                        input.value = FORM_DATA.discordNickname;
                        triggerEvents(input);
                        console.log('已填充 Discord 暱稱:', FORM_DATA.discordNickname);
                    }
                }

                            // 檢查是否為 Steam ID（保持原有邏輯，但有更精確的判斷）
            else if (labelText.includes('STEAM') || labelText.includes('steam.') ||
                    questionText.includes('STEAM') || questionText.includes('steam.')) {

                const input = findInputInContainer(question);
                if (input && !input.value) {
                    // 根據文本內容判斷是哪種Steam ID
                    const isTeammateField = fullText.includes('新手') ||
                                            fullText.includes('回鍋') ||
                                            fullText.includes('隊友') ||
                                            fullText.includes('新手/回鍋') ||
                                            fullText.includes('新手/回鍋隊友的 STEAM 數字 ID ');

                    const isOwnFieldWithInstructions = fullText.includes('若您需要找出您的 Steam ID') ||
                                                      fullText.includes('您右上角的 Steam 名稱') ||
                                                      fullText.includes('您的 Steam ID') ||
                                                      fullText.includes('打開 Steam 並且點選');

                    if (isTeammateField) {
                        // 這是隊友的Steam ID
                        if (FORM_DATA.teammateSteamId) {
                            input.value = FORM_DATA.teammateSteamId;
                            triggerEvents(input);
                            console.log('已填充隊友 Steam ID:', FORM_DATA.teammateSteamId);
                        } else {
                            console.log('檢測到隊友Steam ID字段，但未設置隊友ID，留空');
                        }
                    } else if (isOwnFieldWithInstructions || !isTeammateField) {
                        // 這是自己的Steam ID（有詳細說明或不是隊友字段）
                        input.value = FORM_DATA.steamId;
                        triggerEvents(input);
                        console.log('已填充自己的 Steam ID:', FORM_DATA.steamId);
                    }
                }
            }
        }); // labels.forEach 结束
    }); // questions.forEach 结束
} // fillByQuestionText 函数结束

    // 在容器中查找輸入框
    function findInputInContainer(container) {
        // 嘗試各種可能的輸入框選擇器
        const selectors = [
            'input[type="text"]',
            'input.whsOnd',
            'input.zHQkBf',
            'textarea',
            '[role="textbox"]',
            '.KHxj8b',
            '.AgroKb'
        ];

        for (const selector of selectors) {
            const element = container.querySelector(selector);
            if (element) {
                return element;
            }
        }

        // 如果直接找不到，嘗試查找兄弟元素
        const siblings = container.parentElement.querySelectorAll(selectors.join(','));
        for (const sibling of siblings) {
            if (sibling.offsetParent !== null) { // 確保元素可見
                return sibling;
            }
        }

        return null;
    }

    // 方法2：通過輸入框索引查找
    function fillByInputIndex() {
        // 獲取所有可見的文本輸入框
        const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea'))
            .filter(input => {
                // 過濾掉隱藏的和非表單輸入框
                return input.offsetParent !== null &&
                       !input.hidden &&
                       input.style.display !== 'none';
            });

        console.log(`找到 ${inputs.length} 個可見輸入框`);

        // 如果正好有3個輸入框，按順序填充
        if (inputs.length >= 3) {
            // 第一個輸入框 - 遊戲暱稱
            if (!inputs[0].value) {
                inputs[0].value = FORM_DATA.gameNickname;
                triggerEvents(inputs[0]);
                console.log('按順序填充遊戲暱稱');
            }

            // 第二個輸入框 - Steam ID
            if (!inputs[1].value) {
                inputs[1].value = FORM_DATA.steamId;
                triggerEvents(inputs[1]);
                console.log('按順序填充 Steam ID');
            }

            // 第三個輸入框 - Discord 暱稱
            if (!inputs[2].value) {
                inputs[2].value = FORM_DATA.discordNickname;
                triggerEvents(inputs[2]);
                console.log('按順序填充 Discord 暱稱');
            }

            // 如果有第四個輸入框，可能是隊友的Steam ID
            if (inputs.length >= 4 && !inputs[3].value && FORM_DATA.teammateSteamId) {
                inputs[3].value = FORM_DATA.teammateSteamId;
                triggerEvents(inputs[3]);
                console.log('按順序填充隊友 Steam ID');
            }
        }
    }

    // 方法3：嘗試所有輸入框
    function fillAllInputs() {
        const allInputs = document.querySelectorAll('input[type="text"], textarea');
        let filledCount = 0;
        let steamIdFilled = false; // 記錄是否已經填了自己的Steam ID

        allInputs.forEach((input, index) => {
            if (!input.value && input.offsetParent !== null) {
                switch (filledCount) {
                    case 0:
                        input.value = FORM_DATA.gameNickname;
                        triggerEvents(input);
                        console.log(`填充輸入框 ${index} 為遊戲暱稱`);
                        filledCount++;
                        break;
                    case 1:
                        // 第一個Steam ID字段填自己的
                        input.value = FORM_DATA.steamId;
                        triggerEvents(input);
                        steamIdFilled = true;
                        console.log(`填充輸入框 ${index} 為自己的 Steam ID`);
                        filledCount++;
                        break;
                    case 2:
                        // 如果已經填了自己的Steam ID，這個可能是Discord或隊友的Steam ID
                        // 根據實際情況判斷，這裡先嘗試填Discord
                        input.value = FORM_DATA.discordNickname;
                        triggerEvents(input);
                        console.log(`填充輸入框 ${index} 為 Discord 暱稱`);
                        filledCount++;
                        break;
                    case 3:
                        // 如果有第四個字段，可能是隊友的Steam ID
                        if (FORM_DATA.teammateSteamId) {
                            input.value = FORM_DATA.teammateSteamId;
                            triggerEvents(input);
                            console.log(`填充輸入框 ${index} 為隊友 Steam ID`);
                            filledCount++;
                        }
                        break;
                }
            }
        });
    }

    // 觸發事件
    function triggerEvents(element) {
        if (!element) return;

        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            element.dispatchEvent(new Event(eventType, { bubbles: true }));
        });

        // 觸發 React 事件
        if (element._valueTracker) {
            element._valueTracker.setValue(element.value);
        }
    }

    // 主執行函數
    function main() {
        if (!isPUBGForm()) {
            console.log('未檢測到 PUBG 活動表單，腳本不執行');
            return;
        }

        console.log('檢測到 PUBG 活動表單，開始自動填充...');
        console.log('填充數據:', FORM_DATA);
        if (FORM_DATA.teammateSteamId) {
            console.log('隊友Steam ID已設置:', FORM_DATA.teammateSteamId);
        }

        // 多次嘗試填充
        const attempts = [0, 500, 1000, 2000, 3000];
        attempts.forEach(delay => {
            setTimeout(() => {
                console.log(`延遲 ${delay}ms 後嘗試填充`);
                fillFormFields();
            }, delay);
        });
    }

    // 等待頁面加載
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(main, 1000);
        });
    } else {
        setTimeout(main, 1000);
    }

    // 監聽動態加載
    const observer = new MutationObserver(() => {
        if (isPUBGForm()) {
            console.log('檢測到DOM變化，重新嘗試填充');
            setTimeout(fillFormFields, 500);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('PUBG 表單自動填充腳本已加載 v1.6');
    console.log('支持區分：自己的Steam ID和隊友的Steam ID');
})();
