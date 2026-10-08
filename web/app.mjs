import {parseHand,screenPoint,hitNumber,validCalibration,CORNERS,Round,STAGE_SECONDS,CalibrationSamples} from './logic.mjs?v=index-only-6';
const $=id=>document.getElementById(id), game=new Round();
let port,writer,reader,latest=null,lastSeen=0,points=[],calibrating=false,samples=new CalibrationSamples(),chain=Promise.resolve();
const tiles=Array.from({length:5},(_,i)=>{const e=document.createElement('div');e.className='tile';e.innerHTML=`${i+1}<small>가리켜 주세요</small>`;$('numbers').append(e);return e;});
function status(s){$('status').textContent=s;}
function send(c){const destination=writer;chain=chain.then(()=>destination?.write(new TextEncoder().encode(c))).catch(e=>status(`버저 명령 전송 실패 (${e.name}): ${e.message}`));}
function render(){
 tiles.forEach((e,i)=>{const point=game.positions[i];e.hidden=calibrating||!point;e.innerHTML=`${i+1}<small>가리켜 주세요</small>`;if(point){e.style.left=`${point.x*100}%`;e.style.top=`${point.y*100}%`;}e.classList.toggle('active',game.running&&i+1===game.target);});
 const marker=$('marker');marker.hidden=!calibrating;if(calibrating)$('dot').hidden=true;
 if(calibrating){const corner=CORNERS[points.length];marker.style.left=`${corner.x*100}%`;marker.style.top=`${corner.y*100}%`;marker.textContent=['왼쪽 위','오른쪽 위','오른쪽 아래','왼쪽 아래'][points.length];}
 $('score').textContent=game.score; $('stage').textContent=game.stage+1;
 $('start').textContent=game.pending?'다음 단계 시작':'게임 시작';
 $('time').textContent=game.running?Math.max(0,Math.ceil((game.end-performance.now())/1000)):game.outcome==='timeout'?0:STAGE_SECONDS[game.pending?game.stage+1:game.stage];
}
function finish(){game.expire(performance.now());send('F');render();status(`${game.stage+1}단계 시간이 끝났어요. 총 ${game.score}점입니다. 다시 도전해 보세요.`);}
function stop(){game.running=false;game.pending=false;game.reset();send('S');render();}
function line(s){
 const now=performance.now();
 if(s==='READY'){ $('sensor').textContent='카메라 연결됨 · 손을 보여 주세요.';return; }
 if(s.startsWith('ERROR')){ $('sensor').textContent='카메라 통신 실패 · I2C 설정과 배선을 확인하세요.';latest=null;samples.clear();game.reset();return; }
 const p=parseHand(s);latest=p;
 if(!p){game.reset();samples.clear();$('sensor').textContent=s==='NONE'?'손 1개가 필요합니다 · 손 없음, 여러 손 또는 통신 오류':'좌표를 사용할 수 없습니다 · 검지와 손목이 잘 보이게 해 주세요.';return;}
 lastSeen=now;
 $('sensor').textContent=`손끝 X ${p.x}, Y ${p.y} · 검지 좌표 수신 중${p.bend===null?' · 이전 스케치: 움직임 보너스 없음':''}`;
 if(calibrating){samples.add(p,now);const result=samples.measure(now);$('sensor').textContent+=` · 보정 표본 ${result.count}개${result.point?' · 저장 가능':result.error==='moving'?' · 손을 잠시 고정해 주세요':' · 조금만 기다려 주세요'}`;return;}
 if(game.running && now>=game.end){finish();return;}
 const mapped=screenPoint(p,points);const number=hitNumber(mapped,game.positions);
 const dot=$('dot');dot.hidden=!mapped;if(mapped){dot.style.left=`${mapped.x*100}%`;dot.style.top=`${mapped.y*100}%`;}
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
 let phase='포트 선택';
 try{port=await navigator.serial.requestPort();phase='포트 열기';await port.open({baudRate:115200});phase='데이터 수신';writer=port.writable.getWriter();reader=port.readable.getReader();$('disconnect').disabled=false;$('calibrate').disabled=false;$('sensor').textContent='UNO USB 연결됨 · 카메라 데이터를 기다리는 중';status('연결됨. 위치 보정을 시작해 주세요.');
 let buffer='';const decoder=new TextDecoder();
 while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let n;while((n=buffer.indexOf('\n'))>=0){line(buffer.slice(0,n).trim());buffer=buffer.slice(n+1);}if(buffer.length>2048)buffer='';}
 }catch(e){
 const advice=phase==='포트 선택'?'포트 선택을 취소했다면 UNO 연결을 다시 누르세요.':phase==='포트 열기'?'Arduino 시리얼 모니터와 다른 게임 탭을 닫고 USB를 다시 연결하세요.':e instanceof DOMException?'USB 연결이 끊겼거나 수신에 실패했습니다. USB를 다시 연결하세요.':'페이지 처리 오류가 발생했습니다. 아래 오류 내용을 알려 주세요.';
 status(`${phase} 실패 (${e.name}): ${e.message} · ${advice}`);
 }
 finally{
  game.running=false;game.pending=false;game.reset();latest=null;samples.clear();calibrating=false;
  await chain;
  try{reader?.releaseLock();}catch{}
  try{writer?.releaseLock();}catch{}
  try{await port?.close();}catch{}
  reader=null;writer=null;port=null;render();
  $('connect').disabled=false;$('disconnect').disabled=true;$('calibrate').disabled=true;$('capture').disabled=true;$('start').disabled=true;
  $('sensor').textContent='UNO USB 미연결';
 }
};
$('disconnect').onclick=async()=>{stop();await chain;status('UNO 연결을 해제했습니다. 다시 연결할 수 있습니다.');await reader?.cancel();};
$('calibrate').onclick=()=>{stop();points=[];samples.clear();calibrating=true;$('start').disabled=true;$('capture').disabled=false;status('왼쪽 위 표시를 가리키고 손을 고정한 뒤 현재 위치 저장을 눌러 주세요.');render();};
$('capture').onclick=()=>{
 if(!writer){status('먼저 UNO 연결을 눌러 주세요.');return;}
 const result=samples.measure(performance.now());
 if(!result.point){status(result.error==='moving'?'좌표가 움직이고 있습니다. 표시를 가리킨 채 잠시 고정해 주세요.':'아직 좌표가 부족합니다. 아래 수신 상태와 보정 표본 수를 확인해 주세요.');return;}
 const avg=result.point;
 if(points.some(p=>Math.hypot(p.x-avg.x,p.y-avg.y)<40)){status('이전 위치와 너무 가깝습니다. 손끝 위치가 구분되도록 가리켜 주세요.');return;}
 points.push(avg);samples.clear();
 if(points.length===4){
 if(!validCalibration(points)){points=[];status('보정 범위가 구분되지 않습니다. 왼쪽 위부터 다시 보정해 주세요.');render();return;}calibrating=false;$('capture').disabled=true;$('start').disabled=false;status('보정 완료. 게임 시작을 눌러 주세요.');}
 else status(`${['왼쪽 위','오른쪽 위','오른쪽 아래','왼쪽 아래'][points.length]} 표시를 가리킨 뒤 현재 위치 저장을 눌러 주세요.`);
 render();
};
$('start').onclick=()=>{if(!writer||points.length!==4)return;if(game.pending)game.nextStage(performance.now());else game.start(performance.now());status(`${game.stage+1}단계: ${STAGE_SECONDS[game.stage]}초 안에 1부터 5까지 가리켜 주세요.`);render();};
$('stop').onclick=()=>{stop();status('잠시 쉬세요. 시작 버튼으로 다시 시작할 수 있어요.');};
setInterval(()=>{const now=performance.now();if(now-lastSeen>300){latest=null;game.reset();$('dot').hidden=true;}if(now-lastSeen>1500){samples.clear();if(writer)$('sensor').textContent='최근 손 좌표가 없습니다 · 허스키렌즈 화면에서 손 인식을 확인하세요.';}if(game.running){if(now>=game.end){finish();}else $('time').textContent=Math.ceil((game.end-now)/1000);}},100);
render();

window.addEventListener("resize",()=>{stop();points=[];calibrating=false;$("capture").disabled=true;$("start").disabled=true;render();status("화면 크기가 바뀌었습니다. 위치 보정을 다시 해 주세요.");});
