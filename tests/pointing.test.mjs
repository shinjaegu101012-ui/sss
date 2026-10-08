import test from 'node:test';import assert from 'node:assert/strict';import {parseHand,screenPoint,hitNumber,randomPositions,validCalibration,Round} from '../web/logic.mjs';
test('packet validation and arbitrary screen hit testing',()=>{
 assert.equal(parseHand('NONE'),null);assert.equal(parseHand('HAND,,,,,,,,'),null);assert.ok(parseHand('HAND,100,100,90,90,50,50,70,70'));
 const points=[{x:100,y:100},{x:500,y:100},{x:500,y:400},{x:100,y:400}];
 assert.deepEqual(screenPoint({x:300,y:250},points),{x:.5,y:.5});
 assert.equal(hitNumber({x:.51,y:.49},[{x:.5,y:.5}]),1);
 assert.equal(hitNumber({x:.8,y:.8},[{x:.5,y:.5}]),0);
 assert.equal(screenPoint({x:0,y:0},points),null);
 assert.equal(validCalibration([{x:0,y:0},{x:1,y:1},{x:2,y:2},{x:3,y:3}]),false);
 const mirrored=points.map(p=>({x:600-p.x,y:p.y}));
 assert.deepEqual(screenPoint({x:300,y:250},mirrored),{x:.5,y:.5});
});
test('continuous random positions stay inside the board and never overlap',()=>{
 const layouts=new Set();
 for(let run=0;run<1000;run++){
  const positions=randomPositions();assert.equal(positions.length,5);layouts.add(JSON.stringify(positions));
  for(let i=0;i<5;i++){
   const p=positions[i];assert.ok(p.x-.07>=0&&p.x+.07<=1&&p.y-.1>=0&&p.y+.1<=1);
   assert.equal(hitNumber(p,positions),i+1);
   for(let j=0;j<i;j++)assert.ok(Math.abs(p.x-positions[j].x)>.18||Math.abs(p.y-positions[j].y)>.25);
  }
 }
 assert.equal(layouts.size,1000);
});
test('stale data resets dwell and a wrong target earns no points',()=>{
 const g=new Round();g.start(0);const p={bend:2};
 g.update(p,2,0);assert.equal(g.score,0);
 g.update(p,1,100);assert.equal(g.update(p,1,800),false);
 for(let t=900;t<=1600;t+=100)g.update(p,1,t);
 assert.equal(g.target,2);assert.equal(g.score,10);
 g.update(null,0,1700);assert.equal(g.update(p,2,1800),false);
});
test('all three stages have exact deadlines, pause between stages, preserve score and finish',()=>{
 const g=new Round();g.start(0);const durations=[15000,10000,5000];let now=0;
 for(let stage=0;stage<3;stage++){
  assert.equal(g.end-now,durations[stage]);assert.deepEqual([...g.layout].sort(),[1,2,3,4,5]);
  for(let number=1;number<=5;number++){
   for(let j=0;j<=7;j++){g.update({bend:2+(j%2)*.2},number,now);now+=100;}
  }
  assert.equal(g.running,false);assert.equal(g.pending,stage<2);
  if(stage<2){const score=g.score;now+=20000;g.nextStage(now);assert.equal(g.score,score);assert.equal(g.target,1);}
 }
 assert.equal(g.outcome,'won');assert.ok(g.score>=150&&g.score<=225);
});
test('deadline refuses late points and restart clears progress',()=>{
 const g=new Round();g.start(0);g.update({bend:2},1,14900);
 assert.equal(g.update({bend:2},1,15000),false);assert.equal(g.outcome,'timeout');assert.equal(g.score,0);
 g.start(20000);assert.equal(g.stage,0);assert.equal(g.end,35000);assert.equal(g.target,1);
});

test('calibration accepts slower frames but rejects stale, unstable or missing data',async()=>{
 const {CalibrationSamples}=await import('../web/logic.mjs');const samples=new CalibrationSamples();
 for(let i=0;i<4;i++)samples.add({x:100+i%2,y:100},i*450);
 assert.ok(samples.measure(1400).point);assert.equal(samples.measure(3000).error,'waiting');
 samples.clear();assert.equal(samples.measure(1400).count,0);
 for(let i=0;i<8;i++)samples.add({x:i%2?200:100,y:100},i*100);
 assert.equal(samples.measure(800).error,'moving');
 samples.clear();for(let i=0;i<5;i++)samples.add({x:i===4?300:100,y:100},i*100);
 assert.deepEqual(samples.measure(450).point,{x:100,y:100});
});
