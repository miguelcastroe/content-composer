const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const zonesRoot = document.getElementById('zonesRoot');
const fullUpload = document.getElementById('fullUpload');

let fullStoryboardImage = null;
let zones = [];

const FIXED = {
  pad: 28,
  defaultTextColor: '#ffffff',
  numXOffset: 22,
  numYOffset: 22,
  numSize: 42,
  numGap: 20
};

function currentFormat(){ return document.getElementById('format').value; }
function currentMode(){ return document.getElementById('inputMode').value; }
function currentCount(){ return currentFormat()==='single' ? 1 : +document.getElementById('frameCount').value; }

function setCanvasSize(){
  if(currentFormat()==='storyboard'){
    canvas.width = 1920;
    canvas.height = 1080;
    document.getElementById('previewLabel').textContent = 'Preview · 1920 × 1080';
  }else{
    canvas.width = 1080;
    canvas.height = 1350;
    document.getElementById('previewLabel').textContent = 'Preview · 1080 × 1350';
  }
}

function blankZoneData(n){
  return Array.from({length:n}, (_,i)=>({
    img:null,
    text:'',
    pos: currentFormat()==='single' ? 'bottom-left' : (i===0 ? 'top-left' : 'bottom-left'),
    size: currentFormat()==='single' ? 52 : (i===0 ? 34 : 42)
  }));
}

function rebuildZones(){
  const count = currentCount();
  zones = blankZoneData(count);
  zonesRoot.innerHTML = '';

  for(let i=0;i<count;i++){
    const card = document.createElement('div');
    card.className = 'frame-card';
    const title = currentFormat()==='single' ? 'IMAGEN' : `FRAME ${i+1}`;
    const uploadField = (currentFormat()==='storyboard' && currentMode()==='separate') || currentFormat()==='single'
      ? `<label>Imagen</label>
         <div class="file-input">
           <input type="file" accept="image/*" data-file="${i}" />
           <div class="file-input-ui">
             <span class="file-name" data-file-name="${i}">Sin archivo</span>
             <span class="file-action">Elegir</span>
           </div>
         </div>`
      : '';
    card.innerHTML = `
      <div class="frame-title">${title}</div>
      ${uploadField}
      <label style="margin-top:${uploadField ? '10px':'0'}">Texto en imagen</label>
      <textarea data-text="${i}" placeholder="Texto exacto"></textarea>
      <div class="row">
        <div>
          <label>Posición</label>
          <select data-pos="${i}">
            <option value="top-left">top-left</option>
            <option value="top-center">top-center</option>
            <option value="top-right">top-right</option>
            <option value="middle-left">middle-left</option>
            <option value="middle-center">middle-center</option>
            <option value="middle-right">middle-right</option>
            <option value="bottom-left" selected>bottom-left</option>
            <option value="bottom-center">bottom-center</option>
            <option value="bottom-right">bottom-right</option>
          </select>
        </div>
        <div>
          <label>Tamaño</label>
          <input type="number" min="18" max="120" value="${zones[i].size}" data-size="${i}" />
        </div>
      </div>
    `;
    zonesRoot.appendChild(card);
  }

  zonesRoot.querySelectorAll('[data-file]').forEach(el=>{
    el.addEventListener('change', e=>{
      const i = +e.target.dataset.file;
      const file = e.target.files[0];
      if(!file) return;
      const nameEl = zonesRoot.querySelector(`[data-file-name="${i}"]`);
      if(nameEl) nameEl.textContent = file.name;
      const img = new Image();
      img.onload = ()=>{ zones[i].img = img; render(); };
      img.src = URL.createObjectURL(file);
    });
  });

  zonesRoot.querySelectorAll('[data-text]').forEach(el=>{
    el.addEventListener('input', e=>{ zones[+e.target.dataset.text].text = e.target.value; render(); });
  });
  zonesRoot.querySelectorAll('[data-pos]').forEach(el=>{
    el.addEventListener('change', e=>{ zones[+e.target.dataset.pos].pos = e.target.value; render(); });
  });
  zonesRoot.querySelectorAll('[data-size]').forEach(el=>{
    el.addEventListener('input', e=>{ zones[+e.target.dataset.size].size = +e.target.value; render(); });
  });

  render();
}

