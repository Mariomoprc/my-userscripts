// ==UserScript==
// @name         坚果云 WebDAV 双击复制
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  双击复制坚果云 WebDAV 的服务器地址和账户
// @match        https://www.jianguoyun.com/d/account*
// @grant        navigator.clipboard.writeText
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const allUls = document.querySelectorAll('ul');
  let targetList = null;

  for (const ul of allUls) {
    if (ul.textContent.includes('dav.jianguoyun.com')) {
      targetList = ul;
      break;
    }
  }

  if (!targetList) return;

  const lis = targetList.querySelectorAll('li');

  lis.forEach(li => {
    const txt = li.textContent;
    let val = null;
    let lbl = null;

    if (txt.includes('服务器地址')) {
      val = txt.split('：').pop().trim();
      lbl = '服务器地址';
    } else if (txt.includes('账户') && txt.includes('@')) {
      val = txt.split('：').pop().trim();
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
})();