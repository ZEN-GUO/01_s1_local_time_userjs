// ==UserScript==
// @name         Stage1 Local Time Replacer
// @name:zh-CN    Stage1本地时间替换版
// @namespace    user-NITOUCHE
// @version      1.0.0-alpha
// @description  Replaces China Standard Time with local time on Stage1 forums.
// @description:zh-CN 用本地时间直接替换Stage1论坛中的中国时间
// @author       漠河泥头车
// @match        https://bbs.saraba1st.com/2b/*
// @icon         https://bbs.saraba1st.com/favicon.ico
// @grant        GM_addStyle
// @license      MIT
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    GM_addStyle(`
        .s1-local-time {
            color: rgb(0, 0, 0) !important;
            font: inherit !important;
        }
    `);

    // 防抖处理锁
    let isProcessing = false;
    
    function convertBeijingToLocal(beijingTime) {
        try {
            const date = new Date(beijingTime + '+08:00');
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(/(\d+)\/(\d+)\/(\d+)/, '$1-$2-$3');
        } catch(e) {
            return beijingTime; // 解析失败时返回原时间
        }
    }

    function processElement(el) {
        // 检查是否已处理或包含已处理子元素
        if (el.dataset.timeReplaced || el.querySelector('[data-time-replaced]')) return;

        const timeRegex = /(\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{2})/;
        const match = el.textContent.match(timeRegex);
        if (!match) return;

        // 创建新文本节点代替直接操作HTML
        const newNode = document.createTextNode(
            el.textContent.replace(timeRegex, convertBeijingToLocal(match[0]))
        );
        
        // 清除所有子节点并添加新节点
        while (el.firstChild) el.removeChild(el.firstChild);
        el.appendChild(newNode);
        
        // 直接标记原始元素而非新建的节点
        el.dataset.timeReplaced = "true";
    }

    function processAll() {
        if (isProcessing) return;
        isProcessing = true;

        document.querySelectorAll(`
            em[id^="authorposton"],
            i.pstatus,
            cite,
            td.by em span,
            a[href*="forum.php?mod=redirect"]
        `).forEach(processElement);

        isProcessing = false;
    }

    // 初始化
    processAll();

    // 观察器配置优化
    new MutationObserver(mutations => {
        mutations.forEach(mut => {
            if (mut.type === 'childList') {
                mut.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        processAll();
                    }
                });
            }
        });
    }).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
    });
})();