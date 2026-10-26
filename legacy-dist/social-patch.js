(function(){
  'use strict';
  const API = 'https://back.thabayehkom.app/api';
  function getToken(){
    for(const s of[localStorage,sessionStorage]){
      const t=s.getItem('token')||s.getItem('admin_token')||s.getItem('adminToken')||'';
      if(t)return t;
    }
    for(let i=0;i<localStorage.length;i++){
      const v=localStorage.getItem(localStorage.key(i)||'');
      if(v&&v.startsWith('eyJ'))return v;
    }
    return '';
  }
  // Add "Social Media" link to sidebar under Settings
  function addSidebarLink(){
    if(document.getElementById('social-media-nav')) return;
    const settingsLinks = [...document.querySelectorAll('a,li,div[class*="nav"],div[class*="menu"]')];
    const settingsItem = settingsLinks.find(el => el.textContent?.trim() === 'Settings' && el.tagName !== 'BODY');
    if(!settingsItem) return;
    const link = document.createElement('div');
    link.id = 'social-media-nav';
    link.style.cssText = 'cursor:pointer;padding:10px 20px 10px 32px;display:flex;align-items:center;gap:8px;color:inherit;font-size:14px';
    link.innerHTML = '<i class="fa fa-share-alt"></i> Social Media';
    link.addEventListener('click', () => showSocialPanel());
    settingsItem.parentElement?.appendChild(link);
  }
  function showSocialPanel(){
    let panel = document.getElementById('social-media-panel');
    if(panel){ panel.style.display='flex'; return; }
    panel = document.createElement('div');
    panel.id = 'social-media-panel';
    panel.style.cssText = 'display:flex;flex-direction:column;gap:16px;padding:32px;max-width:600px;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.15);position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;width:90%';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2 style="margin:0;font-size:20px">Social Media Links</h2>
        <button onclick="document.getElementById('social-media-panel').style.display='none'" style="border:none;background:none;font-size:22px;cursor:pointer">&times;</button>
      </div>
      <div id="social-msg" style="display:none;padding:10px;border-radius:6px;text-align:center"></div>
      ${[['snapchat','Snapchat'],['instagram','Instagram'],['twitter','Twitter / X'],['whatsApp','WhatsApp (number only, e.g. 96512345678)'],['facebook','Facebook'],['youtube','YouTube']].map(([key,label])=>`
        <div>
          <label style="font-size:13px;font-weight:500;display:block;margin-bottom:4px">${label}</label>
          <input id="social-${key}" type="text" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-size:14px" placeholder="${label} URL or handle">
        </div>
      `).join('')}
      <button id="social-save-btn" style="background:#8B1A1A;color:#fff;border:none;padding:12px;border-radius:8px;font-size:16px;cursor:pointer;font-weight:600">Save</button>
    `;
    document.body.appendChild(panel);
    // Load existing settings
    fetch(API+'/settings',{headers:{'Authorization':'Bearer '+getToken()}})
      .then(r=>r.json()).then(d=>{
        const s = d.settings || d.data?.settings || {};
        ['snapchat','instagram','twitter','whatsApp','facebook','youtube'].forEach(k=>{
          const el = document.getElementById('social-'+k);
          if(el) el.value = s[k]||s[k.toLowerCase()]||'';
        });
      }).catch(()=>{});
    document.getElementById('social-save-btn').addEventListener('click', async ()=>{
      const btn = document.getElementById('social-save-btn');
      btn.textContent='Saving...'; btn.disabled=true;
      const body = {};
      ['snapchat','instagram','twitter','whatsApp','facebook','youtube'].forEach(k=>{
        body[k] = document.getElementById('social-'+k)?.value||'';
      });
      try{
        const r = await fetch(API+'/admin/settings', {
          method:'PUT', headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
          body: JSON.stringify(body)
        });
        const data = await r.json();
        const msg = document.getElementById('social-msg');
        msg.style.display='block';
        if(data.status||data.success){
          msg.style.background='#d4edda'; msg.style.color='#155724'; msg.textContent='✓ Saved successfully!';
        } else {
          msg.style.background='#f8d7da'; msg.style.color='#721c24'; msg.textContent='Error: '+(data.message||'Failed to save');
        }
        setTimeout(()=>{msg.style.display='none'},3000);
      }catch(e){ alert('Error saving: '+e); }
      btn.textContent='Save'; btn.disabled=false;
    });
  }
  const obs = new MutationObserver(() => addSidebarLink());
  obs.observe(document.body, {childList:true, subtree:true});
  setTimeout(addSidebarLink, 2000);
})();
