(function(){
  'use strict';
  const API='https://back.thabayehkom.app/api';
  function getToken(){for(const s of[localStorage,sessionStorage]){const t=s.getItem('token')||s.getItem('admin_token')||s.getItem('adminToken')||'';if(t)return t;}for(let i=0;i<localStorage.length;i++){const v=localStorage.getItem(localStorage.key(i)||'');if(v&&v.startsWith('eyJ'))return v;}return '';}
  function isBannerModal(m){return [...m.querySelectorAll('h1,h2,h3,h4,[class*="title"],[class*="header"]')].some(el=>{const t=(el.textContent||'').trim();return t.includes('Banner')&&!t.includes('Countr');});}
  function injectFields(modal){
    if(modal.dataset.videoPatchDone)return;modal.dataset.videoPatchDone='1';
    const fileInput=modal.querySelector('input[type="file"]');if(!fileInput)return;
    const imageRow=fileInput.closest('div[class]')||fileInput.parentElement?.parentElement||fileInput.parentElement;if(!imageRow)return;
    const insertTarget=imageRow.parentElement||imageRow;if(insertTarget.querySelector('#bp-type-row'))return;
    const typeRow=document.createElement('div');typeRow.style.cssText='margin-bottom:16px';typeRow.id='bp-type-row';
    typeRow.innerHTML=`<label style="display:block;font-weight:600;margin-bottom:6px;font-size:14px">Banner Type</label><select id="bp-type" style="width:100%;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-size:14px;background:#fff"><option value="image">🖼️ Image Banner</option><option value="video">🎬 Video Banner</option></select>`;
    insertTarget.insertBefore(typeRow,imageRow);
    const videoRow=document.createElement('div');videoRow.id='bp-video-row';videoRow.style.cssText='display:none;margin-bottom:16px';
    videoRow.innerHTML=`<label style="display:block;font-weight:600;margin-bottom:6px;font-size:14px">Video File</label><input type="file" id="bp-video-file" accept="video/mp4,video/webm" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:8px"><div id="bp-prog-wrap" style="display:none;margin-top:8px"><div style="background:#eee;border-radius:4px;height:10px"><div id="bp-prog-bar" style="height:100%;width:0%;background:#8B1A1A;transition:width .3s"></div></div><div id="bp-prog-txt" style="font-size:12px;margin-top:4px;color:#555"></div></div>`;
    insertTarget.insertBefore(videoRow,imageRow.nextSibling);
    document.getElementById('bp-type').addEventListener('change',function(){const v=this.value==='video';imageRow.style.display=v?'none':'';videoRow.style.display=v?'':'none';});
    const saveBtn=[...modal.querySelectorAll('button')].find(b=>(b.textContent||'').trim()==='Save');if(!saveBtn||saveBtn.dataset.bpPatched)return;saveBtn.dataset.bpPatched='1';
    saveBtn.addEventListener('click',async function(e){
      const type=document.getElementById('bp-type')?.value;if(type!=='video')return;
      const vf=document.getElementById('bp-video-file');if(!vf?.files?.[0]){alert('Select a video file');e.preventDefault();e.stopPropagation();return;}
      e.preventDefault();e.stopPropagation();
      const pw=document.getElementById('bp-prog-wrap'),pb=document.getElementById('bp-prog-bar'),pt=document.getElementById('bp-prog-txt');
      pw.style.display='block';saveBtn.disabled=true;saveBtn.textContent='Uploading...';
      const fd=new FormData();fd.append('file',vf.files[0]);
      const xhr=new XMLHttpRequest();xhr.open('POST',API+'/upload/video');xhr.setRequestHeader('Authorization','Bearer '+getToken());
      xhr.upload.onprogress=e=>{if(e.lengthComputable){const p=Math.round(e.loaded/e.total*100);pb.style.width=p+'%';pt.textContent=p+'%';}};
      xhr.onload=async function(){if(xhr.status===200){let resp;try{resp=JSON.parse(xhr.responseText);}catch(ex){pt.textContent='❌ Bad response';saveBtn.disabled=false;saveBtn.textContent='Save';return;}const url=resp.url||resp.data?.url;if(!url){pt.textContent='❌ No URL';saveBtn.disabled=false;saveBtn.textContent='Save';return;}pt.textContent='Saving...';const statusSel=[...modal.querySelectorAll('select')].find(s=>s.id!=='bp-type');const status=statusSel?.value||'active';try{const r=await fetch(API+'/admin/banners',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({type:3,video_url:url,status})});const d=await r.json();if(r.ok||d.status||d.success){pt.textContent='✅ Saved!';setTimeout(()=>window.location.reload(),1500);}else{pt.textContent='❌ '+(d.message||'error');saveBtn.disabled=false;saveBtn.textContent='Save';}}catch(ex){pt.textContent='❌ '+ex.message;saveBtn.disabled=false;saveBtn.textContent='Save';}}else{pt.textContent='❌ HTTP '+xhr.status;saveBtn.disabled=false;saveBtn.textContent='Save';}};
      xhr.onerror=()=>{pt.textContent='❌ Network error';saveBtn.disabled=false;saveBtn.textContent='Save';};xhr.send(fd);
    },true);
  }
  new MutationObserver(()=>{document.querySelectorAll('[role="dialog"],[class*="modal"],[class*="Modal"]').forEach(m=>{if(m.dataset.videoPatchDone)return;if(isBannerModal(m)&&m.querySelector('input[type="file"]')){injectFields(m);}});}).observe(document.body,{childList:true,subtree:true});
})();
