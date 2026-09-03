// ==UserScript==
// @name         坚果云 WebDAV 双击复制
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  双击复制坚果云 WebDAV 的服务器地址和账户
// @match        https://www.jianguoyun.com/d/account*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Mariomoprc/my-userscripts/main/%E5%9D%9A%E6%9E%9C%E4%BA%91%20WebDAV%20%E5%8F%8C%E5%87%BB%E5%A4%8D%E5%88%B6.user.js
// @downloadURL  https://raw.githubusercontent.com/Mariomoprc/my-userscripts/main/%E5%9D%9A%E6%9E%9C%E4%BA%91%20WebDAV%20%E5%8F%8C%E5%87%BB%E5%A4%8D%E5%88%B6.user.js
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  function findTarget(){
    const allUls = document.querySelectorAll('ul');
    for (const ul of allUls) {
      if (ul.textContent.includes('dav.jianguoyun.com')) return ul;
    }
    return null;
  }

  let targetList = findTarget();
  if (!targetList) {
    let tries=0;
    const obs = new MutationObserver(() => {
      targetList = findTarget();
      if (targetList) { obs.disconnect(); init(); }
      if (++tries > 100) obs.disconnect();
    });
    try { obs.observe(document.body, {childList:true, subtree:true}); } catch(e){}
    setTimeout(()=>{ try{obs.disconnect();}catch(e){}; targetList=findTarget(); if(targetList) init(); }, 5000);
    return;
  }
  init();

  function init(){
    if (targetList.dataset.jianguoInited) return;
    targetList.dataset.jianguoInited='1';
    const lis = targetList.querySelectorAll('li');
    lis.forEach(li => {
      const txt = li.textContent;
      let val = null;
      let lbl = null;
      if (txt.includes('服务器地址')) {
        val = txt.split(/[：:]/).pop().trim();
        lbl = '服务器地址';
      } else if (txt.includes('账户') && txt.includes('@')) {
        val = txt.split(/[：:]/).pop().trim();
        lbl = '账户';
      }
      if (val && lbl) {
        li.dataset.copyValue = val;
        li.dataset.copyLabel = lbl;
        li.dataset.original = li.innerHTML;
        li.style.cursor = 'pointer';
        li.title = `双击复制${lbl}`;
      }
    });

    targetList.addEventListener('dblclick', (e) => {
      const li = e.target.closest('li');
      if (!li || !li.dataset.copyValue) return;
      e.preventDefault();
      const val = li.dataset.copyValue;
      navigator.clipboard.writeText(val).then(() => {
        li.innerHTML = `<span style="color:#22c55e;font-weight:bold">✓ 已复制: ${val}</span>`;
        li.style.backgroundColor = 'rgba(34,197,94,0.3)';
        setTimeout(() => {
          li.innerHTML = li.dataset.original;
          li.style.backgroundColor = '';
        }, 1500);
      }).catch(err => alert('复制失败: ' + err.message));
    });
  }
})();
