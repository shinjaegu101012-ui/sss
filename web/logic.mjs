export function parseHand(line) {
  const parts=line.trim().split(',');
  if(parts.length!==9 || parts[0]!=='HAND' || parts.slice(1).some(x=>!/^\d+$/.test(x))) return null;
  const a=parts.slice(1).map(Number);
  if(a.some(x=>x>4096)) return null;
  const scale=Math.hypot(a[6]-a[4],a[7]-a[5]);
  if(scale<5 || Math.hypot(a[0]-a[2],a[1]-a[3])<5) return null;
  return {x:a[0],y:a[1],bend:Math.hypot(a[0]-a[4],a[1]-a[5])/scale};
}
export function classify(p, points) {
  if(points.length!==5) return 0;
  const distances=points.map(q=>Math.hypot(p.x-q.x,p.y-q.y));
  const i=distances.indexOf(Math.min(...distances));
  const separation=Math.min(...points.filter((_,j)=>j!==i).map(q=>Math.hypot(q.x-points[i].x,q.y-points[i].y)));
  return distances[i]<separation*.4 ? i+1 : 0;
}
export class Round {
  start(now) { this.running=true; this.target=1; this.score=0; this.end=now+60000; this.reset(); }
  reset() { this.since=null; this.last=null; this.bend=null; this.movement=0; }
  update(p,number,now) {
    if(!this.running) return false;
    if(now>=this.end) {this.running=false;this.reset();return false;}
    if(!p || (this.last!==null && now-this.last>300)) this.reset();
    if(!p) return false;
    if(this.bend!==null) { const delta=Math.abs(p.bend-this.bend); if(delta>.08 && delta<.8) this.movement=Math.min(2,this.movement+delta); }
    this.bend=p.bend; this.last=now;
    if(number!==this.target) {this.since=null;return false;}
    if(this.since===null) this.since=now;
    if(now-this.since<700) return false;
    this.score+=10+Math.min(5,Math.floor(this.movement*2.5));
    this.target=this.target%5+1;this.reset();return true;
  }
}
