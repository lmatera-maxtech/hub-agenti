/* ============================================================
   utils.js - funzioni condivise dalle due tab
   ============================================================ */

window.U = (function(){

  const nf0 = new Intl.NumberFormat('it-IT');
  const nf1 = new Intl.NumberFormat('it-IT', { minimumFractionDigits:1, maximumFractionDigits:1 });

  const $ = id => document.getElementById(id);

  /* numeri */
  const fInt = v => (v == null || isNaN(v)) ? '—' : nf0.format(Math.round(v));
  const fMin = v => (v == null || isNaN(v)) ? '—' : nf1.format(Number(v));

  /* durate */
  // "4m 57s" / "43s" - con l'unità in <span class="u"> per lo stile grande
  function fSecs(v){
    if (v == null || isNaN(v)) return '—';
    const s = Math.round(Number(v));
    if (s < 60) return s + '<span class="u">s</span>';
    const m = Math.floor(s/60), r = s % 60;
    return m + '<span class="u">m</span> ' + String(r).padStart(2,'0') + '<span class="u">s</span>';
  }
  // stessa cosa in testo semplice
  function fSecsPlain(v){
    if (v == null || isNaN(v)) return '—';
    const s = Math.round(Number(v));
    return s < 60 ? s + 's' : Math.floor(s/60) + 'm ' + String(s % 60).padStart(2,'0') + 's';
  }
  // "mm:ss" oppure "h:mm:ss"
  function fmtDur(sec){
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec/3600), m = Math.floor((sec % 3600)/60), s = sec % 60;
    const mm = String(m).padStart(2,'0'), ss = String(s).padStart(2,'0');
    return h > 0 ? (h + ':' + mm + ':' + ss) : (mm + ':' + ss);
  }

  function shortId(id){
    if (!id) return '—';
    return id.length > 22 ? id.slice(0,16) + '…' + id.slice(-4) : id;
  }

  /* chiamata al webhook con timeout: non lancia mai, restituisce sempre un esito */
  async function fetchJson(endpoint, timeoutMs){
    if (!endpoint) return { data:null, mode:'offline' };
    try{
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs || 10000);
      const res = await fetch(endpoint, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return { data: await res.json(), mode:'live' };
    }catch(e){
      return { data:null, mode:'offline' };
    }
  }

  // n8n può rispondere con un oggetto o con un array di un elemento
  const unwrap = d => (Array.isArray(d) ? (d[0] || null) : d);

  /* SHA-256 in JS puro: funziona anche aprendo la pagina da file://,
     dove crypto.subtle non e' disponibile. */
  function sha256(msg){
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const b=[]; for(const ch of unescape(encodeURIComponent(msg))) b.push(ch.charCodeAt(0));
  const bitLen=b.length*8; b.push(0x80); while(b.length%64!==56) b.push(0);
  for(let i=7;i>=0;i--) b.push((bitLen/Math.pow(2,i*8))&0xff);
  const rr=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let i=0;i<b.length;i+=64){
    const w=new Array(64);
    for(let t=0;t<16;t++) w[t]=(b[i+t*4]<<24)|(b[i+t*4+1]<<16)|(b[i+t*4+2]<<8)|b[i+t*4+3];
    for(let t=16;t<64;t++){
      const s0=rr(w[t-15],7)^rr(w[t-15],18)^(w[t-15]>>>3);
      const s1=rr(w[t-2],17)^rr(w[t-2],19)^(w[t-2]>>>10);
      w[t]=(w[t-16]+s0+w[t-7]+s1)|0;
    }
    let [a,bb,c,d,e,f,g,h]=H;
    for(let t=0;t<64;t++){
      const S1=rr(e,6)^rr(e,11)^rr(e,25), ch=(e&f)^(~e&g);
      const t1=(h+S1+ch+K[t]+w[t])|0;
      const S0=rr(a,2)^rr(a,13)^rr(a,22), mj=(a&bb)^(a&c)^(bb&c);
      const t2=(S0+mj)|0;
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=bb; bb=a; a=(t1+t2)|0;
    }
    H=[(H[0]+a)|0,(H[1]+bb)|0,(H[2]+c)|0,(H[3]+d)|0,(H[4]+e)|0,(H[5]+f)|0,(H[6]+g)|0,(H[7]+h)|0];
  }
  return H.map(x=>((x>>>0).toString(16).padStart(8,'0'))).join('');
  }

  return { nf0, nf1, $, fInt, fMin, fSecs, fSecsPlain, fmtDur, shortId, fetchJson, unwrap, sha256 };

})();
