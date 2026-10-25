/* country-patch.js v7 — working flag upload */
(function () {
  'use strict';
  function getToken() {
    for (let k of Object.keys(localStorage)) { try { const v = JSON.parse(localStorage[k]); if (v?.token) return v.token; } catch (_) {} }
    for (let k of Object.keys(sessionStorage)) { try { const v = JSON.parse(sessionStorage[k]); if (v?.token) return v.token; } catch (_) {} }
    return null;
  }
  function apiBase() { return window.location.origin.replace(/\/admin.*/, ''); }

  async function addFlagColumn() {
    const table = document.querySelector('table');
    if (!table || table.dataset.flagDone) return;
    table.dataset.flagDone = '1';
    const hRow = table.querySelector('thead tr');
    if (!hRow) return;
    const th = document.createElement('th');
    th.textContent = 'Flag';
    th.style.cssText = 'padding:8px 12px;font-weight:600;color:#666;';
    hRow.insertBefore(th, hRow.firstChild);
    let flagMap = {};
    try {
      const token = getToken();
      const r = await fetch(apiBase() + '/api/admin/countries?limit=100', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
      const j = await r.json();
      (j.data || j.rows || j || []).forEach(c => { flagMap[c.id] = c.icon_url || c.image || ''; });
    } catch (_) {}
    table.querySelectorAll('tbody tr').forEach((tr, i) => {
      const td = document.createElement('td');
      td.style.cssText = 'padding:6px 12px;';
      const a = tr.querySelector('a[href*="edit"]');
      let id = null;
      if (a) { const pts = (a.href||'').match(/\/(\d+)/g); if (pts) id = parseInt(pts[pts.length-1]); }
      const url = id ? (flagMap[id]||'') : (Object.values(flagMap)[i]||'');
      if (url) { const img = document.createElement('img'); img.src = url; img.style.cssText = 'width:40px;height:26px;object-fit:cover;border-radius:3px;border:1px solid #ddd;'; img.onerror=()=>{td.innerHTML='<span style="color:#ccc">—</span>';}; td.appendChild(img); }
      else td.innerHTML = '<span style="color:#ccc">—</span>';
      tr.insertBefore(td, tr.firstChild);
    });
  }

  function isCountryModal(el) {
    return [...el.querySelectorAll('h1,h2,h3,h4,[class*="title"],[class*="header"]')].some(e => /countr/i.test(e.textContent) && !/banner/i.test(e.textContent));
  }

  function injectFlagField(modal) {
    if (modal.dataset.cpDone) return;
    modal.dataset.cpDone = '1';

    // Remove any existing cp-wrap duplicates first
    document.querySelectorAll('#cp-wrap').forEach(el => el.remove());

    const m = (location.hash + location.pathname).match(/countries\/(\d+)/);
    const countryId = m ? m[1] : null;
    const token = getToken();

    // Find a good insertion point inside the modal
    let parent = modal.querySelector('form') || modal;
    let refNode = null;
    modal.querySelectorAll('label').forEach(lbl => {
      if (/status/i.test(lbl.textContent)) {
        refNode = lbl.closest('[class*="row"],[class*="group"],div[style]') || lbl.parentElement;
        parent = refNode?.parentElement || parent;
      }
    });

    const wrap = document.createElement('div');
    wrap.id = 'cp-wrap';
    wrap.style.cssText = 'margin:12px 16px;padding:10px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:6px;';
    wrap.innerHTML = `
      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#333;">🏳️ Country Flag</label>
      <input type="file" id="cp-file" accept="image/*" style="font-size:13px;display:block;margin-bottom:8px;">
      <div id="cp-preview" style="margin-bottom:4px;"></div>
      <div id="cp-status" style="font-size:12px;color:#888;"></div>`;

    if (refNode && parent) parent.insertBefore(wrap, refNode);
    else parent.appendChild(wrap);

    // Pre-fill if existing flag
    if (countryId) {
      fetch(apiBase() + '/api/admin/countries/' + countryId, { headers: token ? { Authorization: 'Bearer ' + token } : {} })
        .then(r=>r.json()).then(d => {
          const url = d.data?.icon_url || d.data?.image || d.icon_url || d.image || '';
          if (url) {
            wrap.querySelector('#cp-preview').innerHTML = `<img src="${url}" style="width:60px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #ddd;">`;
          }
        }).catch(()=>{});
    }

    let uploadedUrl = '';
    wrap.querySelector('#cp-file').addEventListener('change', async function() {
      const file = this.files[0]; if (!file) return;
      const statusEl = wrap.querySelector('#cp-status');
      statusEl.textContent = 'Uploading…'; statusEl.style.color = '#888';
      const fd = new FormData();
      fd.append('file', file);
      try {
        const r = await fetch(apiBase() + '/api/upload/single', {
          method: 'POST',
          headers: token ? { Authorization: 'Bearer ' + token } : {},
          body: fd
        });
        const d = await r.json();
        uploadedUrl = d.url || '';
        if (uploadedUrl) {
          statusEl.textContent = '✅ Click Save to apply';
          statusEl.style.color = 'green';
          wrap.querySelector('#cp-preview').innerHTML = `<img src="${uploadedUrl}" style="width:60px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #ddd;">`;
        } else {
          statusEl.textContent = '⚠️ ' + JSON.stringify(d).substring(0,100);
          statusEl.style.color = 'orange';
        }
      } catch(e) {
        statusEl.textContent = '❌ ' + e.message;
        statusEl.style.color = 'red';
      }
    });

    // Hook Save button
    function hookBtn(btn) {
      if (btn.dataset.cpHooked) return;
      if (!/save|update|حفظ|تحديث/i.test(btn.textContent) && btn.type !== 'submit') return;
      btn.dataset.cpHooked = '1';
      btn.addEventListener('click', async function(e) {
        if (!uploadedUrl || !countryId) return;
        e.preventDefault(); e.stopImmediatePropagation();
        const statusEl = wrap.querySelector('#cp-status');
        statusEl.textContent = 'Saving…'; statusEl.style.color = '#888';
        try {
          const r = await fetch(apiBase() + '/api/admin/countries/' + countryId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
            body: JSON.stringify({ icon_url: uploadedUrl, image: uploadedUrl })
          });
          const d = await r.json();
          if (r.ok) {
            statusEl.textContent = '✅ Flag saved!'; statusEl.style.color = 'green';
            setTimeout(() => window.location.reload(), 800);
          } else {
            statusEl.textContent = '❌ ' + JSON.stringify(d).substring(0,80); statusEl.style.color = 'red';
          }
        } catch(e2) {
          statusEl.textContent = '❌ ' + e2.message; statusEl.style.color = 'red';
        }
      }, true);
    }

    modal.querySelectorAll('button').forEach(hookBtn);
    new MutationObserver(() => modal.querySelectorAll('button').forEach(hookBtn)).observe(modal, { childList: true, subtree: true });
  }

  new MutationObserver(() => {
    const table = document.querySelector('table');
    if (table && !table.dataset.flagDone) addFlagColumn();
    document.querySelectorAll('[class*="modal"],[role="dialog"]').forEach(modal => {
      if (!modal.offsetParent) return;
      if (isCountryModal(modal) && !modal.dataset.cpDone) injectFlagField(modal);
    });
  }).observe(document.body, { childList: true, subtree: true });

  setTimeout(() => { const t = document.querySelector('table'); if (t && !t.dataset.flagDone) addFlagColumn(); }, 1500);
  setTimeout(() => { const t = document.querySelector('table'); if (t && !t.dataset.flagDone) addFlagColumn(); }, 3500);
})();
