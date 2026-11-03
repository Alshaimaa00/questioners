/* ===========================================================================
   Procedural 3D muscle figure for the Athletes "training plan" card (EXPERIMENT).
   No libraries, no model files. The anatomy is a signed-distance field: about 30
   ellipsoids and tapered capsules (deltoids, pectorals, biceps/triceps, forearms,
   rectus abdominis, obliques, serratus, quadriceps, trapezius, lats ...) blended
   with smooth unions so the muscles flow into one another with real grooves.

   Because the figure never moves, the expensive ray-marching runs only once per
   canvas size (spread over three frames) and is stored in three textures:
     t0 = surface normal (xy), thickness, coverage (anti-aliased edge)
     t1 = soft masks: deltoids, pectorals, arms, abdominals
     t2 = mask: quadriceps, ambient occlusion (shadowed grooves)
   Every animation frame then only shades those textures: a translucent glass
   material, key light, lavender and blue rim lights, a sequential glow per muscle
   group, a slow scan line and a gentle pulse. Rendering stops while the card is
   off-screen or the tab is hidden. If WebGL is unavailable, the SVG stays.
   =========================================================================== */
(function(){
"use strict";

const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

/* the frame matches the SVG scene: a 440 x 300 viewBox, shown "meet" (centred, uniform scale);
   world units: 1.0 = 150 viewBox units, y up, z towards the viewer */
const FRAME = `
uniform vec2 uRes;
vec2 framePos(){ float s=min(uRes.x/440.,uRes.y/300.); return (gl_FragCoord.xy-.5*uRes)/(s*150.); }
float pixelSize(){ return 1./(min(uRes.x/440.,uRes.y/300.)*150.); }`;

const BAKE = `precision highp float;
uniform float uMode;` + FRAME + `
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdEll(vec3 p,vec3 r){float k0=length(p/r);float k1=length(p/(r*r));return k0*(k0-1.)/max(k1,1e-5);}
float sdRC(vec3 p,vec3 a,vec3 b,float r1,float r2){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-mix(r1,r2,h);}

float gBase(vec3 p){
  vec3 q=vec3(abs(p.x),p.y,p.z);
  float h=sdEll(p-vec3(0.,.62,0.),vec3(.1,.145,.12));
  h=smin(h,sdEll(p-vec3(0.,.535,.03),vec3(.075,.07,.085)),.05);                   /* jaw */
  float d=smin(h,sdRC(p,vec3(0.,.52,-.015),vec3(0.,.34,-.01),.064,.085),.05);       /* neck */
  d=smin(d,sdRC(q,vec3(.055,.52,-.01),vec3(.025,.36,.065),.02,.017),.02);          /* sternocleidomastoid */
  d=smin(d,sdRC(q,vec3(.05,.42,-.03),vec3(.3,.32,-.04),.055,.05),.07);            /* trapezius */
  float t=sdEll(p-vec3(0.,.13,-.02),vec3(.27,.26,.155));                           /* rib cage */
  t=smin(t,sdEll(q-vec3(.2,.1,-.04),vec3(.1,.16,.095)),.06);                        /* lats */
  t=smin(t,sdEll(p-vec3(0.,-.17,-.01),vec3(.195,.27,.125)),.08);                     /* abdomen */
  t=smin(t,sdEll(p-vec3(0.,-.43,-.015),vec3(.25,.16,.14)),.07);                    /* pelvis */
  d=smin(d,t,.05);
  d=smin(d,sdEll(q-vec3(.615,-.66,0.),vec3(.036,.07,.026)),.03);                        /* hands */
  d=smin(d,sdRC(q,vec3(.155,-.47,-.01),vec3(.14,-1.3,0.),.125,.085),.05);           /* thighs */
  return d;
}
float gDelt(vec3 p){vec3 q=vec3(abs(p.x),p.y,p.z);return sdEll(q-vec3(.37,.235,-.005),vec3(.095,.125,.1));}
float gPec(vec3 p){vec3 q=vec3(abs(p.x),p.y,p.z);return sdEll(q-vec3(.13,.2,.085),vec3(.15,.095,.07));}
float gArm(vec3 p){
  vec3 q=vec3(abs(p.x),p.y,p.z);
  float d=sdRC(q,vec3(.41,.2,-.02),vec3(.48,-.24,-.02),.078,.058);
  d=smin(d,sdEll(q-vec3(.44,-.02,.03),vec3(.068,.14,.066)),.04);                  /* biceps */
  d=smin(d,sdEll(q-vec3(.455,0.,-.055),vec3(.066,.145,.06)),.04);                      /* triceps */
  d=smin(d,sdRC(q,vec3(.485,-.27,-.01),vec3(.59,-.6,0.),.062,.036),.05);           /* forearm */
  d=smin(d,sdEll(q-vec3(.51,-.34,.02),vec3(.058,.11,.054)),.04);                      /* brachioradialis */
  return d;
}
float gAbs(vec3 p){
  vec3 q=vec3(abs(p.x),p.y,p.z);
  float d=sdEll(q-vec3(.056,.04,.082),vec3(.052,.046,.04));                          /* rectus abdominis, 4 rows */
  d=min(d,sdEll(q-vec3(.057,-.066,.086),vec3(.053,.049,.04)));
  d=min(d,sdEll(q-vec3(.057,-.176,.086),vec3(.052,.05,.04)));
  d=min(d,sdEll(q-vec3(.055,-.3,.078),vec3(.05,.072,.04)));
  d=min(d,sdEll(q-vec3(.165,-.15,.02),vec3(.06,.15,.07)));                         /* obliques */
  d=min(d,sdEll(q-vec3(.2,.03,.035),vec3(.03,.02,.03)));                           /* serratus */
  d=min(d,sdEll(q-vec3(.205,-.02,.03),vec3(.028,.018,.028)));
  return d;
}
float gQuad(vec3 p){
  vec3 q=vec3(abs(p.x),p.y,p.z);
  float d=sdEll(q-vec3(.15,-.73,.07),vec3(.072,.23,.065));                         /* rectus femoris */
  d=min(d,sdEll(q-vec3(.225,-.76,.02),vec3(.068,.22,.08)));                         /* vastus lateralis */
  d=min(d,sdEll(q-vec3(.085,-.96,.055),vec3(.058,.12,.058)));                       /* vastus medialis */
  return d;
}
float map(vec3 p){
  float d=gBase(p);
  d=smin(d,gDelt(p),.06); d=smin(d,gPec(p),.03); d=smin(d,gArm(p),.02);
  d=smin(d,gAbs(p),.022); d=smin(d,gQuad(p),.025);
  return d;
}
vec3 nrm(vec3 p){const vec2 e=vec2(.0012,-.0012);
  return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
float w(float d){return 1.-smoothstep(0.,.03,d);}
void main(){
  vec2 P=framePos(); float px=pixelSize();
  if(abs(P.x)>.8||P.y>.85||P.y<-1.1){gl_FragColor=vec4(0.);return;}
  /* front march (orthographic, towards -z) keeping the closest approach for soft edges */
  vec3 ro=vec3(P,.6); float t=0.,dmin=1e3,tmin=0.; bool hit=false;
  for(int i=0;i<90;i++){vec3 p=ro-vec3(0,0,t);float d=map(p);
    if(d<dmin){dmin=d;tmin=t;} if(d<.0006){hit=true;break;} t+=d*.9; if(t>1.2)break;}
  vec3 p=ro-vec3(0,0,hit?t:tmin);
  float cov=hit?1.:1.-smoothstep(0.,px*1.3,dmin);
  if(cov<=0.){gl_FragColor=vec4(0.);return;}
  vec3 n=nrm(p);
  /* back march for thickness */
  float tb=0.; vec3 rb=vec3(P,-.6);
  for(int i=0;i<60;i++){float d=map(rb+vec3(0,0,tb));if(d<.0008)break;tb+=d*.9;if(tb>1.2)break;}
  float thick=clamp((p.z-(-.6+tb))/.5,0.,1.);
  if(uMode<.5){gl_FragColor=vec4(n.xy*.5+.5,thick,cov);return;}
  if(uMode<1.5){gl_FragColor=vec4(w(gDelt(p)),w(gPec(p)),w(gArm(p)),w(gAbs(p)));return;}
  float ao=0.,sc=1.;
  for(int i=1;i<=5;i++){float h=.012*float(i);ao+=(h-map(p+n*h))*sc;sc*=.65;}
  gl_FragColor=vec4(w(gQuad(p)),clamp(1.-4.*ao,0.,1.),0.,1.);
}`;

const SHADE = `precision highp float;
uniform sampler2D t0,t1,t2; uniform float uT;` + FRAME + `
const float TAU=6.28318;
float seq(float ph,float i){return pow(.5+.5*cos(TAU*(ph-i/5.)),10.);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes, P=framePos();
  vec4 a=texture2D(t0,uv), b=texture2D(t1,uv), c=texture2D(t2,uv);
  float cov=a.a;
  vec3 deep=vec3(.13,.11,.36), vio=vec3(.55,.42,.98), lav=vec3(.84,.78,1.), blu=vec3(.45,.62,1.);
  /* soft halo behind the figure */
  vec2 hp=P-vec2(0.,.05); float hal=exp(-dot(hp,hp)/.5)*.12;
  vec4 back=vec4(vio*hal,hal);
  if(cov<.002){gl_FragColor=back;return;}
  vec3 n; n.xy=a.rg*2.-1.; n.z=sqrt(max(0.,1.-dot(n.xy,n.xy)));
  float thick=a.b, ao=c.g;
  float ph=fract(uT/9.);
  vec3 L=normalize(vec3(-.5,.62,.6)), H=normalize(L+vec3(0.,0.,1.));
  float dif=max(dot(n,L),0.), fres=pow(1.-n.z,2.);
  float nh=max(dot(n,H),0.), sp=pow(nh,70.)*.85+pow(nh,14.)*.1;
  vec2 nd=n.xy/max(length(n.xy),1e-4);
  float rimL=pow(1.-n.z,2.6)*smoothstep(-.1,.9,dot(nd,normalize(vec2(-.85,.4))));
  float rimR=pow(1.-n.z,2.6)*smoothstep(.1,.95,dot(nd,normalize(vec2(.9,-.15))));
  float wD=b.r,wP=b.g,wA=b.b,wB=b.a,wQ=c.r, mus=max(max(wD,wP),max(max(wA,wB),wQ));
  vec3 glow=lav*wD*seq(ph,0.)+vio*wP*seq(ph,1.)+blu*wA*seq(ph,2.)+lav*wB*seq(ph,3.)+vio*wQ*seq(ph,4.);
  float pulse=.94+.06*sin(TAU*ph*2.);
  float ys=mix(1.2,-1.2,fract(uT/4.5)), dy=P.y-ys;
  float scan=exp(-dy*dy/.0005)*.85+exp(-dy*dy/.012)*.2;
  /* glass body: translucent in the middle, denser at the edges and where it is thick */
  float al=clamp(.16+.34*thick+.8*fres,0.,.92)*cov;
  vec3 sss=mix(vio,lav,.35)*(.16+.3*thick)*(.55+.45*dif);
  vec3 body=(deep*(.5+.7*dif)*ao+sss+lav*.06*mus*ao)*al;
  vec3 emit=glow*(.5+1.3*thick)*(.45+.55*n.z)*pulse
           +lav*sp*ao*1.2+lav*rimL*1.05+blu*rimR*.5+mix(vio,lav,.5)*fres*.45
           +lav*scan*(.3+.7*fres)*.85;
  vec3 rgb=body+emit*cov;
  float A=max(al,max(rgb.r,max(rgb.g,rgb.b)));
  gl_FragColor=vec4(rgb,A)+back*(1.-A);
}`;

function compile(gl, type, src){
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ console.warn("muscle3d:", gl.getShaderInfoLog(s)); return null; }
  return s;
}
function program(gl, fs){
  const v = compile(gl, gl.VERTEX_SHADER, VERT), f = compile(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f);
  gl.bindAttribLocation(p, 0, "a"); gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}

window.mountMuscle3D = function(host){
  if (!host || host.querySelector("canvas.m3d-cv")) return false;
  const cv = document.createElement("canvas");
  cv.className = "m3d-cv"; cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  const gl = cv.getContext("webgl", {premultipliedAlpha:true, alpha:true, antialias:false, powerPreference:"low-power"});
  if (!gl) return false;
  const bake = program(gl, BAKE), shade = program(gl, SHADE);
  if (!bake || !shade) return false;

  host.appendChild(cv);
  host.classList.add("m3d");                       /* hides the SVG, keeps it as the fallback */

  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const tex = [0,1,2].map(() => gl.createTexture()), fbo = [0,1,2].map(() => gl.createFramebuffer());
  const U = (p, n) => gl.getUniformLocation(p, n);
  const uB = {res:U(bake,"uRes"), mode:U(bake,"uMode")};
  const uS = {res:U(shade,"uRes"), t:U(shade,"uT"), t0:U(shade,"t0"), t1:U(shade,"t1"), t2:U(shade,"t2")};

  let W = 0, H = 0, baked = 3, raf = 0, vis = false, t0 = performance.now();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function size(){
    const r = host.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
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
  function frame(now){
    raf = 0;
    if (!cv.isConnected){ stop(); return; }
    size();
    if (baked < 3){
      gl.useProgram(bake);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[baked]); gl.viewport(0, 0, W, H);
      gl.uniform2f(uB.res, W, H); gl.uniform1f(uB.mode, baked);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      baked++;
    }
    if (baked === 3){
      gl.useProgram(shade); gl.viewport(0, 0, W, H);
      tex.forEach((t, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); });
      gl.uniform1i(uS.t0, 0); gl.uniform1i(uS.t1, 1); gl.uniform1i(uS.t2, 2);
      gl.uniform2f(uS.res, W, H);
      gl.uniform1f(uS.t, reduce ? 2.0 : (window.__M3T !== undefined ? window.__M3T : (now - t0)/1000));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (reduce) return;                            /* one still frame */
    }
    if (vis && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const go = () => { if (!raf && vis && !document.hidden) raf = requestAnimationFrame(frame); };
  const io = new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; go(); }, {rootMargin:"120px 0px"});
  const ro = new ResizeObserver(() => go());
  const onVis = () => go();
  function stop(){ io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", onVis);
    if (raf) cancelAnimationFrame(raf); const lc = gl.getExtension("WEBGL_lose_context"); lc && lc.loseContext(); }
  io.observe(host); ro.observe(host); document.addEventListener("visibilitychange", onVis);
  cv.addEventListener("webglcontextlost", e => { e.preventDefault(); host.classList.remove("m3d"); cv.remove(); stop(); });
  return true;
};
})();
