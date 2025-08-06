// ==UserScript==
// @name         STEAM-某A插件中国区域价格比较
// @name:zh      STEAM-某A插件中国区域价格比较
// @name:en      STEAM China Region Price Comparator
// @namespace    https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @version      3.3.3
// @description  强制STEAM商店显示中国区域内容（需配合中国IP使用）
// @description:zh 强制STEAM商店显示中国区域内容（需配合中国IP使用）
// @description:en Force Steam store to display China region content (requires Chinese IP)
// @author       MaMihLaPiNaTaPaI0
// @license      MIT
// @homepageURL  https://github.com/MaMihLaPiNaTaPaI0/TM-JB
// @supportURL   https://github.com/MaMihLaPiNaTaPaI0/TM-JB/issues
// @updateURL    https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM-A.user.js
// @downloadURL  https://raw.githubusercontent.com/MaMihLaPiNaTaPaI0/TM-JB/main/scripts/STEAM-A.user.js
// @match        *://store.steampowered.com/*
// @match        *://steamcommunity.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-start
// @icon         https://github.com/MaMihLaPiNaTaPaI0.png
// @icon64       https://github.com/MaMihLaPiNaTaPaI0.png
// @noframes

// ==/UserScript==




(function() {
    'use strict';


    const REGION_LOCK_KEY = 'steamRegionLock';


    const forceChinaRegion = () => {

        const currentUrl = new URL(window.location.href);


        const validPaths = [
            '/app/', '/bundle/', '/cart/', '/store'
        ];
        if (!validPaths.some(path => currentUrl.pathname.includes(path))) return;


        if (GM_getValue(REGION_LOCK_KEY, false)) return;


        const setPermanentParam = (params, key, value) => {
            if (params.get(key) !== value) {
                params.set(key, value);
                return true;
            }
            return false;
        };

        const urlParams = currentUrl.searchParams;
        let needUpdate = false;


        needUpdate |= setPermanentParam(urlParams, 'cc', 'cn');


        needUpdate |= setPermanentParam(urlParams, 'l', 'schinese');


        if (!document.cookie.includes('Steam_Language=schinese')) {
            document.cookie = 'Steam_Language=schinese; domain=.steampowered.com; path=/; max-age=31536000';
            document.cookie = 'Steam_Language=schinese; domain=.steamcommunity.com; path=/; max-age=31536000';
        }


        if (needUpdate) {
            GM_setValue(REGION_LOCK_KEY, true);
            const newUrl = currentUrl.toString();


            setTimeout(() => {
                window.location.replace(newUrl);
            }, 50);
        }
    };


    const cleanupRedirectLock = () => {
        if (GM_getValue(REGION_LOCK_KEY, false)) {
            GM_deleteValue(REGION_LOCK_KEY);
        }
    };


    window.addEventListener('load', cleanupRedirectLock);
    window.addEventListener('beforeunload', cleanupRedirectLock);


    forceChinaRegion();
})();
