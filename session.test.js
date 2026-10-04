'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const {createGameServer}=require('./server');
test('cookie restores nickname and score even when local storage token is missing or replaced',async()=>{
 const game=createGameServer({bots:false});await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+game.server.address().port;
 let ws;try{
 const session=await fetch(base+'/session',{method:'POST',body:'{}'});assert.equal(session.status,200);const cookie=session.headers.get('set-cookie').split(';')[0],first=await session.json();assert.equal(first.profile,null);assert.match(session.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
 ws=new WebSocket(base.replace('http:','ws:')+'/ws',{headers:{Cookie:cookie}});
 const welcome=new Promise((r,j)=>{ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome')r(m);if(m.type==='error')j(Error(m.message))});ws.on('error',j)});
 await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'hello',version:2,nick:'Sabit Kaptan',token:'a'.repeat(64)}));const captain=await welcome;
 const profile=game.world.profiles.get(captain.pid);profile.score=250;profile.bank=12;
 await new Promise(r=>{ws.once('close',r);ws.close()});
 for(const body of ['{}',JSON.stringify({token:'b'.repeat(64)})]){const response=await fetch(base+'/session',{method:'POST',headers:{Cookie:cookie},body}),saved=await response.json();assert.equal(saved.token,first.token);assert.equal(saved.profile.nick,'Sabit Kaptan');assert.equal(saved.profile.score,250);assert.equal(saved.profile.bank,12)}
 const second=await fetch(base+'/session',{method:'POST',body:'{}'});assert.equal((await second.json()).profile,null);
 const blocked=await fetch(base+'/session',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'});assert.equal(blocked.status,403);
 }finally{if(ws)ws.terminate();await game.close()}
});
