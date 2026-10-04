'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {WebSocketServer, WebSocket} = require('ws');

const cfg = Object.freeze({speed:90,turn:150,drag:110,bullet:240,range:350,reload:5,zoom:1,mode:'still'});
const islands = [{x:-240,y:-110,r:55},{x:220,y:160,r:65},{x:340,y:-270,r:48},{x:-310,y:280,r:48}];
const wrap = a => Math.atan2(Math.sin(a),Math.cos(a));
const cleanNick = s => typeof s==='string' ? s.replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,16) : '';
function createWorld(){
  const ships=new Map(), inputs=new Map(); let shots=[],fx=[],nextShot=0;
  function spawn(pid,nick){
    let x,y,a;
    for(let i=0;i<100;i++){
      x=(Math.random()-.5)*900;y=(Math.random()-.5)*900;a=Math.random()*Math.PI*2;
      if(islands.every(i=>Math.hypot(x-i.x,y-i.y)>i.r+65)&&[...ships.values()].every(s=>s.pid===pid||Math.hypot(x-s.x,y-s.y)>150))break;
    }
    return {pid,nick,x,y,a,v:0,hp:1000,l:0,r:0,boost:0,bc:0,heal:0,hc:0,dead:0};
  }
  function join(pid,nick){if(ships.size>=8||!cleanNick(nick))return false;ships.set(pid,spawn(pid,cleanNick(nick)));return true}
  function leave(pid){ships.delete(pid);inputs.delete(pid)}
  function fire(s,a,salvo,range){
    if(s.dead||!Number.isFinite(a))return;
    a=wrap(a);const d=wrap(a-s.a);if(Math.abs(d)<Math.PI/4||Math.abs(d)>Math.PI*.75)return;
    range=Number.isFinite(range)?Math.max(80,Math.min(cfg.range,range)):cfg.range;
    const side=d>0?'r':'l';if(s[side]>0)return;s[side]=cfg.reload;
    for(let i=-1;i<=1;i++){const q=a+i*.055;shots.push({id:++nextShot,x:s.x+Math.cos(q)*26,y:s.y+Math.sin(q)*26,dx:Math.cos(q),dy:Math.sin(q),travel:0,range:range-26,owner:s.pid,salvo:Number.isSafeInteger(salvo)?salvo:undefined})}
    fx.push({x:s.x+Math.cos(a)*28,y:s.y+Math.sin(a)*28,life:.22,max:.22,type:'flash',owner:s.pid});return true;
  }
  function message(pid,m,now=Date.now()){
    const s=ships.get(pid);if(!s||!m||typeof m!=='object')return;
    const q=inputs.get(pid)||{x:0,y:0,at:now,lastAction:0};q.at=now;inputs.set(pid,q);
    if(m.type==='input'&&Number.isFinite(m.x)&&Number.isFinite(m.y)){q.x=Math.max(-1,Math.min(1,m.x));q.y=Math.max(-1,Math.min(1,m.y))}
    if(m.type!=='action'||s.dead||now-q.lastAction<80)return;q.lastAction=now;
    if(m.action==='fire')return fire(s,m.a,m.salvo,m.range);
    if(m.action==='boost'&&!s.bc){s.boost=3;s.bc=20}
    if(m.action==='heal'&&!s.hc){s.heal=5;s.hc=45}
  }
  function step(dt,now=Date.now()){
    for(const s of ships.values()){
      for(const k of ['l','r','boost','bc','hc'])s[k]=Math.max(0,s[k]-dt);
      if(s.dead){s.dead-=dt;if(s.dead<=0)Object.assign(s,spawn(s.pid,s.nick));continue}
      if(s.heal>0){s.hp=Math.min(1000,s.hp+30*dt);s.heal=Math.max(0,s.heal-dt)}
      const q=inputs.get(s.pid),n=q&&now-q.at<600?Math.hypot(q.x,q.y):0;
      const desired=n?Math.atan2(q.y/.58,q.x):s.a,angle=wrap(desired-s.a),turn=cfg.turn*Math.PI/180*dt;
      s.a+=Math.max(-turn,Math.min(turn,angle));
      const target=cfg.speed*Math.min(n,1)*(s.boost>0?1.5:1);s.v+=(target-s.v)*Math.min(1,dt*2.5);
      if(!n)s.v=Math.max(0,s.v-cfg.drag*dt);
      s.x=Math.max(-650,Math.min(650,s.x+Math.cos(s.a)*s.v*dt));s.y=Math.max(-650,Math.min(650,s.y+Math.sin(s.a)*s.v*dt));
      for(const i of islands){const dx=s.x-i.x,dy=s.y-i.y,d=Math.hypot(dx,dy),r=i.r+18;if(d<r){s.x=i.x+(dx/(d||1))*r;s.y=i.y+(dy/(d||1))*r;s.v*=.75}}
    }
    for(let j=shots.length-1;j>=0;j--){
      const b=shots[j],distance=Math.min(cfg.bullet*dt,Math.max(0,b.range-b.travel)),ox=b.x,oy=b.y;b.x+=b.dx*distance;b.y+=b.dy*distance;b.travel+=distance;
      const near=(x,y,r)=>{const dx=b.x-ox,dy=b.y-oy,u=Math.max(0,Math.min(1,((x-ox)*dx+(y-oy)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ox-u*dx,y-oy-u*dy)<r};
      let remove=b.travel>=b.range;
      if(islands.some(i=>near(i.x,i.y,i.r)))remove=true;
      else{const target=[...ships.values()].find(s=>s.pid!==b.owner&&!s.dead&&near(s.x,s.y,24));if(target){target.hp=Math.max(0,target.hp-100);target.heal=0;fx.push({x:target.x,y:target.y,life:.5,max:.5,type:'hit'});if(!target.hp){target.dead=2;fx.push({x:target.x,y:target.y,life:1.5,max:1.5,type:'sink'})}remove=true}}
      if(remove){fx.push({x:b.x,y:b.y,life:.4,max:.4,type:'splash'});shots.splice(j,1)}
    }
    fx=fx.filter(f=>(f.life-=dt)>0);
  }
  return {ships,join,leave,message,step,snapshot:()=>({type:'state',ships:[...ships.values()],shots,fx,cfg})};
}
function createGameServer(){
  const world=createWorld(),clients=new Map();
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,players:world.ships.size}));return}
    if(pathname==='/network-config.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end("window.NAVAL_SERVER_URL=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';");return}
    const file={'/':'index.html','/index.html':'index.html','/PEERJS-LICENSE.txt':'PEERJS-LICENSE.txt'}[pathname];
    if(!file){res.writeHead(404);res.end('Not found');return}
    res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8','Cache-Control':'no-cache'});fs.createReadStream(path.join(__dirname,file)).pipe(res);
  });
  const wss=new WebSocketServer({server,path:'/ws',maxPayload:2048});
  const send=(ws,m)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<65536)ws.send(JSON.stringify(m))};
  wss.on('connection',ws=>{
    const pid=randomUUID();let joined=false,alive=true,rateAt=Date.now(),messages=0;
    const helloTimeout=setTimeout(()=>{if(!joined)ws.close(1008,'Nickname required')},10000);
    ws.on('pong',()=>alive=true);ws.isAlive=()=>alive;ws.markDead=()=>alive=false;
    ws.on('message',raw=>{
      const now=Date.now();if(now-rateAt>=1000){rateAt=now;messages=0}if(++messages>100){ws.close(1008,'Rate limit');return}
      let m;try{m=JSON.parse(raw)}catch{return}
      if(!m||typeof m!=='object')return;
      if(!joined){if(m.type!=='hello'||m.version!==2||!cleanNick(m.nick)){ws.close(1008,'Invalid nickname');return}if(!world.join(pid,m.nick)){send(ws,{type:'full'});ws.close(1008,'Sea full');return}joined=true;clearTimeout(helloTimeout);clients.set(pid,ws);send(ws,{type:'welcome',pid});send(ws,world.snapshot());return}
      if(m.type==='ping'&&Number.isSafeInteger(m.id)){send(ws,{type:'pong',id:m.id});return}
      const accepted=world.message(pid,m,now);if(m.type==='action'&&m.action==='fire'&&Number.isSafeInteger(m.salvo))send(ws,{type:'fireResult',salvo:m.salvo,accepted:accepted===true});
    });
    ws.on('error',()=>{});ws.on('close',()=>{clearTimeout(helloTimeout);clients.delete(pid);world.leave(pid)});
  });
  let previous=performance.now(),ticks=0;
  const timer=setInterval(()=>{const now=performance.now();world.step(Math.min((now-previous)/1000,.1));previous=now;if(++ticks%2===0){const state=world.snapshot();for(const ws of clients.values())send(ws,state)}},25);
  const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive()){ws.terminate();continue}ws.markDead();ws.ping()}},10000);
  return {server,world,close:()=>{clearInterval(timer);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();wss.close();return new Promise(resolve=>server.close(resolve))}};
}
if(require.main===module){const game=createGameServer();game.server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Naval server ready'));for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>game.close().then(()=>process.exit(0)))}
module.exports={createWorld,createGameServer};