function coverImage(img, x, y, w, h){
  const ir = img.width / img.height;
  const rr = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if(ir > rr){ sw = img.height * rr; sx = (img.width - sw) / 2; }
  else { sh = img.width / rr; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapText(text, maxWidth, fontSize){
  ctx.font = `600 ${fontSize}px 'Clash Grotesk', Inter, Arial, Helvetica, sans-serif`;
  const words = (text || '').trim().split(/\s+/);
  if(!words[0]) return [];
  const lines = [];
  let line = '';
  words.forEach(word=>{
    const test = line ? `${line} ${word}` : word;
    if(ctx.measureText(test).width > maxWidth && line){
      lines.push(line);
      line = word;
    } else line = test;
  });
  if(line) lines.push(line);
  return lines;
}

function anchor(pos, x, y, w, h, pad, blockH){
  let ax = x + pad, ay = y + pad, align = 'left';
  if(pos.includes('right')){ ax = x + w - pad; align = 'right'; }
  else if(pos.includes('center')){ ax = x + w/2; align = 'center'; }

  const numberSafeBottom = y + FIXED.numYOffset + FIXED.numSize + FIXED.numGap;
  if(pos === 'top-left') ay = Math.max(ay, numberSafeBottom);

  if(pos.startsWith('middle')) ay = y + (h - blockH) / 2;
  if(pos.startsWith('bottom')) ay = y + h - pad - blockH;
  return {x:ax, y:ay, align};
}

function drawTextBlock(text, pos, fontSize, x, y, w, h){
  const maxW = w - FIXED.pad * 2;
  const lines = wrapText(text, maxW, fontSize);
  if(!lines.length) return;

  const lh = Math.round(fontSize * 1.13);
  const blockH = lines.length * lh;
  const a = anchor(pos, x, y, w, h, FIXED.pad, blockH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.shadowColor = 'rgba(0,0,0,.48)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  ctx.font = `600 ${fontSize}px 'Clash Grotesk', Inter, Arial, Helvetica, sans-serif`;
  ctx.fillStyle = FIXED.defaultTextColor;
  ctx.textAlign = a.align;
  ctx.textBaseline = 'top';
  lines.forEach((line, idx)=> ctx.fillText(line, a.x, a.y + idx * lh));
  ctx.restore();
}

function drawNumber(n, x, y){
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + FIXED.numXOffset, y + FIXED.numYOffset, FIXED.numSize, FIXED.numSize);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 20px Inter, Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), x + FIXED.numXOffset + FIXED.numSize/2, y + FIXED.numYOffset + FIXED.numSize/2 + 1);
  ctx.restore();
}

function drawFrameSeparators(count, gutter){
  if(count <= 1 || gutter <= 0) return;
  const frameW = (canvas.width - gutter * (count - 1)) / count;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for(let i=1;i<count;i++){
    const gx = i * frameW + (i - 1) * gutter;
    ctx.fillRect(gx, 0, gutter, canvas.height);
  }
  ctx.restore();
}

function drawEmptyFrameLabel(n, x, w){
  ctx.save();
  ctx.fillStyle = '#8a8a8a';
  ctx.font = '500 22px \'Clash Grotesk\', Inter, Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`F${n}`, x + w/2, canvas.height/2);
  ctx.restore();
}

function shouldNumber(){
  if(currentFormat()==='single') return document.getElementById('singleNumbering').value === 'on';
  return document.getElementById('numbering').value === 'on';
}

function render(){
  setCanvasSize();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#f1f1f1';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if(currentFormat()==='single'){
    const z = zones[0];
    if(z && z.img) coverImage(z.img, 0, 0, canvas.width, canvas.height);
    drawTextBlock(z?.text || '', z?.pos || 'bottom-left', z?.size || 52, 0, 0, canvas.width, canvas.height);
    if(shouldNumber()) drawNumber(1, 0, 0);
    return;
  }

  const count = currentCount();
  const gutter = +document.getElementById('gutter').value;
  const frameW = (canvas.width - gutter * (count - 1)) / count;

  if(currentMode()==='full' && fullStoryboardImage){
    coverImage(fullStoryboardImage, 0, 0, canvas.width, canvas.height);
    drawFrameSeparators(count, gutter);
  }

  for(let i=0;i<count;i++){
    const x = i * (frameW + gutter);
    if(currentMode()==='separate'){
      if(zones[i].img) coverImage(zones[i].img, x, 0, frameW, canvas.height);
      else drawEmptyFrameLabel(i+1, x, frameW);
    } else if(!fullStoryboardImage){
      drawEmptyFrameLabel(i+1, x, frameW);
    }
    drawTextBlock(zones[i].text, zones[i].pos, zones[i].size, x, 0, frameW, canvas.height);
    if(shouldNumber()) drawNumber(i+1, x, 0);
  }
}

function refreshModeUI(){
  const storyboard = currentFormat()==='storyboard';
  document.getElementById('storyboardControls').classList.toggle('hidden', !storyboard);
  document.getElementById('singleControls').classList.toggle('hidden', storyboard);
  document.getElementById('fullStoryboardUpload').classList.toggle('hidden', !(storyboard && currentMode()==='full'));
  rebuildZones();
}

document.getElementById('format').addEventListener('change', refreshModeUI);
document.getElementById('inputMode').addEventListener('change', refreshModeUI);
document.getElementById('frameCount').addEventListener('change', refreshModeUI);
document.getElementById('numbering').addEventListener('change', render);
document.getElementById('singleNumbering').addEventListener('change', render);
document.getElementById('gutter').addEventListener('input', render);
document.getElementById('renderBtn').addEventListener('click', render);

fullUpload.addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const nameEl = document.getElementById('fullUploadName');
  if(nameEl) nameEl.textContent = file.name;
  const img = new Image();
  img.onload = ()=>{ fullStoryboardImage = img; render(); };
  img.src = URL.createObjectURL(file);
});

document.getElementById('exportBtn').addEventListener('click', ()=>{
  render();
  const a = document.createElement('a');
  const name = currentFormat()==='single' ? 'composer-4x5.png' : 'composer-storyboard-16x9.png';
  a.download = name;
  a.href = canvas.toDataURL('image/png');
  a.click();
});

refreshModeUI();
