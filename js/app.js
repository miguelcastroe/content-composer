const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const zonesRoot = document.getElementById('zonesRoot');
const fullUpload = document.getElementById('fullUpload');

let fullStoryboardImage = null;
let zones = [];

const FIXED = {
  pad: 28,
  numXOffset: 22,
  numYOffset: 22,
  numSize: 42,
  numGap: 20,
  numberTextGap: 30,
  topInsetRatio: 0.14,
  bottomInsetRatio: 0.10,
  minBlockRatioSide: 0.32,
  maxBlockRatioSide: 0.50,
  minBlockRatioCenter: 0.40,
  maxBlockRatioCenter: 0.64
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
    pos: currentFormat()==='single' ? 'bottom-left' : 'top-left',
    size: currentFormat()==='single' ? 52 : 34,
    weight:600,
    color:'#ffffff'
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

    const positions = [
      'top-left','top-center','top-right',
      'middle-left','middle-center','middle-right',
      'bottom-left','bottom-center','bottom-right'
    ];
    const positionOptions = positions.map(pos =>
      `<option value="${pos}" ${zones[i].pos===pos ? 'selected' : ''}>${pos}</option>`
    ).join('');

    card.innerHTML = `
      <div class="frame-title">${title}</div>
      ${uploadField}
      <label style="margin-top:${uploadField ? '10px':'0'}">Texto en imagen</label>
      <textarea data-text="${i}" placeholder="Texto exacto"></textarea>

      <div class="row">
        <div>
          <label>Posición</label>
          <select data-pos="${i}">${positionOptions}</select>
        </div>
        <div>
          <label>Tamaño</label>
          <input type="number" min="18" max="120" value="${zones[i].size}" data-size="${i}" />
        </div>
      </div>

      <div class="row">
        <div>
          <label>Peso</label>
          <select data-weight="${i}">
            <option value="300">Light</option>
            <option value="400">Regular</option>
            <option value="500">Medium</option>
            <option value="600" selected>Semibold</option>
            <option value="700">Bold</option>
          </select>
        </div>
        <div>
          <label>Color</label>
          <select data-color="${i}">
            <option value="#ffffff" selected>White</option>
            <option value="#111111">Black</option>
          </select>
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
  zonesRoot.querySelectorAll('[data-weight]').forEach(el=>{
    el.addEventListener('change', e=>{ zones[+e.target.dataset.weight].weight = +e.target.value; render(); });
  });
  zonesRoot.querySelectorAll('[data-color]').forEach(el=>{
    el.addEventListener('change', e=>{ zones[+e.target.dataset.color].color = e.target.value; render(); });
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

function fontSpec(fontSize, fontWeight){
  return `${fontWeight} ${fontSize}px 'Clash Grotesk', Inter, Arial, Helvetica, sans-serif`;
}

function wrapTextToWidth(text, maxWidth, fontSize, fontWeight){
  ctx.font = fontSpec(fontSize, fontWeight);
  const words = (text || '').trim().split(/\s+/);
  if(!words[0]) return [];
  const lines = [];
  let line = '';
  words.forEach(word=>{
    const test = line ? `${line} ${word}` : word;
    if(ctx.measureText(test).width > maxWidth && line){
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if(line) lines.push(line);
  return lines;
}

function lineWidths(lines, fontSize, fontWeight){
  ctx.font = fontSpec(fontSize, fontWeight);
  return lines.map(line => ctx.measureText(line).width);
}

function scoreComposedLines(lines, widths, maxWidth){
  if(!lines.length) return Number.POSITIVE_INFINITY;

  const wordCount = lines.join(' ').split(/\s+/).filter(Boolean).length;
  const ratios = widths.map(w => w / maxWidth);
  const avg = ratios.reduce((a,b)=>a+b,0) / ratios.length;
  const variance = ratios.reduce((sum,r)=>sum + Math.pow(r-avg,2),0) / ratios.length;
  const lastRatio = ratios[ratios.length-1];
  let score = 0;

  if(lines.length === 1 && wordCount > 4) score += 140;
  if(lines.length === 2 || lines.length === 3) score -= 18;
  if(lines.length === 4) score += 20;
  if(lines.length > 4) score += (lines.length - 4) * 90;

  score += Math.abs(avg - 0.74) * 120;
  score += variance * 140;

  if(lines.length > 1 && lastRatio < 0.34) score += 80;
  ratios.forEach(r=>{
    if(r > 0.96) score += 45;
    if(r < 0.28) score += 35;
  });

  return score;
}

function textWidthBounds(pos, frameW){
  if(pos.includes('center')){
    return [frameW * FIXED.minBlockRatioCenter, frameW * FIXED.maxBlockRatioCenter];
  }
  return [frameW * FIXED.minBlockRatioSide, frameW * FIXED.maxBlockRatioSide];
}

function composeTextLines(text, frameW, fontSize, fontWeight, pos){
  const [minW, maxW] = textWidthBounds(pos, frameW);
  let best = null;

  for(let testW=minW; testW<=maxW; testW+=8){
    const lines = wrapTextToWidth(text, testW, fontSize, fontWeight);
    const widths = lineWidths(lines, fontSize, fontWeight);
    const score = scoreComposedLines(lines, widths, testW);
    if(!best || score < best.score){
      best = {lines, widths, width:testW, score};
    }
  }

  return best || {lines:[], widths:[], width:maxW, score:0};
}

function anchor(pos, x, y, w, h, pad, blockH){
  let ax = x + pad;
  let ay = y + pad;
  let align = 'left';

  if(pos.includes('right')){
    ax = x + w - pad;
    align = 'right';
  }else if(pos.includes('center')){
    ax = x + w/2;
    align = 'center';
  }

  const numberSafeBottom = y + FIXED.numYOffset + FIXED.numSize + FIXED.numGap + FIXED.numberTextGap;
  const topInset = y + Math.round(h * FIXED.topInsetRatio);
  const bottomInset = y + h - Math.round(h * FIXED.bottomInsetRatio) - blockH;

  if(pos.startsWith('top')) ay = Math.max(y + pad, topInset);
  if(pos === 'top-left' && shouldNumber()) ay = Math.max(ay, numberSafeBottom);
  if(pos.startsWith('middle')) ay = y + (h - blockH) / 2;
  if(pos.startsWith('bottom')) ay = Math.max(y + pad, bottomInset);

  return {x:ax, y:ay, align};
}

function drawTextBlock(text, pos, fontSize, fontWeight, color, x, y, w, h){
  const composed = composeTextLines(text, w, fontSize, fontWeight, pos);
  const lines = composed.lines;
  if(!lines.length) return;

  const lh = Math.round(fontSize * 1.10);
  const blockH = lines.length * lh;
  const a = anchor(pos, x, y, w, h, FIXED.pad, blockH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.shadowColor = color === '#ffffff' ? 'rgba(0,0,0,.48)' : 'rgba(255,255,255,.42)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  ctx.font = fontSpec(fontSize, fontWeight);
  ctx.fillStyle = color;
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

function drawFrameSeparators(count, gutter, frameW){
  if(count <= 1 || gutter <= 0) return;
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

function storyboardGeometry(){
  const count = currentCount();
  if(currentMode()==='full'){
    return {count, gutter:0, frameW:canvas.width / count};
  }
  const gutter = +document.getElementById('gutter').value;
  return {
    count,
    gutter,
    frameW:(canvas.width - gutter * (count - 1)) / count
  };
}

function render(){
  setCanvasSize();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#f1f1f1';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if(currentFormat()==='single'){
    const z = zones[0];
    if(z && z.img) coverImage(z.img, 0, 0, canvas.width, canvas.height);
    drawTextBlock(
      z?.text || '',
      z?.pos || 'bottom-left',
      z?.size || 52,
      z?.weight || 600,
      z?.color || '#ffffff',
      0, 0, canvas.width, canvas.height
    );
    if(shouldNumber()) drawNumber(1, 0, 0);
    return;
  }

  const {count, gutter, frameW} = storyboardGeometry();

  if(currentMode()==='full' && fullStoryboardImage){
    coverImage(fullStoryboardImage, 0, 0, canvas.width, canvas.height);
    // Full storyboard input is treated as frozen pixels. Composer does not add
    // another separator layer, preventing duplicate white rules.
  }

  for(let i=0;i<count;i++){
    const x = currentMode()==='full' ? i * frameW : i * (frameW + gutter);

    if(currentMode()==='separate'){
      if(zones[i].img) coverImage(zones[i].img, x, 0, frameW, canvas.height);
      else drawEmptyFrameLabel(i+1, x, frameW);
    }else if(!fullStoryboardImage){
      drawEmptyFrameLabel(i+1, x, frameW);
    }

    drawTextBlock(
      zones[i].text,
      zones[i].pos,
      zones[i].size,
      zones[i].weight,
      zones[i].color,
      x, 0, frameW, canvas.height
    );

    if(shouldNumber()) drawNumber(i+1, x, 0);
  }

  if(currentMode()==='separate'){
    drawFrameSeparators(count, gutter, frameW);
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

document.fonts?.ready?.then(render);
refreshModeUI();
