'use strict';
const {createHash,randomBytes}=require('node:crypto');
function createProfileStore(){
 const cache=new Map();let pool=null,salt=randomBytes(32).toString('hex'),queue=Promise.resolve(),dirty=new Set();
 const ready=(async()=>{if(!process.env.DATABASE_URL)return;const {Pool}=require('pg');pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000});
 await pool.query(`CREATE TABLE IF NOT EXISTS naval_settings(key text PRIMARY KEY,value text NOT NULL);
 CREATE TABLE IF NOT EXISTS naval_profiles(id text PRIMARY KEY,nick text NOT NULL,kills integer NOT NULL DEFAULT 0,deaths integer NOT NULL DEFAULT 0,bank double precision NOT NULL DEFAULT 0,score double precision NOT NULL DEFAULT 0,wins integer NOT NULL DEFAULT 0,rounds integer NOT NULL DEFAULT 0,ip_hash text,updated_at timestamptz NOT NULL DEFAULT now());
 CREATE UNIQUE INDEX IF NOT EXISTS naval_nick_unique ON naval_profiles(lower(nick));`);
 await pool.query('INSERT INTO naval_settings(key,value) VALUES ($1,$2) ON CONFLICT DO NOTHING',['ip_salt',salt]);salt=(await pool.query('SELECT value FROM naval_settings WHERE key=$1',['ip_salt'])).rows[0].value;
 })();
 function hashToken(token){return createHash('sha256').update(token).digest('hex')}
 async function login(token,nick,ip){await ready;const id=hashToken(token);let p=cache.get(id);if(!p&&pool)p=(await pool.query('SELECT id,nick,kills,deaths,bank,score,wins,rounds FROM naval_profiles WHERE id=$1',[id])).rows[0];
 if(!p){if([...cache.values()].some(q=>q.nick.toLocaleLowerCase()===nick.toLocaleLowerCase()))throw Error('nick_taken');p={id,nick,kills:0,deaths:0,bank:0,score:0,wins:0,rounds:0};if(pool)try{await pool.query('INSERT INTO naval_profiles(id,nick) VALUES($1,$2)',[id,nick])}catch(e){if(e.code==='23505')throw Error('nick_taken');throw e}}
 p.ip_hash=createHash('sha256').update(salt+'|'+ip).digest('hex');cache.set(id,p);mark(p);return p;
 }
 function mark(p){dirty.add(p.id)}
 function flush(){if(!pool){dirty.clear();return Promise.resolve()}const rows=[...dirty].map(id=>({...cache.get(id)}));dirty.clear();queue=queue.then(async()=>{for(const p of rows)await pool.query('UPDATE naval_profiles SET kills=$2,deaths=$3,bank=$4,score=$5,wins=$6,rounds=$7,ip_hash=$8,updated_at=now() WHERE id=$1',[p.id,p.kills,p.deaths,p.bank,p.score,p.wins,p.rounds,p.ip_hash])}).catch(()=>{for(const p of rows)dirty.add(p.id);console.error('Score save delayed')});return queue}
 function publicRow(p){return{nick:p.nick,kills:Number(p.kills),deaths:Number(p.deaths),bank:Math.floor(Number(p.bank)),score:Math.floor(Number(p.score)),wins:Number(p.wins),rounds:Number(p.rounds)}}
 async function top(){await flush();if(pool)return(await pool.query('SELECT nick,kills,deaths,bank,score,wins,rounds FROM naval_profiles ORDER BY score DESC,kills DESC,nick ASC LIMIT 30')).rows.map(publicRow);return[...cache.values()].sort((a,b)=>b.score-a.score||b.kills-a.kills).slice(0,30).map(publicRow)}
 return{ready,login,mark,flush,top,publicRow,get persistent(){return !!pool},close:async()=>{await flush();if(pool)await pool.end()}};
}
module.exports={createProfileStore};
