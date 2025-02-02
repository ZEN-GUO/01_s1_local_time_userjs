// ==UserScript==
// @run-at       document-end
// @name         Stage1本地时间增强版
// @namespace    http://tampermonkey.net/
// @version      0.2.0-alpha
// @description  在帖子时间旁显示用户本地时间
// @author       漠河泥头车
// @match        https://bbs.saraba1st.com/2b/*
// @icon         https://bbs.saraba1st.com/favicon.ico
// @grant        GM_addStyle
// @license      MIT
// ==/UserScript==

/* 严格模式避免变量污染 */
(function() {
    'use strict';
    GM_addStyle(`
        .s1-pt-time {
            color: #666 !important;
            margin-left: 8px;
            font-size: 0.9em;
        }
    `);

    function extractBeijingTime(element) {
        const isPstatus = element.classList.contains('pstatus');
        const timeContainer = isPstatus ? element : element.closest('[id^="authorposton"]') || element;
        const rawText = timeContainer.textContent.trim();
        
        // 匹配时间部分（忽略前后文本）
        const timeMatch = rawText.match(/(\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{2})/);
        if (!timeMatch) return null;
        
        // 解构并标准化
        const [full, year, month, day, hour, minute] = timeMatch[0].match(/(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{2})/);
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+08:00`;
    }

    function convertToLocalTime(beijingTimeISO) {
        try {
            const date = new Date(beijingTimeISO);
            const padZero = num => num.toString().padStart(2, '0');
            
            // 获取本地时区时间
            const localYear = date.getFullYear();
            const localMonth = date.getMonth() + 1; // 月份从0开始需要+1
            const localDate = date.getDate();
            const localHours = padZero(date.getHours());
            const localMinutes = padZero(date.getMinutes());

            // 格式化为 YYYY-M-D HH:mm
            return `${localYear}-${localMonth}-${localDate} ${localHours}:${localMinutes}`;
            
        } catch (e) {
            console.error('[时间转换] 失败:', e);
            return '转换失败';
        }
    }

    function createTimeElement() {
        const container = document.createElement('span');
        container.className = 's1-pt-time';
        return container;
    }

    function processAllTimeElements() {
        const timeElements = document.querySelectorAll(`
            em[id^="authorposton"], 
            em[id^="authorposton"] span, 
            a[href*="forum.php?mod=redirect"], 
            td.by em span,
            cite:not(:has(img)),
            i.pstatus
        `);

        timeElements.forEach(element => {
            const parent = element.parentElement;
            if (parent?.querySelector('.s1-pt-time')) return;
            if (element.dataset.processed || !element.textContent?.trim()) return;

            try {
                const beijingTimeISO = extractBeijingTime(element);
                if (!beijingTimeISO) return;
                
                const localTime = convertToLocalTime(beijingTimeISO);
                const timeBadge = createTimeElement();
                timeBadge.textContent = `本地: ${localTime}`;
                
                element.after(timeBadge);
                element.dataset.processed = "true";
                timeBadge.dataset.processed = "true";
            } catch (error) {
                console.error('[元素处理] 失败:', error);
            }
        });

        // 处理特殊cite标签
        document.querySelectorAll('cite').forEach(citeElement => {
            const textNode = Array.from(citeElement.childNodes)
                .find(n => n.nodeType === Node.TEXT_NODE);
            
            if (textNode?.textContent?.trim() && !citeElement.dataset.processed) {
                const timeMatch = textNode.textContent.match(/(\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{2})/);
                if (timeMatch) {
                    const timeBadge = createTimeElement();
                    timeBadge.textContent = `本地: ${convertToLocalTime(timeMatch[0])}`;
                    textNode.after(timeBadge);
                    citeElement.dataset.processed = "true";
                }
            }
        });
    }

    function setupMutationObserver() {
        let processing = false;
        const observer = new MutationObserver(() => {
            if (!processing) {
                processing = true;
                requestAnimationFrame(() => {
                    processAllTimeElements();
                    processing = false;
                });
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributeFilter: ['data-processed']
        });
    }

    function main() {
        console.log('[S1时间转换] 脚本启动');
        processAllTimeElements();
        setupMutationObserver();
    }

    if (document.readyState !== 'complete') {
        window.addEventListener('load', main);
    } else {
        main();
    }
})();