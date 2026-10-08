import test from 'node:test';import assert from 'node:assert/strict';import {parseHand,classify,Round} from '../web/logic.mjs';
test('packet validation and calibration regions',()=>{assert.equal(parseHand('NONE'),null);assert.equal(parseHand('HAND,,,,,,,,'),null);assert.ok(parseHand('HAND,100,100,90,90,50,50,70,70'));const points=[0,100,200,300,400].map(x=>({x,y:100}));assert.equal(classify({x:200,y:100},points),3);assert.equal(classify({x:250,y:100},points),0);});
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
