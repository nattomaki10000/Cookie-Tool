(function(){
  // Create modal UI
  function css(node, obj){ for(let k in obj) node.style[k]=obj[k]; }
  const overlay = document.createElement('div');
  overlay.id = 'cookie-saver-overlay';
  css(overlay, {
    position:'fixed', left:0, top:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)',
    zIndex: 9999999, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif'
  });

  const box = document.createElement('div');
  css(box, {width:'760px', maxWidth:'96%', maxHeight:'86%', overflow:'auto', background:'#fff', borderRadius:'8px', padding:'14px', boxSizing:'border-box', boxShadow:'0 6px 30px rgba(0,0,0,0.3)'});
  overlay.appendChild(box);

  const title = document.createElement('h2');
  title.textContent = 'Cookie Manager — 保存 / 削除 / 復元';
  css(title,{margin:'0 0 8px 0', fontSize:'18px'});
  box.appendChild(title);

  const info = document.createElement('div');
  info.innerHTML = '<small>※ HttpOnly やブラウザが隠す属性は取得できません。保存されるのは名前と値です。</small>';
  css(info,{color:'#444', marginBottom:'10px'});
  box.appendChild(info);

  // Controls row
  const ctrl = document.createElement('div'); css(ctrl,{display:'flex', gap:'8px', marginBottom:'10px', flexWrap:'wrap'});
  box.appendChild(ctrl);

  const search = document.createElement('input'); search.placeholder='フィルタ（名前/値）';
  css(search,{flex:'1 1 200px', padding:'6px 8px', border:'1px solid #bbb', borderRadius:'4px'});
  ctrl.appendChild(search);

  const expiryInput = document.createElement('input'); expiryInput.type='number'; expiryInput.value='365';
  css(expiryInput,{width:'90px', padding:'6px 8px', border:'1px solid #bbb', borderRadius:'4px'});
  expiryInput.title='復元時の有効日数（デフォルト365日）';
  ctrl.appendChild(expiryInput);

  const secureChk = document.createElement('label');
  secureChk.innerHTML = '<input type="checkbox"> Secure';
  css(secureChk,{alignSelf:'center'});
  ctrl.appendChild(secureChk);

  const samesiteSel = document.createElement('select');
  samesiteSel.innerHTML = '<option value="">SameSite (unset)</option><option value="Lax">Lax</option><option value="Strict">Strict</option><option value="None">None</option>';
  css(samesiteSel,{padding:'6px', border:'1px solid #bbb', borderRadius:'4px'});
  ctrl.appendChild(samesiteSel);

  const btnClose = document.createElement('button'); btnClose.textContent='閉じる';
  css(btnClose,{padding:'6px 10px', borderRadius:'4px'});
  ctrl.appendChild(btnClose);

  // Buttons row
  const btnRow = document.createElement('div'); css(btnRow,{display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap'});
  box.appendChild(btnRow);

  const btnDownload = document.createElement('button'); btnDownload.textContent='選択をダウンロード (.txt)';
  const btnDelete = document.createElement('button'); btnDelete.textContent='選択を削除';
  const fileInput = document.createElement('input'); fileInput.type='file'; fileInput.accept='.txt,.json'; css(fileInput,{display:'none'});
  const btnImport = document.createElement('button'); btnImport.textContent='保存ファイルを読み込む';
  const btnRestoreAll = document.createElement('button'); btnRestoreAll.textContent='読み込んだファイルを復元';
  [btnDownload,btnDelete,btnImport,btnRestoreAll].forEach(b=>{ css(b,{padding:'6px 10px', borderRadius:'4px'}); btnRow.appendChild(b); });
  btnRow.appendChild(fileInput);

  // Cookie list container
  const listWrap = document.createElement('div');
  css(listWrap,{border:'1px solid #ddd', borderRadius:'6px', padding:'8px', maxHeight:'420px', overflow:'auto', background:'#fafafa'});
  box.appendChild(listWrap);

  const note = document.createElement('div'); note.style.marginTop='8px';
  note.innerHTML = `<small>保存形式: JSON（name, value, savedAt, host）。復元時は現在のドメインにセットします。</small>`;
  box.appendChild(note);

  document.body.appendChild(overlay);

  // Close handler
  btnClose.onclick = ()=> overlay.remove();

  // Parse cookies
  function getCookiesArray(){
    const raw = document.cookie || '';
    if(!raw) return [];
    return raw.split('; ').map(s=>{
      const idx = s.indexOf('=');
      const name = idx>-1 ? s.slice(0,idx) : s;
      const value = idx>-1 ? s.slice(idx+1) : '';
      return {name: decodeURIComponent(name), value: decodeURIComponent(value)};
    });
  }

  // Render list
  function renderList(filter=''){
    listWrap.innerHTML='';
    const arr = getCookiesArray().filter(c=>{
      if(!filter) return true;
      return (c.name+c.value).toLowerCase().includes(filter.toLowerCase());
    });
    if(arr.length===0){ listWrap.innerHTML='<div style="color:#666">No cookies found for this site.</div>'; return; }
    const table = document.createElement('table'); css(table,{width:'100%', borderCollapse:'collapse'});
    arr.forEach((c,i)=>{
      const tr = document.createElement('tr');
      const td0 = document.createElement('td'); css(td0,{width:'28px', padding:'6px'});
      const cb = document.createElement('input'); cb.type='checkbox'; cb.dataset.name=c.name;
      td0.appendChild(cb);
      const td1 = document.createElement('td'); css(td1,{padding:'6px', wordBreak:'break-all'});
      td1.innerHTML = `<strong>${escapeHtml(c.name)}</strong><div style="color:#333">${escapeHtml(c.value)}</div>`;
      tr.appendChild(td0); tr.appendChild(td1);
      table.appendChild(tr);
    });
    listWrap.appendChild(table);
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  renderList();

  search.addEventListener('input', ()=> renderList(search.value));

  // Download selected
  btnDownload.onclick = ()=>{
    const checkboxes = listWrap.querySelectorAll('input[type=checkbox]:checked');
    if(checkboxes.length===0){ alert('まずは保存したい cookie を選んでください。'); return; }
    const data = [];
    checkboxes.forEach(cb=>{
      const name = cb.dataset.name;
      const arr = getCookiesArray().filter(c=>c.name===name);
      if(arr.length>0) data.push({name: arr[0].name, value: arr[0].value});
    });
    const blob = new Blob([JSON.stringify({host:location.hostname, savedAt:(new Date()).toISOString(), cookies:data}, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${location.hostname}-cookies-${(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'_')}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  // Delete selected
  btnDelete.onclick = ()=>{
    if(!confirm('選択した cookie を削除しますか？（復元は保存ファイルが必要です）')) return;
    const checkboxes = listWrap.querySelectorAll('input[type=checkbox]:checked');
    if(checkboxes.length===0){ alert('削除する cookie を選んでください。'); return; }
    checkboxes.forEach(cb=>{
      const name = cb.dataset.name;
      // delete by setting expiry in past for both path=/ and current path
      document.cookie = encodeURIComponent(name) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = encodeURIComponent(name) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    });
    setTimeout(()=> renderList(search.value), 200);
  };

  // Import file
  let importedData = null;
  btnImport.onclick = ()=> fileInput.click();
  fileInput.onchange = async (e)=>{
    const f = e.target.files[0];
    if(!f) return;
    const txt = await f.text();
    try{
      const obj = JSON.parse(txt);
      if(!obj.cookies || !Array.isArray(obj.cookies)) {
        alert('ファイル形式が予期した JSON ではありません。cookies 配列が必要です。');
        return;
      }
      importedData = obj;
      alert(`読み込み成功: ${obj.cookies.length} 個の cookie を読み込みました。\n「読み込んだファイルを復元」で復元します。`);
    }catch(err){
      alert('JSON の読み込みに失敗しました: ' + err.message);
      return;
    }
  };

  // Restore imported
  btnRestoreAll.onclick = ()=>{
    if(!importedData){ alert('まず保存ファイルを読み込んでください。'); return; }
    const days = parseInt(expiryInput.value) || 365;
    const expiry = new Date(Date.now() + days*24*60*60*1000).toUTCString();
    const secure = secureChk.querySelector('input').checked;
    const samesite = samesiteSel.value;
    importedData.cookies.forEach(c=>{
      const name = encodeURIComponent(c.name);
      const value = encodeURIComponent(c.value);
      let cookieStr = `${name}=${value}; path=/; expires=${expiry};`;
      if(secure) cookieStr += ' Secure;';
      if(samesite) cookieStr += ' SameSite=' + samesite + ';';
      // Domain not set, so cookie applies to current host
      document.cookie = cookieStr;
    });
    alert(`復元完了: ${importedData.cookies.length} 個をセットしました。`);
    setTimeout(()=> renderList(search.value), 200);
  };

})();
