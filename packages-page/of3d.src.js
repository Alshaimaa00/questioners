/* ===========================================================================
   "What we offer" 3D illustrations - one small shared WebGL runtime, no libraries,
   no model files. Each scene has a BAKE shader (expensive, run once per canvas size,
   one pass per frame, results kept in textures) and a SHADE shader (cheap, run every
   frame for light and motion). Rendering stops while the card is off-screen or the
   tab is hidden; reduced motion gets one still frame; if WebGL is missing the SVG
   scene underneath stays visible.
   Scenes: "muscle" (approved anatomy figure), "drop" (hydration: glass droplet,
   energy bolt and leaf). Colours are authored in the Athletes palette.
   =========================================================================== */
(function(){
"use strict";

const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

/* the frame matches the SVG scenes: a 440 x 300 viewBox shown "meet" (centred, uniform scale);
   world units: 1.0 = 150 viewBox units, y up, z towards the viewer */
const FRAME = `
uniform vec2 uRes;
vec2 framePos(){ float s=min(uRes.x/440.,uRes.y/300.); return (gl_FragCoord.xy-.5*uRes)/(s*150.); }
float pixelSize(){ return 1./(min(uRes.x/440.,uRes.y/300.)*150.); }`;

/*MUSCLE_SHADERS*/

/* ---------------------------------------------------------------- droplet */
const DROP_BAKE = `precision highp float;
uniform float uMode;` + FRAME + `
/* a teardrop is a round cone: a sphere at the bottom tapering to a point */
float sdRoundCone(vec3 p,float r1,float r2,float h){
  float b=(r1-r2)/h, a=sqrt(1.-b*b); vec2 q=vec2(length(p.xz),p.y);
  float k=dot(q,vec2(-b,a));
  if(k<0.) return length(q)-r1;
  if(k>a*h) return length(q-vec2(0.,h))-r2;
  return dot(q,vec2(a,b))-r1;
}
/* the upper part narrows a little faster than a cone, so the sides curve in towards the tip */
float map(vec3 p){ float k=1.+.42*smoothstep(-.1,.78,p.y); vec3 q=vec3(p.x*k,p.y,p.z*k);
  return sdRoundCone(q-vec3(0.,-.267,0.),.547,.012,1.06)/k; }
vec3 nrm(vec3 p){const vec2 e=vec2(.001,-.001);
  return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
void main(){
  vec2 P=framePos(); float px=pixelSize();
  if(abs(P.x)>.62||P.y>.86||P.y<-.86){gl_FragColor=vec4(0.);return;}
  vec3 ro=vec3(P,.7); float t=0.,dmin=1e3,tmin=0.; bool hit=false;
  for(int i=0;i<90;i++){vec3 p=ro-vec3(0,0,t);float d=map(p);
    if(d<dmin){dmin=d;tmin=t;} if(d<.0005){hit=true;break;} t+=d*.8; if(t>1.4)break;}
  vec3 p=ro-vec3(0,0,hit?t:tmin);
  float cov=hit?1.:1.-smoothstep(0.,px*1.3,dmin);
  if(cov<=0.){gl_FragColor=vec4(0.);return;}
  vec3 n=nrm(p);
  gl_FragColor=vec4(n.xy*.5+.5,clamp(p.z/.55,0.,1.),cov);
}`;

const DROP_SHADE = `precision highp float;
uniform sampler2D t0; uniform float uT;` + FRAME + `
const vec3 INK=vec3(.07,.06,.2), DEEP=vec3(.2,.17,.55), VIO=vec3(.5,.4,.97), LAV=vec3(.83,.79,1.), ICE=vec3(.93,.94,1.);
const vec3 MINT=vec3(.55,1.,.82), MINTD=vec3(.12,.62,.5);
vec4 over(vec4 dst,vec4 src){ return src+dst*(1.-src.a); }            /* premultiplied */
float h1(float n){ return fract(sin(n*127.1)*43758.5453); }

/* ---- bolt: the SVG polygon, as a bevelled glass slab */
void edge(vec2 p,vec2 a,vec2 b,inout float d,inout float s){
  vec2 e=b-a,w=p-a,q=w-e*clamp(dot(w,e)/dot(e,e),0.,1.); d=min(d,dot(q,q));
  bvec3 c=bvec3(p.y>=a.y,p.y<b.y,e.x*w.y>e.y*w.x); if(all(c)||all(not(c))) s=-s;
}
float sdBolt(vec2 p){
  vec2 v0=vec2(-.7333,.3067),v1=vec2(-.92,-.0667),v2=vec2(-.8,-.0667),v3=vec2(-.8667,-.3333),v4=vec2(-.6,.0533),v5=vec2(-.72,.0533),v6=vec2(-.64,.3067);
  float d=dot(p-v0,p-v0),s=1.;
  edge(p,v0,v1,d,s);edge(p,v1,v2,d,s);edge(p,v2,v3,d,s);edge(p,v3,v4,d,s);edge(p,v4,v5,d,s);edge(p,v5,v6,d,s);edge(p,v6,v0,d,s);
  return s*sqrt(d);
}
/* ---- leaf: a curved vesica on the SVG leaf's axis */
const vec2 LMID=vec2(.77,.17), LDIR=vec2(.5145,.8575);
vec2 leafLocal(vec2 p,float sway){
  vec2 q=p-LMID; float c=cos(sway),s=sin(sway); q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
  vec2 l=vec2(dot(q,vec2(LDIR.y,-LDIR.x)),dot(q,LDIR));
  l.x+=.35*l.y*l.y-.02;                                                   /* gentle curl */
  return l;
}
float sdVesica(vec2 p,float r,float d){ p=abs(p); float b=sqrt(r*r-d*d);
  return ((p.y-b)*d>p.x*b)?length(p-vec2(0.,b)):length(p-vec2(-d,0.))-r; }
float sdLeaf(vec2 l){ return sdVesica(l,.37,.27); }

float bevel(float sd,float w){ float x=clamp(-sd/w,0.,1.); return w*sqrt(1.-(1.-x)*(1.-x)); }

void main(){
  vec2 P=framePos(), uv=gl_FragCoord.xy/uRes; float px=pixelSize(), T=uT;
  vec3 L=normalize(vec3(-.55,.62,.56));
  vec4 C=vec4(0.);

  /* soft halo, contact shadow and the light the drop focuses onto the floor */
  vec2 hp=P-vec2(0.,.05); float hal=exp(-dot(hp,hp)/.45)*.13; C=over(C,vec4(VIO*hal,hal));
  vec2 sp=(P-vec2(.02,-.835))/vec2(.46,.045); float sh=exp(-dot(sp,sp)*1.6)*.55; C=over(C,vec4(0.,0.,0.,sh));
  vec2 kp=(P-vec2(.13,-.83))/vec2(.2,.022); float ca=exp(-dot(kp,kp)*2.)*(.3+.06*sin(T*1.3)); C.rgb+=LAV*ca*.55; C.a=max(C.a,0.);

  /* ---- droplet */
  vec4 a=texture2D(t0,uv); float cov=a.a;
  if(cov>.001){
    vec3 n; n.xy=a.rg*2.-1.; n.z=sqrt(max(0.,1.-dot(n.xy,n.xy)));
    float fres=pow(1.-n.z,2.6);
    /* liquid: level, travelling surface waves, a lit surface disc seen from slightly above */
    float lev=-.08+.008*sin(T*.7);
    float halfw=sqrt(max(.299-pow(lev+.267,2.),.0))*.96;
    float wv=.007*sin(P.x*13.-T*1.6)+.004*sin(P.x*23.+T*2.3);
    float ry=.045, ex=P.x/halfw, ey=(P.y-lev)/ry, e=ex*ex+ey*ey;
    bool body=P.y<lev+wv-ry*sqrt(max(0.,1.-ex*ex))*.0;
    vec4 G=vec4(0.);
    if(P.y<lev+wv && abs(P.x)<halfw*1.2){
      float depth=clamp((lev-P.y)/.72,0.,1.);
      vec3 lc=mix(LAV*.92,mix(VIO,DEEP,.35),smoothstep(0.,.85,depth));
      lc*=.72+.38*smoothstep(-.4,.5,-P.x+.25);                              /* light from the left */
      lc=mix(lc,DEEP*.7,fres*.7);                                          /* absorption toward the rim */
      float caus=exp(-pow((P.y+.69)/.035,2.))*smoothstep(.36,.05,abs(P.x-.05))*(.55+.25*sin(T*1.1+P.x*6.));
      lc+=ICE*caus*.55;
      float streak=exp(-pow((P.x+.3+.04*P.y)/.025,2.))*smoothstep(-.7,-.2,P.y)*smoothstep(lev,lev-.25,P.y);
      lc+=ICE*streak*.18;
      /* bubbles rising in the liquid */
      for(int i=0;i<7;i++){
        float fi=float(i), r=.008+.012*h1(fi+3.), sp=.05+.05*h1(fi+11.);
        float by=-.74+mod(T*sp+h1(fi+7.)*1.4,.7);
        if(by>lev-.02) continue;
        vec2 bc=vec2((h1(fi)-.5)*.62+.025*sin(T*1.7+fi*2.),by);
        float bd=length(P-bc);
        float ring=smoothstep(r,r-px*1.5,bd)*(.25+.75*smoothstep(r*.55,r,bd));
        float dot=smoothstep(r*.38,r*.2,length(P-bc-vec2(-.35,.35)*r));
        lc=mix(lc,ICE,ring*.55+dot*.8);
      }
      G=vec4(lc*.92,.92);
    }
    /* surface disc with expanding ripples and the bright meniscus line */
    if(e<1.){
      float r=sqrt(e);
      float rip=.5+.5*sin(r*26.-T*2.4); rip*=smoothstep(1.,.3,r)*.18;
      vec3 sc=mix(ICE,LAV,.35+.4*r)+ICE*rip;
      float sa=.82*smoothstep(1.,.92,e);
      G=over(G,vec4(sc*sa,sa));
    }
    float men=exp(-pow((P.y-(lev-ry*sqrt(max(0.,1.-ex*ex))))/max(px*1.4,.004),2.))*step(abs(ex),1.);
    G.rgb+=ICE*men*.6;
    /* glass shell: nearly clear in the middle, denser and brighter at the rim */
    vec3 r3=reflect(vec3(0.,0.,-1.),n);
    vec2 bx=r3.xy-vec2(-.5,.52);
    float soft=exp(-pow(bx.x/.09,2.))*exp(-pow(bx.y/.2,2.))*.55*step(0.,r3.z);          /* soft window reflection */
    float spec=pow(max(dot(r3,L),0.),90.)*1.2+pow(max(dot(r3,normalize(vec3(.6,.2,.8))),0.),40.)*.25;
    float rimB=pow(1.-n.z,3.)*smoothstep(.0,.9,dot(normalize(n.xy+1e-4),normalize(vec2(.9,-.3))));
    float inner=exp(-pow((n.z-.42)/.07,2.))*.12;
    float ga=clamp(.1+.55*fres+.85*soft+inner,0.,.95);
    vec3 gc=mix(DEEP*.55,ICE,clamp(fres*.6+soft+spec,0.,1.));
    vec3 glass=gc*ga+LAV*.05*(1.-fres)+ICE*spec+vec3(.55,.68,1.)*rimB*.55+LAV*fres*.2;
    vec4 D=over(G,vec4(glass,ga));
    D.a=max(D.a,(spec+rimB*.4)*.6);
    C=over(C,D*cov);
  }

  /* ---- bolt (floats; mint neon glass) */
  vec2 bp=P-vec2(0.,.022*sin(T*1.25));
  float bd=sdBolt(bp);
  float bglow=exp(-max(bd,0.)/.028)*.32*(.85+.15*sin(T*2.));
  C=over(vec4(MINT*bglow*.55,bglow*.35),C);                               /* glow sits behind */
  if(bd<.003){
    const float e=.003, W=.03;
    float hx=bevel(sdBolt(bp+vec2(e,0.)),W)-bevel(sdBolt(bp-vec2(e,0.)),W);
    float hy=bevel(sdBolt(bp+vec2(0.,e)),W)-bevel(sdBolt(bp-vec2(0.,e)),W);
    vec3 n=normalize(vec3(-hx/(2.*e),-hy/(2.*e),1.));
    float dif=max(dot(n,L),0.), sp=pow(max(dot(reflect(-L,n),vec3(0,0,1)),0.),60.);
    float core=exp(-pow((bd+.02)/.008,2.));
    vec3 col=mix(MINTD,MINT,.35+.5*dif)+ICE*sp*1.2+ICE*core*.35;
    float al=clamp(.72+.25*pow(1.-n.z,2.),0.,1.)*(1.-smoothstep(-px,px,bd));
    C=over(C,vec4(col*al,al));
  }

  /* ---- leaf (sways; translucent lavender with veins and a water bead) */
  float sw=.06*sin(T*.9);
  vec2 ll=leafLocal(P-vec2(0.,.016*sin(T*1.05+1.)),sw);
  float ld=sdLeaf(ll);
  if(ld<.004){
    const float e=.003, W=.05;
    float hx=bevel(sdLeaf(ll+vec2(e,0.)),W)-bevel(sdLeaf(ll-vec2(e,0.)),W);
    float hy=bevel(sdLeaf(ll+vec2(0.,e)),W)-bevel(sdLeaf(ll-vec2(0.,e)),W);
    vec3 n=normalize(vec3(-hx/(2.*e)*.6,-hy/(2.*e)*.6,1.));
    n.x+=sign(ll.x)*.18*smoothstep(0.,.08,abs(ll.x)); n=normalize(n);    /* folded along the midrib */
    float dif=max(dot(n,L),0.), sp=pow(max(dot(reflect(-L,n),vec3(0,0,1)),0.),40.);
    vec3 col=mix(mix(VIO,DEEP,.25),LAV,.25+.65*dif);
    float trans=smoothstep(-.1,.25,ll.y)*.18;                              /* light through the tip */
    col+=LAV*trans;
    float mid=exp(-pow(ll.x/.004,2.))*smoothstep(.25,-.2,ll.y);
    float vein=(1.-smoothstep(.0,.012,abs(fract((ll.y+abs(ll.x)*.9)*11.)-.5)*.09))*smoothstep(.006,.02,abs(ll.x))*smoothstep(-.005,-.04,ld);
    col=mix(col,ICE,mid*.6+vein*.4);
    vec2 bb=ll-vec2(-.035,.04); float br=.021, bl=length(bb);
    if(bl<br){ vec3 bn=vec3(bb/br,sqrt(max(0.,1.-dot(bb,bb)/(br*br))));
      float bs=pow(max(dot(reflect(-L,bn),vec3(0,0,1)),0.),50.);
      col=mix(col,mix(col*1.1,ICE,pow(1.-bn.z,2.)*.6),.8)+ICE*bs; }
    col+=ICE*sp*.5;
    float al=.9*(1.-smoothstep(-px,px,ld));
    C=over(C,vec4(col*al,al));
  }
  /* three quiet twinkles */
  for(int i=0;i<3;i++){ float fi=float(i);
    vec2 s=vec2(i==0?.98:(i==1?-.95:.53),i==0?-.55:(i==1?-.6:.67));
    float tw=.5+.5*sin(T*1.6+fi*2.1); vec2 q=abs(P-s);
    float st=(exp(-q.x/.003)*exp(-q.y/.02)+exp(-q.y/.003)*exp(-q.x/.02))*tw*.9;
    C.rgb+=ICE*st; C.a=max(C.a,st);
  }
  gl_FragColor=C;
}`;

/*LIB_SCENES*/
/* muscle and drop are authored in the Athletes colours (78deg from the teal base);
   the single-pass scenes are authored in teal and recoloured by uHue */
const SCENES = {
  muscle:{bake:MUSCLE_BAKE, passes:3, shade:MUSCLE_SHADE, own:78},
  drop:  {bake:DROP_BAKE,   passes:1, shade:DROP_SHADE,   own:78}
};
for (const k in LIB_SCENES) SCENES[k] = {bake:null, passes:0, shade:LIB_SCENES[k]};
/* every mounted scene; ones whose card has left the page release their WebGL context,
   so moving between packages never piles contexts up (Safari allows about 16) */
const LIVE = new Set();
function prune(){ LIVE.forEach(m => { if (!m.cv.isConnected) m.stop(); }); }

/* shaders are compiled without blocking the page: with KHR_parallel_shader_compile the driver
   compiles on its own threads and the scene starts drawing once its programs are ready (the
   SVG version stays on screen until then); without it this falls back to the usual check */
function startProgram(gl, fs){
  const v = gl.createShader(gl.VERTEX_SHADER), f = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(v, VERT); gl.compileShader(v); gl.shaderSource(f, fs); gl.compileShader(f);
  const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f);
  gl.bindAttribLocation(p, 0, "a"); gl.linkProgram(p);
  return {p, v, f};
}
/* true once linked, false if it failed, null while the driver is still compiling */
function programReady(gl, pc, P){
  if (pc && !gl.getProgramParameter(P.p, pc.COMPLETION_STATUS_KHR)) return null;
  if (gl.getProgramParameter(P.p, gl.LINK_STATUS)) return true;
  console.warn("of3d:", gl.getShaderInfoLog(P.f) || gl.getShaderInfoLog(P.v) || gl.getProgramInfoLog(P.p));
  return false;
}

window.mountOf3D = function(host, kind, opts){
  const S = SCENES[kind];
  if (!S || !host || host.querySelector("canvas.m3d-cv")) return false;
  prune();
  const hue = (opts && opts.hue) || 0;
  const cv = document.createElement("canvas");
  cv.className = "m3d-cv"; cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .35s ease";
  const gl = cv.getContext("webgl", {premultipliedAlpha:true, alpha:true, antialias:false, powerPreference:"low-power"});
  if (!gl) return false;
  const pc = gl.getExtension("KHR_parallel_shader_compile");
  const bakeP = S.passes ? startProgram(gl, S.bake) : null, shadeP = startProgram(gl, S.shade);
  let bake = null, shade = null, ready = false;
  /* a scene authored in another package's colours is turned to this package's hue */
  if (S.own !== undefined && hue - S.own) cv.style.filter = "hue-rotate(" + (hue - S.own) + "deg)";

  host.appendChild(cv);

  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const N = S.passes;
  const tex = [], fbo = [];
  for (let i = 0; i < N; i++){ tex.push(gl.createTexture()); fbo.push(gl.createFramebuffer()); }
  const U = (p, n) => gl.getUniformLocation(p, n);
  let uB = null, uS = null;

  let W = 0, H = 0, baked = N, raf = 0, vis = false, t0 = performance.now(), last = -1e9, shown = false;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function size(){
    /* sharp but bounded: 2x for the baked figures, 1.75x for the single-pass scenes, 1.5x on phones */
    const r = host.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, S.passes ? 2 : (innerWidth < 700 ? 1.5 : 1.75));
    const w = Math.max(2, Math.round(r.width*dpr)), h = Math.max(2, Math.round(r.height*dpr));
    if (w === W && h === H) return;
    W = cv.width = w; H = cv.height = h;
    tex.forEach((t, i) => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[i]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    baked = 0;                                      /* re-bake, one pass per frame */
  }
  /* the first finished frame takes over from the SVG with a short fade; the SVG's own
     animations are paused while it is hidden, since nobody can see them */
  function show(){
    shown = true; cv.style.opacity = "1";
    host.classList.add("m3d");                     /* hides the SVG, keeps it as the fallback */
    const svg = host.querySelector("svg"); if (svg && svg.pauseAnimations) svg.pauseAnimations();
  }
  let dead = false;
  function fail(){
    if (dead) return; dead = true;
    stop(); cv.remove(); host.classList.remove("m3d");
    const svg = host.querySelector("svg"); if (svg && svg.unpauseAnimations) svg.unpauseAnimations();
  }
  function frame(now){
    raf = 0;
    if (!cv.isConnected){ stop(); return; }
    if (!ready){
      const a = bakeP ? programReady(gl, pc, bakeP) : true, b = programReady(gl, pc, shadeP);
      if (a === false || b === false){ fail(); return; }
      if (a === null || b === null){ if (vis && !document.hidden) raf = requestAnimationFrame(frame); return; }
      ready = true; bake = bakeP && bakeP.p; shade = shadeP.p;
      uB = bake ? {res:U(bake,"uRes"), mode:U(bake,"uMode")} : null;
      uS = {res:U(shade,"uRes"), t:U(shade,"uT"), hue:U(shade,"uHue"), s:[U(shade,"t0"), U(shade,"t1"), U(shade,"t2")]};
    }
    size();
    if (baked < N){
      gl.useProgram(bake);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[baked]); gl.viewport(0, 0, W, H);
      gl.uniform2f(uB.res, W, H); gl.uniform1f(uB.mode, baked);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      baked++;
    }
    /* at most ~60 frames a second: on 120Hz screens the slow motion looks the same at half the work */
    if (baked === N && now - last >= 15.5){
      last = now;
      gl.useProgram(shade); gl.viewport(0, 0, W, H);
      tex.forEach((t, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(uS.s[i], i); });
      gl.uniform2f(uS.res, W, H);
      if (uS.hue) gl.uniform1f(uS.hue, hue);
      const ov = window.__OF3T !== undefined ? window.__OF3T : window.__M3T;
      gl.uniform1f(uS.t, reduce ? 2.0 : (ov !== undefined ? ov : (now - t0)/1000));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!shown) show();
      if (reduce) return;                            /* one still frame */
    }
    if (vis && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const go = () => { if (!raf && vis && !document.hidden) raf = requestAnimationFrame(frame); };
  const io = new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; go(); }, {rootMargin:"120px 0px"});
  const ro = new ResizeObserver(() => go());
  const onVis = () => go();
  function stop(){ LIVE.delete(me); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", onVis);
    if (raf) cancelAnimationFrame(raf); raf = 0; const lc = gl.getExtension("WEBGL_lose_context"); lc && lc.loseContext(); }
  const me = {cv, stop:() => stop()}; LIVE.add(me);
  io.observe(host); ro.observe(host); document.addEventListener("visibilitychange", onVis);
  cv.addEventListener("webglcontextlost", e => { e.preventDefault(); fail(); });
  return true;
};
window.mountMuscle3D = host => window.mountOf3D(host, "muscle");
})();
