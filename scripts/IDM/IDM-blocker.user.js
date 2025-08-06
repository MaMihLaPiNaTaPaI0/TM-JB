// ==UserScript==
// @name         IDM强制跳转拦截器
// @name:zh      IDM强制跳转拦截器
// @name:en      IDM Redirect Blocker
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      3.2
// @description  拦截IDM官网强制跳转页面，在Tampermonkey菜单中显示拦截次数
// @description:zh 拦截IDM官网强制跳转页面，在Tampermonkey菜单中显示拦截次数
// @description:en Block IDM forced redirects and display count in menu
// @author       MaMihLaPiNaTaPaI0
// @license      MIT
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/IDM/IDM-blocker.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/IDM/IDM-blocker.user.js
// @match        *://*/*
// @run-at       document-start
// @grant        window.close
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.registerMenuCommand
// @icon         https://cdn.jsdelivr.net/gh/doublesweet01/BS_script@master/image/sweet.jpg
// @icon64       https://cdn.jsdelivr.net/gh/doublesweet01/BS_script@master/image/sweet.jpg
// @noframes
// @antifeature  tracking
// ==/UserScript==

(function() {
    'use strict';
    let blockCount = GM_getValue('blockCount', 0);
    let lastBlockTime = GM_getValue('lastBlockTime', '从未');
    
    function updateMenu() {
        GM_registerMenuCommand(`拦截次数: ${blockCount}次`, function() {
            alert(`IDM强制跳转拦截统计:\n\n已拦截次数: ${blockCount}\n上次拦截时间: ${lastBlockTime}`);
        });
        GM_registerMenuCommand("重置拦截计数", function() {
            blockCount = 0;
            lastBlockTime = '从未';
            GM_setValue('blockCount', 0);
            GM_setValue('lastBlockTime', '从未');
            updateMenu();
            alert("拦截计数器已重置为0");
        });
    }
    updateMenu();
    const blockList = [
        /download2\.html\?lng=chn2/i,
        /\/download\.php\?.*force=1/i
    ];
    const shouldBlock = blockList.some(regex => regex.test(window.location.href));
    if (shouldBlock) {
        blockCount++;
        lastBlockTime = new Date().toLocaleString();
        GM_setValue('blockCount', blockCount);
        GM_setValue('lastBlockTime', lastBlockTime);
        updateMenu();
        window.stop();
        document.documentElement.innerHTML = `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>IDM跳转已拦截</title>
            <style>
                *{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#1a2a6c,#b21f1f,#fdbb2d);height:100vh;display:flex;justify-content:center;align-items:center;color:white;text-align:center;padding:20px}.card{background:rgba(0,0,0,0.7);border-radius:16px;padding:30px;max-width:90%;width:500px;box-shadow:0 10px 30px rgba(0,0,0,0.3);backdrop-filter:blur(10px)}h1{font-size:2.2rem;margin-bottom:20px;color:#ff6b6b}p{font-size:1.1rem;margin:15px 0;line-height:1.6}.close-btn{background:#ff6b6b;color:white;border:none;padding:12px 30px;font-size:1.1rem;border-radius:50px;cursor:pointer;margin-top:20px;transition:all 0.3s}.close-btn:hover{background:#ff5252;transform:translateY(-2px);box-shadow:0 5px 15px rgba(255,107,107,0.4)}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>IDM强制跳转已拦截</h1>
                <p>已阻止IDM官网的强制跳转页面</p>
                <p>此页面将在 <strong>3秒</strong> 后自动关闭</p>
                <button class="close-btn" id="manualClose">立即关闭</button>
            </div>
        </body>
        </html>`;
        document.getElementById('manualClose').addEventListener('click', () => {
            window.close();
        });
        setTimeout(() => {
            window.close();
        }, 1000);
    }
})();
