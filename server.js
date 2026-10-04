'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {randomUUID,randomBytes}=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const {createProfileStore}=require('./profile-store');
const cfg=Object.freeze({speed:90,turn:150,drag:110,bullet:240,range:350,reload:5,zoom:1,mode:'still'});
const types={skiff:{maxhp:800,speed:115,turn:180,capacity:80,reload:4.5},brig:{maxhp:1200,speed:78,turn:120,capacity:140,reload:5.5}};
const islands=[{x:-240,y:-110,r:55},{x:220,y:160,r:65},{x:340,y:-270,r:48},{x:-310,y:280,r:48}];
const homePoints=[[-550,-500],[-550,0],[-550,500],[0,550],[550,500],[550,0],[550,-500],[0,-550]];
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const validToken=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
function cookieToken(req){const value=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('naval-captain-v2='))?.slice('naval-captain-v2='.length);return validToken(value)?value:null}
function sessionCookie(req,token){return 'naval-captain-v2='+token+'; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax'+(req.socket.encrypted||req.headers['x-forwarded-proto']==='https'?'; Secure':'')}
const cleanNick=s=>typeof s==='string'?s.replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,16):'';
function createWorld(options={}){
 const ships=new Map(),inputs=new Map(),profiles=new Map();let shots=[],fx=[],loot=[],nextShot=0,nextFx=0,nextLoot=0,elapsed=0,resourceTimer=0;
 let homes=[],match={number:1,remaining:300,phase:'playing',results:[]};const mark=options.mark||(()=>{});
 function event(type,x,y,extra={}){fx.push({id:++nextFx,type,x,y,life:type==='sink'?1.5:type==='flash'?.28:.65,max:type==='sink'?1.5:type==='flash'?.28:.65,...extra})}
 function spawn(pid,nick,kind='skiff',bot=false,home=null){let x,y,a;for(let j=0;j<100;j++){x=(Math.random()-.5)*900;y=(Math.random()-.5)*900;a=Math.random()*Math.PI*2;if([...islands,...homes].every(i=>Math.hypot(x-i.x,y-i.y)>i.r+65)&&[...ships.values()].every(s=>s.pid===pid||Math.hypot(x-s.x,y-s.y)>100))break}return{pid,nick,kind,bot,home,...types[kind],x,y,a,v:0,hp:types[kind].maxhp,l:0,r:0,boost:0,bc:0,heal:0,hc:0,dead:0,cargo:bot?20:0,unloading:false,matchScore:0,matchKills:0}}
 function adjustBots(){if(options.bots===false)return;const humans=[...ships.values()].filter(s=>!s.bot).length,want=humans?Math.max(0,4-humans):0,bots=[...ships.values()].filter(s=>s.bot);while(bots.length>want){const b=bots.pop();ships.delete(b.pid);inputs.delete(b.pid);shots=shots.filter(q=>q.owner!==b.pid)}while(bots.length<want){const n=bots.length+1,pid='bot-'+n,b=spawn(pid,'BOT · Korsan '+n,n%2?'skiff':'brig',true);ships.set(pid,b);bots.push(b)}}
 function join(pid,nick,kind='skiff',profile=null){if([...ships.values()].filter(s=>!s.bot).length>=8||!cleanNick(nick)||ships.has(pid))return false;kind=types[kind]?kind:'skiff';const slot=homePoints.findIndex((_,j)=>!homes.some(h=>h.slot===j)),[x,y]=homePoints[slot],home={slot,x,y,r:38,dockRadius:105,owner:pid,nick};homes.push(home);ships.set(pid,spawn(pid,nick,kind,false,home));if(profile)profiles.set(pid,profile);adjustBots();return true}
 function drop(s,ratio=.5){const amount=Math.floor(s.cargo*ratio);s.cargo=0;if(!amount)return;const count=Math.min(6,Math.ceil(amount/10));for(let j=0;j<count;j++){const angle=j*Math.PI*2/count;loot.push({id:++nextLoot,x:s.x+Math.cos(angle)*28,y:s.y+Math.sin(angle)*28,amount:Math.floor(amount/count)+(j<amount%count?1:0),life:90})}}
 function leave(pid){const s=ships.get(pid);if(s)drop(s);ships.delete(pid);inputs.delete(pid);profiles.delete(pid);homes=homes.filter(h=>h.owner!==pid);adjustBots()}
 function addScore(s,points){s.matchScore+=points;const p=profiles.get(s.pid);if(p){p.score+=points;mark(p)}}
 function fire(s,a,salvo,range){if(s.dead||match.phase!=='playing'||!Number.isFinite(a))return false;a=wrap(a);const d=wrap(a-s.a);if(Math.abs(d)<Math.PI/4||Math.abs(d)>Math.PI*.75)return false;range=Number.isFinite(range)?Math.max(80,Math.min(cfg.range,range)):cfg.range;const side=d>0?'r':'l';if(s[side]>0)return false;s[side]=s.reload;for(let i=-1;i<=1;i++){const q=a+i*.055;shots.push({id:++nextShot,x:s.x+Math.cos(q)*26,y:s.y+Math.sin(q)*26,dx:Math.cos(q),dy:Math.sin(q),travel:0,range:range-26,owner:s.pid,salvo:Number.isSafeInteger(salvo)?salvo:undefined,damage:s.bot?70:100})}event('flash',s.x+Math.cos(a)*28,s.y+Math.sin(a)*28,{owner:s.pid});return true}
 function message(pid,m,now=Date.now()){const s=ships.get(pid);if(!s||!m||typeof m!=='object')return false;const q=inputs.get(pid)||{x:0,y:0,at:now,lastAction:0};q.at=now;inputs.set(pid,q);if(m.type==='input'&&Number.isFinite(m.x)&&Number.isFinite(m.y)){q.x=Math.max(-1,Math.min(1,m.x));q.y=Math.max(-1,Math.min(1,m.y))}if(m.type!=='action'||s.dead||match.phase!=='playing'||now-q.lastAction<80)return false;q.lastAction=now;if(m.action==='fire')return fire(s,m.a,m.salvo,m.range);if(m.action==='boost'&&!s.bc){s.boost=3;s.bc=20}if(m.action==='heal'&&!s.hc){s.heal=5;s.hc=45}return true}
 function resource(){if(loot.length>=30)return;for(let j=0;j<100;j++){const x=(Math.random()-.5)*900,y=(Math.random()-.5)*900;if(islands.every(i=>Math.hypot(x-i.x,y-i.y)>i.r+25)){loot.push({id:++nextLoot,x,y,amount:10,life:90});break}}}
 function botInput(s,now){const targets=[...ships.values()].filter(q=>q.pid!==s.pid&&!q.dead),target=targets.sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];if(!target)return{x:0,y:0,at:now};const distance=Math.hypot(target.x-s.x,target.y-s.y),a=Math.atan2(target.y-s.y,target.x-s.x),desired=distance>290?a:distance<150?a+Math.PI:a+Math.PI/2;s.aiClock=(s.aiClock||0)-.025;if(s.aiClock<=0){s.aiClock=.65+Math.random()*.6;const travel=distance/cfg.bullet,tx=target.x+Math.cos(target.a)*target.v*travel*.6,ty=target.y+Math.sin(target.a)*target.v*travel*.6;if(distance<330)fire(s,Math.atan2(ty-s.y,tx-s.x),undefined,Math.min(350,Math.hypot(tx-s.x,ty-s.y)+15));if(s.hp<s.maxhp*.45&&!s.hc){s.heal=5;s.hc=45}}return{x:Math.cos(desired)*.65,y:Math.sin(desired)*.58*.65,at:now}}
 function finishRound(){match.phase='results';match.remaining=10;match.results=[...ships.values()].map(s=>({pid:s.pid,nick:s.nick,bot:s.bot,score:Math.floor(s.matchScore),kills:s.matchKills})).sort((a,b)=>b.score-a.score||b.kills-a.kills);for(const s of ships.values()){const p=profiles.get(s.pid);if(p){p.rounds++;if(match.results[0]?.pid===s.pid)p.wins++;mark(p)}}shots=[];event('round',0,0,{number:match.number})}
 function resetRound(){for(const s of ships.values())Object.assign(s,spawn(s.pid,s.nick,s.kind,s.bot,s.home));inputs.clear();shots=[];loot=[];fx=[];resourceTimer=0;match={number:match.number+1,remaining:300,phase:'playing',results:[]}}
 function step(dt,now=Date.now()){
 if(!ships.size)return;elapsed+=dt;match.remaining-=dt;if(match.remaining<=0){if(match.phase==='playing')finishRound();else resetRound()}if(match.phase!=='playing'){fx=fx.filter(f=>(f.life-=dt)>0);return}
 resourceTimer-=dt;if(resourceTimer<=0){resourceTimer=5;resource()}
 for(const s of ships.values()){
 for(const k of['l','r','boost','bc','hc'])s[k]=Math.max(0,s[k]-dt);s.unloading=false;
 if(s.dead){s.dead-=dt;if(s.dead<=0){const score=s.matchScore,kills=s.matchKills;Object.assign(s,spawn(s.pid,s.nick,s.kind,s.bot,s.home));s.matchScore=score;s.matchKills=kills}continue}
 if(s.heal>0){s.hp=Math.min(s.maxhp,s.hp+30*dt);s.heal=Math.max(0,s.heal-dt)}
 const q=s.bot?botInput(s,now):inputs.get(s.pid),n=q&&now-q.at<600?Math.hypot(q.x,q.y):0,desired=n?Math.atan2(q.y/.58,q.x):s.a,angle=wrap(desired-s.a),turn=s.turn*Math.PI/180*dt;s.a+=Math.max(-turn,Math.min(turn,angle));const target=s.speed*Math.min(n,1)*(s.boost>0?1.5:1);s.v+=(target-s.v)*Math.min(1,dt*2.5);if(!n)s.v=Math.max(0,s.v-cfg.drag*dt);s.x=Math.max(-650,Math.min(650,s.x+Math.cos(s.a)*s.v*dt));s.y=Math.max(-650,Math.min(650,s.y+Math.sin(s.a)*s.v*dt));
 for(const i of[...islands,...homes]){const dx=s.x-i.x,dy=s.y-i.y,d=Math.hypot(dx,dy),r=i.r+18;if(d<r){s.x=i.x+(dx/(d||1))*r;s.y=i.y+(dy/(d||1))*r;s.v*=.75}}
 for(let j=loot.length-1;j>=0;j--){const item=loot[j];if(s.cargo<s.capacity&&Math.hypot(s.x-item.x,s.y-item.y)<30){const amount=Math.min(item.amount,s.capacity-s.cargo);s.cargo+=amount;item.amount-=amount;if(item.amount<.001)loot.splice(j,1);event('collect',s.x,s.y,{owner:s.pid,amount})}}
 if(s.home&&Math.hypot(s.x-s.home.x,s.y-s.home.y)<=s.home.dockRadius&&s.cargo>0){s.unloading=true;const amount=Math.min(s.cargo,s.capacity/30*dt);s.cargo-=amount;const p=profiles.get(s.pid);if(p){p.bank+=amount;mark(p)}addScore(s,amount*5)}
 }
 for(let j=shots.length-1;j>=0;j--){const b=shots[j],distance=Math.min(cfg.bullet*dt,Math.max(0,b.range-b.travel)),ox=b.x,oy=b.y;b.x+=b.dx*distance;b.y+=b.dy*distance;b.travel+=distance;
 const near=(x,y,r)=>{const dx=b.x-ox,dy=b.y-oy,u=Math.max(0,Math.min(1,((x-ox)*dx+(y-oy)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ox-u*dx,y-oy-u*dy)<r};let remove=b.travel>=b.range;
 if([...islands,...homes].some(i=>near(i.x,i.y,i.r)))remove=true;else{const target=[...ships.values()].find(s=>s.pid!==b.owner&&!s.dead&&near(s.x,s.y,24));if(target){const protectedHome=target.home&&Math.hypot(target.x-target.home.x,target.y-target.home.y)<target.home.dockRadius;target.hp=Math.max(0,target.hp-b.damage*(protectedHome?.6:1));target.heal=0;event('hit',target.x,target.y,{target:target.pid,owner:b.owner});if(!target.hp){target.dead=2;drop(target);const p=profiles.get(target.pid);if(p){p.deaths++;mark(p)}const killer=ships.get(b.owner);if(killer){killer.matchKills++;addScore(killer,100);const kp=profiles.get(killer.pid);if(kp){kp.kills++;mark(kp)}}event('sink',target.x,target.y,{target:target.pid,owner:b.owner,killer:killer?.nick||'Korsan',victim:target.nick})}remove=true}}
 if(remove){event('splash',b.x,b.y);shots.splice(j,1)}}
 loot=loot.filter(q=>(q.life-=dt)>0);fx=fx.filter(f=>(f.life-=dt)>0);
 }
 return{ships,profiles,join,leave,message,step,snapshot:()=>({type:'state',ships:[...ships.values()],shots,fx,loot,homes,match,cfg,humans:[...ships.values()].filter(s=>!s.bot).length})};
}
function createGameServer(options={}){
 const store=createProfileStore(),world=createWorld({mark:store.mark,bots:options.bots}),clients=new Map();let leaderboard=[],ready=false;
 store.ready.then(()=>{ready=true;return store.top()}).then(rows=>leaderboard=rows).catch(()=>console.error('Database startup failed'));
 const server=http.createServer(async (req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/session'){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 if(req.method!=='POST'){res.writeHead(405);res.end('{}');return}
 const origin=req.headers.origin;let sameOrigin=!origin;try{if(origin)sameOrigin=new URL(origin).host===req.headers.host}catch{}if(!sameOrigin){res.writeHead(403);res.end('{}');return}
 let body='';try{for await(const chunk of req){body+=chunk;if(body.length>512){res.writeHead(413);res.end('{}');return}}
 const supplied=JSON.parse(body||'{}').token,token=cookieToken(req)||(validToken(supplied)?supplied:randomBytes(32).toString('hex'));
 const profile=await store.find(token);res.setHeader('Set-Cookie',sessionCookie(req,token));res.end(JSON.stringify({token,profile:profile?store.publicRow(profile):null}));
 }catch{res.writeHead(503);res.end(JSON.stringify({error:'Oturum yüklenemedi'}))}return}
 if(pathname==='/health'){res.writeHead(ready?200:503,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:ready,players:clients.size,persistentScores:store.persistent}));return}
 if(pathname==='/leaderboard'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({persistent:store.persistent,rows:leaderboard}));return}
 if(pathname==='/network-config.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end("window.NAVAL_SERVER_URL=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';");return}
 const file={'/':'index.html','/index.html':'index.html','/PEERJS-LICENSE.txt':'PEERJS-LICENSE.txt'}[pathname];if(!file){res.writeHead(404);res.end('Not found');return}res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8','Cache-Control':'no-cache'});fs.createReadStream(path.join(__dirname,file)).pipe(res)});
 const wss=new WebSocketServer({server,path:'/ws',maxPayload:2048}),send=(ws,m)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<65536)ws.send(JSON.stringify(m))};
 wss.on('connection',(ws,req)=>{let pid=null,joined=false,logging=false,alive=true,rateAt=Date.now(),messages=0;const helloTimeout=setTimeout(()=>{if(!joined)ws.close(1008,'Nickname required')},15000);ws.on('pong',()=>alive=true);ws.isAlive=()=>alive;ws.markDead=()=>alive=false;
 ws.on('message',async raw=>{const now=Date.now();if(now-rateAt>=1000){rateAt=now;messages=0}if(++messages>100){ws.close(1008,'Rate limit');return}let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m!=='object')return;
 if(!joined){if(logging)return;if(m.type!=='hello'||m.version!==2||!cleanNick(m.nick)||!ready){ws.close(1008,'Invalid login');return}logging=true;const token=cookieToken(req)||(validToken(m.token)?m.token:randomBytes(32).toString('hex'));try{const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim(),profile=await store.login(token,cleanNick(m.nick),ip);pid=profile.id;if(ws.readyState!==WebSocket.OPEN)return;if(clients.has(pid)){send(ws,{type:'error',message:'Bu kaptan başka sekmede açık.'});ws.close();return}if(!world.join(pid,profile.nick,m.kind,profile)){send(ws,{type:'full'});ws.close();return}joined=true;clearTimeout(helloTimeout);clients.set(pid,ws);send(ws,{type:'welcome',pid,token,nick:profile.nick});send(ws,{type:'board',rows:leaderboard,persistent:store.persistent,profile:store.publicRow(profile)});send(ws,world.snapshot())}catch(e){send(ws,{type:'error',message:e.message==='nick_taken'?'Bu nick alınmış. Başka bir nick seç.':'Kayıt servisi şu an kullanılamıyor.'});ws.close()}return}
 if(m.type==='ping'&&Number.isSafeInteger(m.id)){send(ws,{type:'pong',id:m.id});return}if(m.type==='board'){send(ws,{type:'board',rows:leaderboard,persistent:store.persistent,profile:store.publicRow(world.profiles.get(pid))});return}
 const accepted=world.message(pid,m,now);if(m.type==='action'&&m.action==='fire'&&Number.isSafeInteger(m.salvo))send(ws,{type:'fireResult',salvo:m.salvo,accepted:accepted===true});
 });ws.on('error',()=>{});ws.on('close',()=>{clearTimeout(helloTimeout);if(joined&&clients.get(pid)===ws){clients.delete(pid);world.leave(pid);store.flush()}})});
 let previous=performance.now(),ticks=0;const timer=setInterval(()=>{const now=performance.now();world.step(Math.min((now-previous)/1000,.1));previous=now;if(++ticks%2===0){const state=world.snapshot();for(const[pid,ws]of clients){const profile=world.profiles.get(pid);send(ws,{...state,profile:profile?store.publicRow(profile):null})}}},25);
 const scores=setInterval(()=>store.top().then(rows=>{leaderboard=rows;for(const[pid,ws]of clients)send(ws,{type:'board',rows,persistent:store.persistent,profile:store.publicRow(world.profiles.get(pid))})}).catch(()=>console.error('Leaderboard refresh delayed')),10000);
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive()){ws.terminate();continue}ws.markDead();ws.ping()}},10000);
 return{server,world,close:async()=>{clearInterval(timer);clearInterval(scores);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();wss.close();await store.close();return new Promise(resolve=>server.close(resolve))}};
}
if(require.main===module){const game=createGameServer();game.server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Naval server ready'));for(const signal of['SIGTERM','SIGINT'])process.on(signal,()=>game.close().then(()=>process.exit(0)))}
module.exports={createWorld,createGameServer};
