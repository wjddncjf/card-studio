'use strict';
const $=id=>document.getElementById(id),KEY='one-sentence-templates-v1';
const FONT_FAMILIES={sans:'"Apple SD Gothic Neo", "Malgun Gothic", sans-serif',serif:'"AppleMyungjo", "Batang", "Noto Serif CJK KR", serif',brush:'"GungSeo", "Gungsuh", "궁서", serif'};
const TEXT_PRESETS = {
  plain: {font: 'sans', color: '#34463b', stroke: false, weight: 600},
  caption: {font: 'sans', color: '#ffffff', stroke: false, weight: 700},
  quote: {font: 'serif', color: '#fff6dd', stroke: false, weight: 600},
  bold: {font: 'sans', color: '#ffffff', stroke: true, weight: 900}
};
const defaults=()=>({ratio:'1:1',text:'서두르지 않아도 괜찮아.\n너의 속도로, 너답게.',bg:'#e8e8db',color:'#34463b',size:66,x:50,y:54,width:82,align:'center',stroke:false,zoom:1,imageX:50,imageY:50,image:null,style:'calm',stickers:[],font:'sans',textPreset:'plain'});
let state=defaults(),templates=[],selectedId=null,loadedImage=null,revision=0,timer,activeSticker=null;
const fields=['font','text','bg','color','size','x','y','width','stroke','zoom','imageX','imageY'];
function notify(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);$('status').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('status').style.display='none',6500)}
function dimensions(s){return [1080,s.ratio==='4:5'?1350:s.ratio==='9:16'?1920:1080]}
function graphemes(t){return typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(t)].map(x=>x.segment):Array.from(t)}
function wrap(ctx,text,max){const lines=[];for(const paragraph of text.split('\n')){let line='';for(const char of graphemes(paragraph)){if(line&&ctx.measureText(line+char).width>max){lines.push(line);line=''}line+=char}lines.push(line)}return lines}
function render(canvas,s,img){const [w,h]=dimensions(s);canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.fillStyle=s.bg;c.fillRect(0,0,w,h);if(img){const scale=Math.max(w/img.width,h/img.height)*s.zoom,iw=img.width*scale,ih=img.height*scale;c.drawImage(img,(w-iw)*s.imageX/100,(h-ih)*s.imageY/100,iw,ih)}else if(s.style==='calm'){c.fillStyle='rgba(255,255,255,.22)';c.beginPath();c.arc(w*.91,h*.12,w*.37,0,Math.PI*2);c.fill();c.fillStyle='rgba(86,105,72,.07)';c.beginPath();c.arc(w*.06,h*.94,w*.44,0,Math.PI*2);c.fill();c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=2;c.strokeRect(38,38,w-76,h-76)}
const preset = s.textPreset || 'plain';
const maxWidth=w*s.width/100,maxHeight=h-90;let size=s.size,lines;do{c.font=`${preset === 'plain' && s.style === 'meme' ? 900 : TEXT_PRESETS[preset].weight} ${size}px ${FONT_FAMILIES[s.font||'sans']}`;lines=wrap(c,s.text,maxWidth);if(lines.length*size*1.5<=maxHeight||size<=5)break;size--}while(size>0);const lh=size*1.5,height=lines.length*lh;let top=Math.max(40,Math.min(h-40-height,(h-height)*s.y/100));const left=Math.max(35,Math.min(w-maxWidth-35,(w-maxWidth)*s.x/100));c.textAlign=s.align;c.textBaseline='middle';c.lineJoin='round';c.fillStyle=s.color;c.strokeStyle='#191919';c.lineWidth=Math.max(3,size*.075);const tx=s.align==='left'?left:s.align==='right'?left+maxWidth:left+maxWidth/2;const widths = lines.map(line => c.measureText(line).width);
const textWidth = Math.min(maxWidth, Math.max(...widths));
const textLeft = tx - (s.align === 'right' ? textWidth : s.align === 'center' ? textWidth / 2 : 0);
const caption = preset === 'caption' && s.text.trim();
if (caption) {
  c.fillStyle = 'rgba(20, 19, 25, .72)';
  c.beginPath();
  c.roundRect(textLeft - 20, top - 8, textWidth + 40, height + 16, 14);
  c.fill();
  c.fillStyle = s.color;
}
if (preset === 'quote') {
  c.shadowColor = 'rgba(0, 0, 0, .86)';
  c.shadowBlur = 12;
  c.shadowOffsetY = 3;
}
lines.forEach((line, i) => {
  const y = top + lh * (i + .5);
  if (s.stroke) c.strokeText(line, tx, y);
  c.fillText(line, tx, y);
});
c.shadowColor = 'transparent';
for(const sticker of s.stickers||[]){c.font=`${sticker.size}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;c.textAlign='center';c.textBaseline='middle';const margin=sticker.size*.65;c.fillText(sticker.emoji,margin+(w-2*margin)*sticker.x/100,margin+(h-2*margin)*sticker.y/100)}return {left: textLeft, top, width: textWidth, height, maxWidth};}
function draw(){document.querySelectorAll('[data-text-preset]').forEach(button => {
  const selected = button.dataset.textPreset === state.textPreset;
  button.classList.toggle('selected', selected);
  button.setAttribute('aria-pressed', String(selected));
});if(document.activeElement!==$('colorHex'))$('colorHex').value=state.color;$('color').value=state.color;document.querySelectorAll('[data-text-color]').forEach(b=>b.classList.toggle('chosen',b.dataset.textColor===state.color.toLowerCase()));for(const key of ['x','y','imageX','imageY','size','width','zoom']){if(document.activeElement!==$(key+'Number'))$(key+'Number').value=state[key];$(key).value=state[key]}textBounds=render($('canvas'),state,loadedImage);const [w,h]=dimensions(state);$('dimensions').textContent=`${w} × ${h} px`;$('count').textContent=`${state.text.length} / 2000`;$('sizeValue').textContent=state.size+' px';for(const key of ['x','y','width'])$(key+'Value').textContent=state[key]+'%';$('zoomValue').textContent=Number(state.zoom).toFixed(2)+'×';overlayUI()}
function sync(){closeCardEditor();textSelected=false;fields.forEach(key=>{if(key==='stroke')$(key).checked=state[key];else $(key).value=state[key]});document.querySelectorAll('[data-ratio]').forEach(b=>b.classList.toggle('selected',b.dataset.ratio===state.ratio));document.querySelectorAll('[data-align]').forEach(b=>b.classList.toggle('selected',b.dataset.align===state.align));document.querySelectorAll('[data-style]').forEach(b=>b.classList.toggle('selected',b.dataset.style===state.style));$('update').disabled=!selectedId;stickerUI();draw()}
function bindNumber(key,min,max,step,get,set){const input=$(key+'Number');const read=()=>input.value.trim()===''?NaN:input.valueAsNumber;const apply=value=>set(Math.round(value/step)*step);input.addEventListener('input',()=>{const value=read();if(Number.isFinite(value)&&value>=min&&value<=max){apply(value);draw()}});const commit=()=>{const value=read();if(Number.isFinite(value))apply(Math.max(min,Math.min(max,value)));input.value=get();draw()};input.addEventListener('change',commit);input.addEventListener('blur',commit)}
for(const key of ['x','y','imageX','imageY','size','width','zoom']){const range=$(key);bindNumber(key,Number(range.min),Number(range.max),key==='zoom'?.01:1,()=>state[key],v=>{state[key]=Number(v.toFixed(2))})}
fields.forEach(key=>$(key).addEventListener('input',()=>{state[key]=key==='stroke'?$(key).checked:['font','text','bg','color'].includes(key)?$(key).value:Number($(key).value);draw()}));
document.querySelectorAll('[data-ratio],[data-align],[data-bg]').forEach(b=>b.onclick=()=>{const key=b.dataset.ratio?'ratio':b.dataset.align?'align':'bg';state[key]=b.dataset[key];sync()});document.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{state.style=b.dataset.style;if(state.style==='meme'){Object.assign(state,{size:100,color:'#ffffff',stroke:true,y:8})}else{Object.assign(state,{size:66,color:'#34463b',stroke:false,y:54})}sync()});
function decode(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('이미지를 읽을 수 없습니다. 기존 작업은 유지됩니다.'));img.src=src})}
async function sanitize(blob){if(blob.size>10*1024*1024)throw Error('이미지는 10MB 이하로 선택해 주세요.');const a=new Uint8Array(await blob.slice(0,12).arrayBuffer());const png=[137,80,78,71,13,10,26,10].every((v,i)=>a[i]===v),jpg=a[0]===255&&a[1]===216&&a[2]===255;if(!png&&!jpg)throw Error('PNG·JPEG 파일만 지원합니다. 기존 작업은 유지됩니다.');const url=URL.createObjectURL(blob);try{const img=await decode(url);if(img.width*img.height>20000000)throw Error('이미지는 2천만 화소 이하로 선택해 주세요.');const scale=Math.min(1,1920/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/png')}finally{URL.revokeObjectURL(url)}}
$('image').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;const token=++revision;try{const src=await sanitize(file),img=await decode(src);if(token!==revision)return;state.image=src;loadedImage=img;state.zoom=1;state.imageX=state.imageY=50;sync();notify('이미지를 불러왔습니다. 원본 메타데이터를 제거했습니다.')}catch(err){notify(err.message,true)}};
$('removeImage').onclick=()=>{revision++;state.image=null;loadedImage=null;draw();notify('배경 이미지를 지웠습니다.')};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('download').onclick=async()=>{await document.fonts.ready;draw();$('canvas').toBlob(blob=>{if(blob){download(blob,`한문장-${state.ratio.replace(':','x')}.png`);notify('PNG 이미지를 저장했습니다.')}else notify('저장하지 못했습니다. 다시 시도해 주세요.',true)},'image/png')};
function saveList(next){try{localStorage.setItem(KEY,JSON.stringify(next));templates=next;library();return true}catch{notify('브라우저 저장 공간이 부족하거나 저장이 차단되었습니다. JSON으로 먼저 백업해 주세요.',true);return false}}
function entry(){const name=$('templateName').value.trim();if(!name){notify('템플릿 이름을 입력해 주세요.',true);$('templateName').focus();return null}return {id:crypto.randomUUID(),name,state:structuredClone(state)}}
$('save').onclick=()=>{const t=entry();if(t&&saveList([...templates,t])){selectedId=t.id;sync();notify('새 템플릿을 저장했습니다.')}};
$('update').onclick=()=>{if(!templates.some(t=>t.id===selectedId))return;const t=entry();if(t&&saveList(templates.map(old=>old.id===selectedId?{...t,id:selectedId}:old)))notify('템플릿을 수정했습니다.')};
async function load(t){const token=++revision;try{const img=t.state.image?await decode(t.state.image):null;if(token!==revision)return;state=structuredClone(t.state);loadedImage=img;selectedId=t.id;$('templateName').value=t.name;sync();notify('템플릿을 불러왔습니다.')}catch(err){notify(err.message,true)}}
function library(){$('templates').replaceChildren();$('templateCount').textContent=templates.length;$('empty').hidden=templates.length>0;for(const t of templates){const el=document.createElement('article');el.className='template-card';const c=document.createElement('canvas'),title=document.createElement('strong'),open=document.createElement('button'),del=document.createElement('button');title.textContent=t.name;open.textContent='불러오기';del.textContent='삭제';open.onclick=()=>load(t);del.onclick=()=>{if(!confirm(`“${t.name}” 템플릿을 삭제할까요?`))return;if(saveList(templates.filter(x=>x.id!==t.id))){if(selectedId===t.id){selectedId=null;sync()}notify('템플릿을 삭제했습니다.')}};el.append(c,title,open,del);$('templates').append(el);if(t.state.image)decode(t.state.image).then(img=>render(c,t.state,img)).catch(()=>render(c,t.state,null));else render(c,t.state,null)}}
function validateState(s){if(!s||typeof s!=='object')throw Error('편집 설정이 없습니다.');if (!('textPreset' in s)) s = {...s, textPreset: 'plain'};
if (!Object.hasOwn(TEXT_PRESETS, s.textPreset)) throw Error('지원하지 않는 문구 스타일입니다.');
if(!('font' in s))s={...s,font:'sans'};if(!Object.hasOwn(FONT_FAMILIES,s.font))throw Error('지원하지 않는 글꼴입니다.');if(!('stickers' in s))s={...s,stickers:[]};for(const k of Object.keys(defaults()))if(!(k in s))throw Error(`필수 항목 누락: ${k}`);if(!['1:1','4:5','9:16'].includes(s.ratio)||!['left','center','right'].includes(s.align)||!['calm','meme'].includes(s.style))throw Error('지원하지 않는 편집 설정입니다.');if(typeof s.text!=='string'||s.text.length>2000||typeof s.stroke!=='boolean')throw Error('문구 형식 또는 길이가 올바르지 않습니다.');for(const k of ['bg','color'])if(!/^#[0-9a-f]{6}$/i.test(s[k]))throw Error('색상 값이 올바르지 않습니다.');for(const [k,min,max] of [['size',20,160],['x',0,100],['y',0,100],['width',20,96],['zoom',1,3],['imageX',0,100],['imageY',0,100]])if(typeof s[k]!=='number'||!Number.isFinite(s[k])||s[k]<min||s[k]>max)throw Error(`잘못된 값: ${k}`);if(s.image!==null&&(typeof s.image!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s.image)||s.image.length>14000000))throw Error('이미지 데이터가 올바르지 않습니다.');if(!Array.isArray(s.stickers)||s.stickers.length>12)throw Error('스티커는 최대 12개입니다.');const ids=new Set();for(const t of s.stickers){if(!t||typeof t.id!=='string'||!t.id||t.id.length>100||ids.has(t.id)||!EMOJIS.includes(t.emoji))throw Error('잘못된 스티커입니다.');ids.add(t.id);for(const [k,min,max] of [['x',0,100],['y',0,100],['size',30,240]])if(typeof t[k]!=='number'||!Number.isFinite(t[k])||t[k]<min||t[k]>max)throw Error('잘못된 스티커 위치 또는 크기입니다.')}return Object.fromEntries(Object.keys(defaults()).map(k=>[k,s[k]]))}
function validate(data){if(!data||data.version!==1||!Array.isArray(data.templates)||data.templates.length>50)throw Error('버전 1의 템플릿 파일이 필요합니다. 최대 50개까지 가져올 수 있습니다.');const ids=new Set();return data.templates.map(t=>{if(!t||typeof t.id!=='string'||t.id.length>100||!t.id||ids.has(t.id)||typeof t.name!=='string'||!t.name.trim()||t.name.length>60)throw Error('템플릿 이름 또는 ID가 올바르지 않습니다.');ids.add(t.id);return {id:t.id,name:t.name,state:validateState(t.state)}})}
$('export').onclick=()=>download(new Blob([JSON.stringify({version:1,templates},null,2)],{type:'application/json'}),'한문장-템플릿.json');
$('import').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>20*1024*1024)throw Error('JSON은 20MB 이하만 지원합니다.');const data=JSON.parse(await f.text()),incoming=validate(data);for(const t of incoming)if(t.state.image){const blob=await (await fetch(t.state.image)).blob();t.state.image=await sanitize(blob)}const next=[...templates];for(const t of incoming){const i=next.findIndex(x=>x.id===t.id);if(i<0)next.push(t);else next[i]=t}if(saveList(next))notify(`${incoming.length}개 템플릿을 복원했습니다. 같은 ID는 갱신됩니다.`)}catch(err){notify(`가져오기 거부: ${err instanceof SyntaxError?'JSON 문법이 손상되었습니다.':err.message} 기존 템플릿은 유지됩니다.`,true)}};
const EMOJIS=['✨','🌷','🌿','💜','🎉','😂','🥹','⭐','❤️','🔥','🌈','🎀'];
function selectedSticker(){return state.stickers.find(t=>t.id===activeSticker)}
function stickerUI(){if(!selectedSticker())activeSticker=state.stickers[0]?.id||null;const select=$('stickerSelect');select.replaceChildren();if(!state.stickers.length){const o=document.createElement('option');o.textContent='스티커 없음';o.value='';select.append(o)}state.stickers.forEach((t,i)=>{const o=document.createElement('option');o.value=t.id;o.textContent=`${i+1}. ${t.emoji}`;select.append(o)});select.value=activeSticker||'';$('stickerControls').hidden=!activeSticker;const t=selectedSticker();if(t)for(const [id,key] of [['stickerX','x'],['stickerY','y'],['stickerSize','size']]){$(id).value=t[key];$(id+'Number').value=t[key]}}
for(const emoji of EMOJIS){const b=document.createElement('button');b.textContent=emoji;b.setAttribute('aria-label',emoji+' 스티커 추가');b.draggable=true;b.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',emoji);e.dataTransfer.effectAllowed='copy'});b.onclick=()=>addSticker(emoji);$('emojiPalette').append(b)}
$('stickerSelect').onchange=()=>{activeSticker=$('stickerSelect').value;stickerUI();draw()};
for(const [id,key,max] of [['stickerX','x',100],['stickerY','y',100],['stickerSize','size',240]]){const min=key==='size'?30:0;const set=v=>{const t=selectedSticker();if(t){t[key]=v;$(id).value=v}};bindNumber(id,min,max,1,()=>selectedSticker()?.[key]??min,set);$(id).oninput=()=>{set(Number($(id).value));$(id+'Number').value=Number($(id).value);draw()}}
$('deleteSticker').onclick=()=>{state.stickers=state.stickers.filter(t=>t.id!==activeSticker);activeSticker=null;stickerUI();draw()};
function addSticker(emoji,point){textSelected=false;if(!EMOJIS.includes(emoji))return;if(state.stickers.length>=12){notify('스티커는 최대 12개까지 추가할 수 있습니다.',true);return}const t={id:crypto.randomUUID(),emoji,x:50,y:25,size:100};if(point)setStickerCenter(t,point.x,point.y);state.stickers.push(t);activeSticker=t.id;stickerUI();draw()}
function canvasRect(){const c=$('canvas'),r=c.getBoundingClientRect(),scale=Math.min(r.width/c.width,r.height/c.height);return {left:r.left+(r.width-c.width*scale)/2,top:r.top+(r.height-c.height*scale)/2,width:c.width*scale,height:c.height*scale,scale}}
function center(t){const [w,h]=dimensions(state),m=t.size*.65;return {x:m+(w-2*m)*t.x/100,y:m+(h-2*m)*t.y/100}}
function setStickerCenter(t,x,y){const [w,h]=dimensions(state),m=t.size*.65;t.x=Math.max(0,Math.min(100,(x-m)/(w-2*m)*100));t.y=Math.max(0,Math.min(100,(y-m)/(h-2*m)*100))}
function canvasPoint(e){const r=canvasRect();return {x:(e.clientX-r.left)/r.scale,y:(e.clientY-r.top)/r.scale}}
let stickerGesture=null;
function overlayUI(){textOverlayUI();const overlay=$('stickerOverlay'),r=canvasRect(),stage=$('canvas').parentElement.getBoundingClientRect();overlay.style.left=(r.left-stage.left-$("canvas").parentElement.clientLeft)+'px';overlay.style.top=(r.top-stage.top-$("canvas").parentElement.clientTop)+'px';overlay.style.width=r.width+'px';overlay.style.height=r.height+'px';for(const el of [...overlay.children])if(!state.stickers.some(t=>t.id===el.dataset.id))el.remove();for(const t of state.stickers){let el=[...overlay.children].find(el=>el.dataset.id===t.id);if(el&&el.stickerData!==t){el.remove();el=null}if(!el){el=document.createElement('div');el.className='sticker-hit';el.stickerData=t;el.dataset.id=t.id;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',t.emoji+' 스티커 이동 및 크기 조절');const handle=document.createElement('button');handle.className='sticker-resize';handle.setAttribute('aria-label',t.emoji+' 크기 조절 손잡이');const remove=document.createElement('button');remove.className='sticker-delete';remove.type='button';remove.title='스티커 삭제';remove.setAttribute('aria-label',t.emoji+' 스티커 바로 삭제');remove.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';remove.addEventListener('pointerdown',e=>e.stopPropagation());remove.addEventListener('keydown',e=>e.stopPropagation());remove.addEventListener('click',e=>{e.stopPropagation();state.stickers=state.stickers.filter(s=>s.id!==t.id);if(activeSticker===t.id)activeSticker=null;stickerGesture=null;stickerUI();draw()});el.append(handle,remove);overlay.append(el);el.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();textSelected=false;activeSticker=t.id;const p=canvasPoint(e),c=center(t);stickerGesture={id:t.id,mode:e.target.closest('.sticker-resize')?'resize':'move',start:p,center:c,size:t.size,dx:p.x-c.x,dy:p.y-c.y,pointerId:e.pointerId};el.setPointerCapture(e.pointerId);stickerUI();draw()});el.addEventListener('pointermove',e=>{if(!stickerGesture||stickerGesture.id!==t.id||e.pointerId!==stickerGesture.pointerId)return;const g=stickerGesture,p=canvasPoint(e);if(g.mode==='move')setStickerCenter(t,p.x-g.dx,p.y-g.dy);else{t.size=Math.round(Math.max(30,Math.min(240,g.size+Math.max(p.x-g.start.x,p.y-g.start.y)/.65)));setStickerCenter(t,g.center.x,g.center.y)}stickerUI();draw()});const finish=()=>{stickerGesture=null};el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish);el.addEventListener('lostpointercapture',finish);el.addEventListener('keydown',e=>{const t=state.stickers.find(t=>t.id===el.dataset.id);if(!t)return;activeSticker=t.id;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const c=center(t),n=e.shiftKey?20:5;setStickerCenter(t,c.x+(e.key==='ArrowRight'?n:e.key==='ArrowLeft'?-n:0),c.y+(e.key==='ArrowDown'?n:e.key==='ArrowUp'?-n:0))}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();state.stickers=state.stickers.filter(s=>s.id!==t.id);activeSticker=null}else if(e.key==='+'||e.key==='-'){e.preventDefault();t.size=Math.max(30,Math.min(240,t.size+(e.key==='+'?5:-5)))}stickerUI();draw()})}const c=center(t),box=t.size*1.3*r.scale;el.style.width=box+'px';el.style.height=box+'px';el.style.left=(c.x*r.scale-box/2)+'px';el.style.top=(c.y*r.scale-box/2)+'px';el.classList.toggle('is-active',t.id===activeSticker)}}
$('canvas').addEventListener('pointerdown',()=>{activeSticker=null;textSelected=false;overlayUI()});
const stage=$('canvas').parentElement;stage.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('text/plain')){e.preventDefault();e.dataTransfer.dropEffect='copy';stage.classList.add('drop-ready')}});stage.addEventListener('dragleave',e=>{if(!stage.contains(e.relatedTarget))stage.classList.remove('drop-ready')});stage.addEventListener('drop',e=>{e.preventDefault();stage.classList.remove('drop-ready');const r=canvasRect();if(e.clientX<r.left||e.clientX>r.left+r.width||e.clientY<r.top||e.clientY>r.top+r.height)return;addSticker(e.dataTransfer.getData('text/plain'),canvasPoint(e))});
new ResizeObserver(()=>overlayUI()).observe(stage);window.addEventListener('resize',overlayUI);
for(const [color,name] of [['#34463b','딥그린'],['#191919','검정'],['#ffffff','흰색'],['#7965a7','보라'],['#d15c72','장미'],['#2c72b7','파랑'],['#c08a2e','골드'],['#e56836','주황']]){const b=document.createElement('button');b.type='button';b.dataset.textColor=color;b.style.backgroundColor=color;b.title=name;b.setAttribute('aria-label',name+' 글자색');b.onclick=()=>{state.color=color;$('colorHex').value=color;draw()};$('textColors').append(b)}
$('colorHex').addEventListener('input',()=>{const value=$('colorHex').value.trim();const valid=/^#[0-9a-f]{6}$/i.test(value);$('colorHex').setAttribute('aria-invalid',valid?'false':'true');$('colorHelp').textContent=valid?'색상표를 누르거나 #RRGGBB 형식으로 입력하세요.':'#과 6자리 색상 코드로 입력하세요. 기존 글자색은 유지됩니다.';if(valid){state.color=value.toLowerCase();draw()}});
$('colorHex').addEventListener('blur',()=>{$('colorHex').value=state.color;$('colorHex').setAttribute('aria-invalid','false');$('colorHelp').textContent='색상표를 누르거나 #RRGGBB 형식으로 입력하세요.'});
let textBounds, textSelected = false, textGesture;
const cardText = $('cardText');
const textBox = $('textBox');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function textOverlayUI() {
  if (!textBounds) return;
  const r = canvasRect();
  const stageRect = stage.getBoundingClientRect();
  Object.assign($('textOverlay').style, {
    left: r.left - stageRect.left - stage.clientLeft + 'px',
    top: r.top - stageRect.top - stage.clientTop + 'px',
    width: r.width + 'px',
    height: r.height + 'px'
  });
  const boxWidth = Math.min(r.width, Math.max(28, textBounds.width * r.scale + 8));
  const boxHeight = Math.min(r.height, Math.max(28, textBounds.height * r.scale + 8));
  Object.assign(textBox.style, {
    left: clamp((textBounds.left + textBounds.width / 2) * r.scale - boxWidth / 2, 0, r.width - boxWidth) + 'px',
    top: clamp((textBounds.top + textBounds.height / 2) * r.scale - boxHeight / 2, 0, r.height - boxHeight) + 'px',
    width: boxWidth + 'px',
    height: boxHeight + 'px'
  });
  textBox.hidden = !$('cardEditor').hidden;
  textBox.classList.toggle('is-active', textSelected);
  $('textEdit').hidden = !textSelected;
  $('textResize').hidden = !textSelected || !state.text.trim();
  $('guideX').hidden = !textGesture?.snapX;
  $('guideY').hidden = !textGesture?.snapY;
}

function openCardEditor() {
  textSelected = true;
  activeSticker = null;
  cardText.value = state.text;
  $('cardEditor').hidden = false;
  overlayUI();
  cardText.focus();
}

function closeCardEditor() {
  $('cardEditor').hidden = true;
}

function finishCardEditor() {
  closeCardEditor();
  overlayUI();
  $('textMove').focus();
}

$('textEdit').onclick = openCardEditor;
$('cardDone').onclick = finishCardEditor;
$('textMove').ondblclick = openCardEditor;
cardText.addEventListener('input', () => {
  state.text = cardText.value;
  $('text').value = state.text;
  draw();
});
$('cardEditor').addEventListener('keydown', e => {
  if (e.key === 'Escape' && !e.isComposing) finishCardEditor();
});

for (const control of [$('textMove'), $('textResize')]) {
  const resize = control.id === 'textResize';
  control.addEventListener('pointerdown', e => {
    if (e.button !== 0 || textGesture) return;
    textSelected = true;
    activeSticker = null;
    const [w, h] = dimensions(state);
    textGesture = {
      pointerId: e.pointerId, start: canvasPoint(e), size: state.size,
      x: textBounds.left + textBounds.width / 2,
      y: textBounds.top + textBounds.height / 2,
      roomX: w - textBounds.maxWidth, roomY: h - textBounds.height
    };
    control.setPointerCapture(e.pointerId);
    overlayUI();
  });
  control.addEventListener('pointermove', e => {
    const g = textGesture;
    if (!g || g.pointerId !== e.pointerId) return;
    const p = canvasPoint(e);
    const dx = p.x - g.start.x, dy = p.y - g.start.y;
    const scale = canvasRect().scale;
    if (!g.moved && Math.hypot(dx, dy) * scale < 4) return;
    g.moved = true;
    if (resize) {
      state.size = clamp(Math.round(g.size + (dx + dy) / 4), 20, 160);
    } else {
      const [w, h] = dimensions(state);
      const x = g.x + dx, y = g.y + dy;
      const alignOffset = state.align === 'left' ? (textBounds.width - textBounds.maxWidth) / 2 :
        state.align === 'right' ? (textBounds.maxWidth - textBounds.width) / 2 : 0;
      const left = x - alignOffset - textBounds.maxWidth / 2;
      const top = y - textBounds.height / 2;
      const centeredLeft = w / 2 - alignOffset - textBounds.maxWidth / 2;
      g.snapX = g.roomX > 70 && centeredLeft >= 35 && centeredLeft <= g.roomX - 35 && Math.abs(x - w / 2) * scale <= 7;
      g.snapY = g.roomY >= 80 && Math.abs(y - h / 2) * scale <= 7;
      if (g.roomX > 70) state.x = clamp(Math.round(100 * (g.snapX ? centeredLeft : left) / g.roomX), 0, 100);
      if (g.roomY >= 80) state.y = g.snapY ? 50 : clamp(Math.round(100 * top / g.roomY), 0, 100);
    }
    draw();
  });
  const finish = e => {
    if (textGesture?.pointerId !== e.pointerId) return;
    textGesture = null;
    overlayUI();
  };
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) control.addEventListener(event, finish);
  control.addEventListener('keydown', e => {
    const direction = {ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1}[e.key];
    if (!direction) return;
    e.preventDefault();
    const key = resize ? 'size' : ['ArrowLeft', 'ArrowRight'].includes(e.key) ? 'x' : 'y';
    state[key] = clamp(state[key] + direction * (e.shiftKey ? 5 : 1), resize ? 20 : 0, resize ? 160 : 100);
    textSelected = true;
    activeSticker = null;
    draw();
  });
}
$('textMove').addEventListener('click', e => {
  if (e.detail === 0 || !state.text.trim()) openCardEditor();
});

document.querySelectorAll('[data-text-preset]').forEach(button => {
  button.addEventListener('click', () => {
    const textPreset = button.dataset.textPreset;
    const {font, color, stroke} = TEXT_PRESETS[textPreset];
    Object.assign(state, {textPreset, font, color, stroke});
    sync();
  });
});

try{const raw=localStorage.getItem(KEY);if(raw)templates=validate({version:1,templates:JSON.parse(raw)})}catch{notify('저장한 템플릿을 읽지 못했습니다. 저장 데이터는 덮어쓰지 않았습니다.',true)}
library();sync();document.fonts.ready.then(draw);
