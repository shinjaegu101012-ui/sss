export function parseHand(line) {
  const parts=line.trim().split(',');
  if(parts.length!==9 || parts[0]!=='HAND' || parts.slice(1).some(x=>!/^\d+$/.test(x))) return null;
  const a=parts.slice(1).map(Number);
  if(a.some(x=>x>4096)) return null;
  const scale=Math.hypot(a[6]-a[4],a[7]-a[5]);
  if(scale<5 || Math.hypot(a[0]-a[2],a[1]-a[3])<5) return null;
  return {x:a[0],y:a[1],bend:Math.hypot(a[0]-a[4],a[1]-a[5])/scale};
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
    if(this.bend!==null) { const delta=Math.abs(p.bend-this.bend); if(delta>.08 && delta<.8) this.movement=Math.min(2,this.movement+delta); }
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
