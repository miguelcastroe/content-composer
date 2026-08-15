/* Composer Production Spec v1 loader.
 * Allows the online Composer to be invoked by a tool without manual form entry.
 * Usage: https://.../content-composer/#spec=<base64url(JSON)>
 */

function decodeBase64Url(value){
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function loadRemoteImage(url){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=>resolve(img);
    img.onerror = ()=>reject(new Error(`Could not load image: ${url}`));
    img.src = url;
  });
}

async function applyComposerSpec(spec){
  if(!spec || spec.version !== '1.0') throw new Error('Unsupported Composer spec version');

  const isSingle = spec.format === 'single-4x5';
  document.getElementById('format').value = isSingle ? 'single' : 'storyboard';

  if(!isSingle){
    document.getElementById('inputMode').value = spec.input_mode === 'full' ? 'full' : 'separate';
    document.getElementById('frameCount').value = String(spec.frame_count || 3);
    document.getElementById('numbering').value = spec.numbering === false ? 'off' : 'on';
    if(Number.isFinite(spec.gutter)) document.getElementById('gutter').value = String(spec.gutter);
  }else{
    document.getElementById('singleNumbering').value = spec.numbering ? 'on' : 'off';
  }

  refreshModeUI();

  const requestedZones = Array.isArray(spec.zones) ? spec.zones : [];
  requestedZones.forEach((z, i)=>{
    if(!zones[i]) return;
    zones[i].text = z.text || '';
    zones[i].pos = z.position || zones[i].pos;
    zones[i].size = Number(z.size || zones[i].size);
    zones[i].weight = Number(z.weight || zones[i].weight);
    zones[i].color = z.color || zones[i].color;

    const textEl = zonesRoot.querySelector(`[data-text="${i}"]`);
    const posEl = zonesRoot.querySelector(`[data-pos="${i}"]`);
    const sizeEl = zonesRoot.querySelector(`[data-size="${i}"]`);
    const weightEl = zonesRoot.querySelector(`[data-weight="${i}"]`);
    const colorEl = zonesRoot.querySelector(`[data-color="${i}"]`);
    if(textEl) textEl.value = zones[i].text;
    if(posEl) posEl.value = zones[i].pos;
    if(sizeEl) sizeEl.value = String(zones[i].size);
    if(weightEl) weightEl.value = String(zones[i].weight);
    if(colorEl) colorEl.value = zones[i].color;
  });

  if(isSingle && spec.source_image_url){
    zones[0].img = await loadRemoteImage(spec.source_image_url);
  }else if(!isSingle && spec.input_mode === 'full' && spec.source_image_url){
    fullStoryboardImage = await loadRemoteImage(spec.source_image_url);
  }else if(!isSingle && Array.isArray(spec.frame_image_urls)){
    const images = await Promise.all(spec.frame_image_urls.slice(0, zones.length).map(loadRemoteImage));
    images.forEach((img, i)=>{ if(zones[i]) zones[i].img = img; });
  }

  render();
  return true;
}

function getComposerSpec(){
  const isSingle = currentFormat() === 'single';
  return {
    version: '1.0',
    format: isSingle ? 'single-4x5' : 'storyboard-16x9',
    input_mode: isSingle ? 'single' : currentMode(),
    frame_count: currentCount(),
    numbering: shouldNumber(),
    gutter: isSingle ? 0 : Number(document.getElementById('gutter').value || 0),
    zones: zones.map((z, i)=>({
      frame: i + 1,
      text: z.text,
      position: z.pos,
      size: z.size,
      weight: z.weight,
      color: z.color
    }))
  };
}

window.ContentComposer = {
  applySpec: applyComposerSpec,
  getSpec: getComposerSpec,
  render,
  exportDataUrl: ()=>{ render(); return canvas.toDataURL('image/png'); }
};

(async function loadSpecFromHash(){
  const match = location.hash.match(/^#spec=(.+)$/);
  if(!match) return;
  try{
    const spec = JSON.parse(decodeBase64Url(match[1]));
    await applyComposerSpec(spec);
  }catch(error){
    console.error('Composer spec load failed', error);
  }
})();
