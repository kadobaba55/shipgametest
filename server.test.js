'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const {createWorld,createGameServer}=require('./server');
const vm=require('node:vm'),fs=require('node:fs');
test('server validates firing sectors, reload, damage and nickname after respawn',()=>{
  const w=createWorld();w.join('a','Kaptan A');w.join('b','Kaptan B');
  Object.assign(w.ships.get('a'),{x:0,y:0,a:-Math.PI/2});Object.assign(w.ships.get('b'),{x:120,y:0,a:0});
  w.message('a',{type:'action',action:'fire',a:-Math.PI/2},1000);assert.equal(w.snapshot().shots.length,0);
  w.message('a',{type:'action',action:'fire',a:0},1100);assert.equal(w.snapshot().shots.length,3);
  w.message('a',{type:'action',action:'fire',a:0},1200);assert.equal(w.snapshot().shots.length,3);
  for(let i=0;i<25;i++)w.step(.025,1300+i*25);assert.equal(w.ships.get('b').hp,700);
  Object.assign(w.ships.get('b'),{hp:0,dead:.01});w.step(.025,2000);assert.equal(w.ships.get('b').nick,'Kaptan B');assert.equal(w.ships.get('b').hp,1000);
  w.message('a',{type:'input',x:1,y:0},2000);w.step(.1,2000);assert.ok(w.ships.get('a').v>0);
  for(let i=0;i<30;i++)w.step(.1,5000+i*100);assert.equal(w.ships.get('a').v,0);
});
test('two actual WebSocket clients share state; limit is eight; disconnect removes ship',async t=>{
  const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));t.after(()=>game.close());
  const url='ws://127.0.0.1:'+game.server.address().port+'/ws';
  const clients=[];
  async function connect(nick){
    const ws=new WebSocket(url),data=[];clients.push(ws);ws.on('message',raw=>data.push(JSON.parse(raw)));
    await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});ws.send(JSON.stringify({type:'hello',version:2,nick}));
    return {ws,data};
  }
  async function until(fn){const end=Date.now()+3000;while(!fn()){if(Date.now()>end)throw Error('Timed out');await new Promise(r=>setTimeout(r,10))}}
  const a=await connect('Bir'),b=await connect('İki');
  await until(()=>a.data.some(m=>m.ships?.length===2)&&b.data.some(m=>m.ships?.length===2));
  a.ws.send(JSON.stringify({type:'ping',id:7}));await until(()=>a.data.some(m=>m.type==='pong'&&m.id===7));
  const id=a.data.find(m=>m.type==='welcome').pid;
  Object.assign(game.world.ships.get(id),{x:0,y:0,a:0});
  a.ws.send(JSON.stringify({type:'input',x:1,y:0}));await until(()=>game.world.ships.get(id).x>2);
  await until(()=>b.data.some(m=>m.ships?.find(s=>s.pid===id)?.x>2));
  for(let i=0;i<6;i++)await connect('Ek'+i);await until(()=>game.world.ships.size===8);
  const ninth=await connect('Dokuz');await until(()=>ninth.data.some(m=>m.type==='full'));assert.equal(game.world.ships.size,8);
  b.ws.close();await until(()=>game.world.ships.size===7);assert.ok(a.data.some(m=>m.ships?.some(s=>s.nick==='İki')));
  for(const ws of clients)ws.close();
});
test('actual game client code joins server and receives another player and damage',async t=>{
  const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));t.after(()=>game.close());
  const source=[...fs.readFileSync(__dirname+'/index.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  const url='ws://127.0.0.1:'+game.server.address().port+'/ws';
  const contexts=[];t.after(()=>contexts.forEach(c=>vm.runInContext('cleanupNet()',c)));
  function client(nick){
    const els=new Map(),draw=new Proxy({measureText:()=>({width:50})},{get:(o,k)=>o[k]||(()=>{})});
    function el(k){if(!els.has(k))els.set(k,{style:{},focus(){},getContext:()=>draw,getBoundingClientRect:()=>({left:0,top:0,width:116,height:116}),setPointerCapture(){}});return els.get(k)}
    const s={window:{NAVAL_SERVER_URL:url},WebSocket,Peer:function(){},console,Math,JSON,Number,setTimeout,clearTimeout,setInterval:()=>0,Date,innerWidth:844,innerHeight:390,devicePixelRatio:1,performance,requestAnimationFrame(){},addEventListener(){},localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:el,addEventListener(){}}};
    vm.createContext(s);vm.runInContext(source,s);contexts.push(s);el('nickname').value=nick;vm.runInContext('onlineStart()',s);return s;
  }
  async function until(fn){const end=Date.now()+3000;while(!fn()){if(Date.now()>end)throw Error('Client timed out');await new Promise(r=>setTimeout(r,10))}}
  const a=client('Kaptan A'),b=client('Kaptan B');
  await until(()=>vm.runInContext('net.active&&net.count===2',a)&&vm.runInContext('net.active&&net.count===2',b));
  const aid=vm.runInContext('net.myId',a),bid=vm.runInContext('net.myId',b);
  Object.assign(game.world.ships.get(aid),{x:0,y:0,a:-Math.PI/2});Object.assign(game.world.ships.get(bid),{x:120,y:0,a:0});
  vm.runInContext('requestFire(0)',a);
  await until(()=>game.world.ships.get(bid).hp===700);await until(()=>vm.runInContext('p.hp===700',b));
  vm.runInContext('draw()',a);vm.runInContext('draw()',b);
  assert.equal(vm.runInContext('p.nick',b),'Kaptan B');assert.equal(vm.runInContext('net.role',a),'guest');
});
