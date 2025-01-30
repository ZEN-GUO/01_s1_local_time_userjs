// ==UserScript==
// @run-at       document-end
// @name         Stage1本地时间增强版
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  在帖子时间旁显示太平洋时间
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
        const timeContainer = element.closest('[id^="authorposton"]') || element;
        const rawText = timeContainer.textContent.trim();
        
        // 匹配时间部分（忽略前后文本）
        const timeMatch = rawText.match(/(\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{2})/);
        if (!timeMatch) return null;

        // 解构并标准化
        const [full, year, month, day, hour, minute] = timeMatch[0].match(/(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{2})/);
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+08:00`;
    }

    function convertToPacificTime(beijingTimeISO) {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/Los_Angeles',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            const date = new Date(beijingTimeISO);
            return formatter.format(date)
                .replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2')
                .replace('24:', '00:');
        } catch (e) {
            console.error('转换失败:', e);
            return '转换失败';
        }
    }

    /**
     * 创建时间显示元素（优化防重复逻辑）
     */
    function createPacificTimeElement() {
        const container = document.createElement('span');
        container.className = 's1-pt-time'; // 使用class代替style
        return container;
    }

    /**
     * 处理所有时间元素（核心逻辑优化）
     */
    function processAllTimeElements() {
        // 扩展选择器（关键修改）
        const timeElements = document.querySelectorAll(`
            em[id^="authorposton"],          /* 匹配直接包含时间的em元素 */
            em[id^="authorposton"] span,     /* 匹配嵌套span的情况 */
            a[href*="forum.php?mod=redirect"], 
            td.by em span,
            cite:not(:has(img))
        `);

        timeElements.forEach(element => {
            // 新增父元素检查（防止重复处理）
            const parent = element.parentElement;
            if (parent.querySelector('.s1-pt-time')) return;
            
            // 新增有效性检查
            if (element.dataset.processed || !element.textContent.trim()) return;
            
            try {
                const beijingTimeISO = extractBeijingTime(element);
                if (!beijingTimeISO) return;

                const pacificTime = convertToPacificTime(beijingTimeISO);
                const timeBadge = createPacificTimeElement();
                timeBadge.textContent = `PT: ${pacificTime}`;

                // 智能插入位置判断（新增）
                const insertPosition = element.nextSibling || 'afterend';
                element.after(timeBadge);
                
                element.dataset.processed = "true";
                timeBadge.dataset.processed = "true"; // 标记新元素
            } catch (error) {
                console.error('处理失败:', error);
            }
        });

        // 特殊处理cite标签（优化）
        document.querySelectorAll('cite').forEach(citeElement => {
            const textNode = Array.from(citeElement.childNodes)
                .find(n => n.nodeType === Node.TEXT_NODE);
            
            if (textNode?.textContent.trim() && !citeElement.dataset.processed) {
                const timeMatch = textNode.textContent.match(/(\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{2})/);
                if (timeMatch) {
                    const timeBadge = createPacificTimeElement();
                    timeBadge.textContent = `PT: ${convertToPacificTime(timeMatch[0])}`;
                    textNode.after(timeBadge);
                    citeElement.dataset.processed = "true";
                }
            }
        });
    }

    /**
     * 优化的DOM监听器（防止重复触发）
     */
    function setupMutationObserver() {
        let processing = false;
        const observer = new MutationObserver(mutations => {
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
            attributeFilter: ['data-processed'] // 只监听处理标记变化
        });
    }

    // 主函数保持不变
    function main() {
        console.log('[S1时间转换] 脚本启动');
        processAllTimeElements();
        setupMutationObserver();
    }

    // 初始化逻辑优化
    if (document.readyState !== 'complete') {
        window.addEventListener('load', main);
    } else {
        main();
    }
})();