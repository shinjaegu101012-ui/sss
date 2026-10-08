// The game uses only index-finger coordinates. Legacy packets still allow
// positioning; index joint bonuses require the new INDEX packet.
export function parseHand(line) {
 const parts=line.trim().split(',');
 if(parts.length!==9 || !['HAND','INDEX'].includes(parts[0]))return null;
 const coords=parts.slice(1,parts[0]==='HAND'?5:9);
 if(coords.some(x=>!/^\d+$/.test(x)))return null;
 const a=coords.map(Number);if(a.some(x=>x>4096))return null;
 if(parts[0]==='HAND'){
  if(Math.hypot(a[0]-a[2],a[1]-a[3])<2)return null;
  return {x:a[0],y:a[1],bend:null};
 }
 // MCP -> PIP -> DIP -> TIP. Extension ratio uses this finger only.
 const lengths=[0,2,4].map(i=>Math.hypot(a[i+2]-a[i],a[i+3]-a[i+1]));
 if(lengths.some(x=>x<2))return null;
 const total=lengths.reduce((sum,x)=>sum+x,0);
 return {x:a[6],y:a[7],bend:Math.hypot(a[6]-a[0],a[7]-a[1])/total};
}
export const CORNERS=[{x:.1,y:.1},{x:.9,y:.1},{x:.9,y:.9},{x:.1,y:.9}];
export function validCalibration(points) {
 if(points.length!==4)return false;
 const crosses=points.map((a,i)=>{const b=points[(i+1)%4],c=points[(i+2)%4];return (b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);});
 return crosses.every(x=>x>100)||crosses.every(x=>x< -100);
}
export function screenPoint(p,points) {
 if(!validCalibration(points))return null;
 for(const ids of [[0,1,2],[0,2,3]]) {
  const [a,b,c]=ids.map(i=>points[i]);
  const det=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
  const u=((b.y-c.y)*(p.x-c.x)+(c.x-b.x)*(p.y-c.y))/det;
  const v=((c.y-a.y)*(p.x-c.x)+(a.x-c.x)*(p.y-c.y))/det,w=1-u-v;
  if(Math.min(u,v,w)>=-1e-6){const [A,B,C]=ids.map(i=>CORNERS[i]);return {x:u*A.x+v*B.x+w*C.x,y:u*A.y+v*B.y+w*C.y};}
 }
 return null;
}
export function randomPositions(random=Math.random) {
 // Continuous positions, not a fixed set of slots. Retry if crowded.
 for(let attempt=0;attempt<100;attempt++) {
  const positions=[];
  for(let tries=0;tries<500&&positions.length<5;tries++) {
   const p={x:.18+random()*.64,y:.22+random()*.56};
   if(positions.every(q=>Math.abs(q.x-p.x)>.18||Math.abs(q.y-p.y)>.25))positions.push(p);
  }
  if(positions.length===5)return positions;
 }
 throw new Error('Could not generate separated positions');
}
export function hitNumber(p,positions) {
 if(!p)return 0;
 const i=positions.findIndex(q=>Math.abs(q.x-p.x)<=.07&&Math.abs(q.y-p.y)<=.10);
 return i<0?0:i+1;
}
export const STAGE_SECONDS = [15, 10, 5];
export function shuffled(random = Math.random) {
  const values = [1,2,3,4,5];
  for(let i=4;i>0;i--) { const j=Math.floor(random()*(i+1)); [values[i],values[j]]=[values[j],values[i]]; }
  return values;
}
export class Round {
  constructor() { this.stage=0; this.score=0; this.layout=[1,2,3,4,5]; this.positions=randomPositions(); this.running=false; this.pending=false; this.outcome=null; }
  start(now) { this.stage=0; this.score=0; this.beginStage(now); }
  beginStage(now) { this.running=true; this.pending=false; this.outcome=null; this.target=1; this.layout=shuffled(); this.positions=randomPositions(); this.end=now+STAGE_SECONDS[this.stage]*1000; this.reset(); }
  nextStage(now) { if(!this.pending)return; this.stage++; this.beginStage(now); }
  expire(now) { if(this.running && now>=this.end) {this.running=false;this.outcome='timeout';this.reset();return true;} return false; }
  reset() { this.since=null; this.last=null; this.bend=null; this.movement=0; }
  update(p,number,now) {
    if(!this.running || this.expire(now)) return false;
    if(!p || (this.last!==null && now-this.last>300)) this.reset();
    if(!p) return false;
    if(Number.isFinite(p.bend) && Number.isFinite(this.bend)) { const delta=Math.abs(p.bend-this.bend); if(delta>.08 && delta<.8) this.movement=Math.min(2,this.movement+delta); }
    this.bend=p.bend; this.last=now;
    if(number!==this.target) {this.since=null;return false;}
    if(this.since===null) this.since=now;
    if(now-this.since<700) return false;
    this.score+=10+Math.min(5,Math.floor(this.movement*2.5));
    if(this.target===5) { this.running=false; this.pending=this.stage<2; this.outcome=this.pending?'stage-clear':'won'; }
    else this.target++;
    this.reset();return true;
  }
}

export class CalibrationSamples {
 constructor(){this.clear();}
 clear(){this.values=[];}
 add(p,now){this.values=this.values.filter(v=>now-v.at<=2500);this.values.push({...p,at:now});}
 measure(now){
  const values=this.values.filter(v=>now-v.at<=2500);
  if(values.length<4||now-values.at(-1).at>1500||values.at(-1).at-values[0].at<200)return {error:'waiting',count:values.length};
  const median=a=>{a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)];};
  const center={x:median(values.map(v=>v.x)),y:median(values.map(v=>v.y))};
  const stable=values.filter(v=>Math.hypot(v.x-center.x,v.y-center.y)<=20);
  if(stable.length<4||stable.length/values.length<.75)return {error:'moving',count:values.length};
  return {point:{x:stable.reduce((s,v)=>s+v.x,0)/stable.length,y:stable.reduce((s,v)=>s+v.y,0)/stable.length},count:values.length};
 }
}
