import {parseHand,classify,Round,STAGE_SECONDS} from './logic.mjs';
const $=id=>document.getElementById(id), game=new Round();
let port,writer,reader,latest=null,lastSeen=0,points=[],calibrating=false,samples=[],chain=Promise.resolve();
const tiles=Array.from({length:5},(_,i)=>{const e=document.createElement('div');e.className='tile';e.innerHTML=`${i+1}<small>가리켜 주세요</small>`;$('numbers').append(e);return e;});
function status(s){$('status').textContent=s;}
function send(c){chain=chain.then(()=>writer?.write(new TextEncoder().encode(c))).catch(()=>status('USB 연결 오류: 다시 연결해 주세요.'));}
function render(){
 tiles.forEach((e,i)=>{const number=calibrating?i+1:game.layout[i]; e.innerHTML=`${number}<small>가리켜 주세요</small>`;e.classList.toggle('active',calibrating?i===points.length:game.running&&number===game.target);});
 $('score').textContent=game.score; $('stage').textContent=game.stage+1;
 $('start').textContent=game.pending?'다음 단계 시작':'게임 시작';
 $('time').textContent=game.running?Math.max(0,Math.ceil((game.end-performance.now())/1000)):game.outcome==='timeout'?0:STAGE_SECONDS[game.pending?game.stage+1:game.stage];
}
function finish(){game.expire(performance.now());send('F');render();status(`${game.stage+1}단계 시간이 끝났어요. 총 ${game.score}점입니다. 다시 도전해 보세요.`);}
function stop(){game.running=false;game.pending=false;game.reset();send('S');render();}
function line(s){
 const p=parseHand(s);latest=p;if(!p){game.reset();samples=[];return;}
 const now=performance.now();lastSeen=now;
 if(calibrating){samples.push(p);if(samples.length>15)samples.shift();return;}
 if(game.running && now>=game.end){finish();return;}
 const slot=classify(p,points); const number=slot?game.layout[slot-1]:0;
 if(game.update(p,number,now)){
   send(game.outcome==='won'?'F':'C');
   if(game.pending) status(`${game.stage+1}단계 성공! 다음 단계 시작을 누르세요. 다음은 ${STAGE_SECONDS[game.stage+1]}초입니다.`);
   else if(game.outcome==='won') status(`3단계 모두 성공! 총 ${game.score}점입니다.`);
   else status(`잘하셨어요! 다음은 ${game.target}번입니다.`);
   render();
 }
}
$('connect').onclick=async()=>{
 if(!navigator.serial){status('PC Chrome 또는 Edge를 사용해 주세요.');return;}
 $('connect').disabled=true;
 try{port=await navigator.serial.requestPort();await port.open({baudRate:115200});writer=port.writable.getWriter();reader=port.readable.getReader();status('연결됨. 위치 보정을 시작해 주세요.');
 let buffer='';const decoder=new TextDecoder();
 while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let n;while((n=buffer.indexOf('\n'))>=0){line(buffer.slice(0,n).trim());buffer=buffer.slice(n+1);}if(buffer.length>2048)buffer='';}
 }catch{status('USB 연결을 확인하고 Arduino 시리얼 모니터를 닫아 주세요.');}
 finally{stop();latest=null;samples=[];try{reader?.releaseLock();writer?.releaseLock();await port?.close();}catch{}reader=null;writer=null;port=null;$('connect').disabled=false;$('start').disabled=true;}
};
$('calibrate').onclick=()=>{stop();points=[];samples=[];calibrating=true;$('start').disabled=true;$('capture').disabled=false;status('1번을 가리키고 손을 고정한 뒤 현재 위치 저장을 눌러 주세요.');render();};
$('capture').onclick=()=>{
 if(!writer||!latest||performance.now()-lastSeen>300||samples.length<8){status('손 한 개가 잘 보이도록 유지해 주세요.');return;}
 const avg={x:samples.reduce((s,p)=>s+p.x,0)/samples.length,y:samples.reduce((s,p)=>s+p.y,0)/samples.length};
 if(samples.some(p=>Math.hypot(p.x-avg.x,p.y-avg.y)>15)){status('손을 잠시 고정한 뒤 다시 저장해 주세요.');return;}
 if(points.some(p=>Math.hypot(p.x-avg.x,p.y-avg.y)<40)){status('이전 위치와 너무 가깝습니다. 손끝 위치가 구분되도록 가리켜 주세요.');return;}
 points.push(avg);samples=[];
 if(points.length===5){calibrating=false;$('capture').disabled=true;$('start').disabled=false;status('보정 완료. 게임 시작을 눌러 주세요.');}
 else status(`${points.length+1}번을 가리킨 뒤 현재 위치 저장을 눌러 주세요.`);
 render();
};
$('start').onclick=()=>{if(!writer||points.length!==5)return;if(game.pending)game.nextStage(performance.now());else game.start(performance.now());status(`${game.stage+1}단계: ${STAGE_SECONDS[game.stage]}초 안에 1부터 5까지 가리켜 주세요.`);render();};
$('stop').onclick=()=>{stop();status('잠시 쉬세요. 시작 버튼으로 다시 시작할 수 있어요.');};
setInterval(()=>{const now=performance.now();if(now-lastSeen>300){latest=null;samples=[];game.reset();}if(game.running){if(now>=game.end){finish();}else $('time').textContent=Math.ceil((game.end-now)/1000);}},100);
render();
