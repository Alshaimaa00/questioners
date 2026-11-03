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

/* ---------------------------------------------------------------- muscle (approved) */
const MUSCLE_BAKE = `precision highp float;
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

const MUSCLE_SHADE = `precision highp float;
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

/* ---------------------------------------------------------------- shared scene library
   Single-pass scenes for the remaining "what we offer" cards. They are drawn in the
   same teal palette as the SVG scenes and recoloured per package by uHue with the exact
   CSS hue-rotate matrix, so every package keeps the colours its SVG scenes had.
   Shapes are 2D signed distances lifted into 3D with a rounded bevel (or analytic
   spheres and tubes), then lit with one key light, specular highlights, a cool rim
   light and glass fresnel. Coordinates can be written in the SVG scenes' 440 x 300
   units with sv()/su(), so the compositions match the originals. */
const LIB = `precision highp float;
uniform vec2 uRes; uniform float uT, uHue;
vec2 framePos(){ float s=min(uRes.x/440.,uRes.y/300.); return (gl_FragCoord.xy-.5*uRes)/(s*150.); }
float pixelSize(){ return 1./(min(uRes.x/440.,uRes.y/300.)*150.); }
vec2 sv(float x,float y){ return vec2((x-220.)/150.,(150.-y)/150.); }
float su(float v){ return v/150.; }
const float PI=3.14159265, TAU=6.2831853;
const vec3 DEEP=vec3(.05,.27,.31), TEAL=vec3(.25,.63,.69), MINT=vec3(.44,.87,.71), LITE=vec3(.61,.95,.82),
           ICE=vec3(.9,1.,.97), GOLD=vec3(.95,.72,.29), CORAL=vec3(1.,.48,.44), KEY=vec3(-.5,.57,.65);
float PX;
vec4 over(vec4 d,vec4 s){ return s+d*(1.-s.a); }
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float bevel(float sd,float w){float x=clamp(-sd/w,0.,1.);return w*sqrt(1.-(1.-x)*(1.-x));}
float aa(float sd){ return 1.-smoothstep(-PX,PX,sd); }
float dot2(vec2 v){ return dot(v,v); }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,s,-s,c); }
float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
vec2 segC(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return a+ba*h;}
float sdBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdStar5(vec2 p,float r,float rf){
  const vec2 k1=vec2(.809016994,-.587785252), k2=vec2(-.809016994,-.587785252);
  p.x=abs(p.x); p-=2.*max(dot(k1,p),0.)*k1; p-=2.*max(dot(k2,p),0.)*k2; p.x=abs(p.x); p.y-=r;
  vec2 ba=rf*vec2(-k1.y,k1.x)-vec2(0.,1.); float h=clamp(dot(p,ba)/dot(ba,ba),0.,r);
  return length(p-ba*h)*sign(p.y*ba.x-p.x*ba.y);
}
float sdHeart(vec2 p){ p.x=abs(p.x);
  if(p.y+p.x>1.) return sqrt(dot2(p-vec2(.25,.75)))-sqrt(2.)/4.;
  return sqrt(min(dot2(p-vec2(0.,1.)),dot2(p-.5*max(p.x+p.y,0.))))*sign(p.x-p.y); }
float sdVesica(vec2 p,float r,float d){ p=abs(p); float b=sqrt(r*r-d*d);
  return ((p.y-b)*d>p.x*b)?length(p-vec2(0.,b)):length(p-vec2(-d,0.))-r; }
float sdUnevenCapsule(vec2 p,float r1,float r2,float h){ p.x=abs(p.x); float b=(r1-r2)/h, a=sqrt(1.-b*b);
  float k=dot(p,vec2(-b,a)); if(k<0.) return length(p)-r1; if(k>a*h) return length(p-vec2(0.,h))-r2; return dot(p,vec2(a,b))-r1; }
void edgeP(vec2 p,vec2 a,vec2 b,inout float d,inout float s){vec2 e=b-a,w=p-a,q=w-e*clamp(dot(w,e)/dot(e,e),0.,1.);d=min(d,dot(q,q));
  bvec3 c=bvec3(p.y>=a.y,p.y<b.y,e.x*w.y>e.y*w.x); if(all(c)||all(not(c))) s=-s;}
vec3 hueRot(vec3 c,float deg){ float a=radians(deg), x=cos(a), y=sin(a);
  return mat3(.213+.787*x-.213*y, .213-.213*x+.143*y, .213-.213*x-.787*y,
              .715-.715*x-.715*y, .715+.285*x+.140*y, .715-.715*x+.715*y,
              .072-.072*x+.928*y, .072-.072*x-.283*y, .072+.928*x+.072*y)*c; }
/* normal of a bevelled 2D shape: F is a distance function, W the bevel width, K the relief */
#define BN(F,p,W,K) normalize(vec3(-(bevel(F((p)+vec2(.0025,0.)),W)-bevel(F((p)-vec2(.0025,0.)),W))/.005*(K),-(bevel(F((p)+vec2(0.,.0025)),W)-bevel(F((p)-vec2(0.,.0025)),W))/.005*(K),1.))
vec3 shadeN(vec3 n,vec3 base,float shin,float sk){
  vec3 L=normalize(KEY); float dif=max(dot(n,L),0.);
  float sp=pow(max(dot(n,normalize(L+vec3(0.,0.,1.))),0.),shin);
  float rim=pow(1.-n.z,2.4); vec2 nd=n.xy/max(length(n.xy),1e-4);
  float rimB=rim*smoothstep(.1,.95,dot(nd,normalize(vec2(.9,-.3))));
  return base*(.3+.8*dif)+ICE*sp*sk+LITE*rim*.16+vec3(.55,.78,1.)*rimB*.32;
}
vec4 solidN(vec3 n,vec3 base,float sd,float shin){ float a=aa(sd); return vec4(shadeN(n,base,shin,.8)*a,a); }
vec4 glassN(vec3 n,vec3 tint,float sd,float a0){
  float fres=pow(1.-n.z,2.2), c=aa(sd); vec3 L=normalize(KEY);
  float sp=pow(max(dot(n,normalize(L+vec3(0.,0.,1.))),0.),90.);
  float a=clamp(a0+.62*fres,0.,.94);
  vec3 col=mix(tint*(.45+.4*max(dot(n,L),0.)),ICE,fres*.5)*a+ICE*sp*1.1;
  return vec4(col*c,max(a,sp*.8)*c);
}
vec3 sphN(vec2 p,vec2 c,float r){ vec2 q=(p-c)/r; return vec3(q,sqrt(max(0.,1.-dot(q,q)))); }
vec4 ball(vec2 p,vec2 c,float r,vec3 base,float shin){ float sd=length(p-c)-r; if(sd>PX) return vec4(0.); return solidN(sphN(p,c,r),base,sd,shin); }
vec4 gball(vec2 p,vec2 c,float r,vec3 tint,float a0){ float sd=length(p-c)-r; if(sd>PX) return vec4(0.); return glassN(sphN(p,c,r),tint,sd,a0); }
vec3 tubeN(vec2 p,vec2 c,float r){ vec2 d=p-c; float l=length(d); float t=clamp(l/r,0.,1.); return vec3(d/max(l,1e-5)*t,sqrt(max(0.,1.-t*t))); }
vec4 tubeSeg(vec2 p,vec2 a,vec2 b,float r,vec3 base,float shin){ vec2 c=segC(p,a,b); float sd=length(p-c)-r; if(sd>PX) return vec4(0.); return solidN(tubeN(p,c,r),base,sd,shin); }
vec4 glowSD(float sd,vec3 col,float r,float k){ float g=exp(-max(sd,0.)/r)*k; return vec4(col*g,g*.5); }
vec4 halo(vec2 P,vec2 c,float r,float k){ vec2 d=P-c; float h=exp(-dot(d,d)/(r*r))*k; return vec4(MINT*h*.75,h*.55); }
vec4 shadowAt(vec2 P,vec2 c,vec2 rr,float k){ vec2 d=(P-c)/rr; float s=exp(-dot(d,d)*1.6)*k; return vec4(0.,0.,0.,s); }
vec4 twinkle(vec2 P,vec2 s,float k,float ph){ float tw=.5+.5*sin(uT*1.6+ph); vec2 q=abs(P-s);
  float st=(exp(-q.x/.0035)*exp(-q.y/(.022*k))+exp(-q.y/.0035)*exp(-q.x/(.022*k)))*tw*.85; return vec4(ICE*st,st); }
/* a flowing dashed glow line: d = distance to the line, u = position along it */
vec4 dashLine(float d,float u,vec3 col,float w,float dens,float spd){
  float dash=smoothstep(.35,.45,fract(u*dens-uT*spd))*smoothstep(.95,.85,fract(u*dens-uT*spd));
  float core=exp(-pow(d/w,2.)), g=exp(-d/(w*4.))*.25; float a=(core*dash+g*.6);
  return vec4(col*a,a*.8); }
/* a leaf: centre c, angle ang, size sc; folded along its midrib, with veins */
float leafL(vec2 l){ l.x+=.35*l.y*l.y-.02; return sdVesica(l,.37,.27); }
vec4 leafAt(vec2 p,vec2 c,float ang,float sc,vec3 base){
  vec2 l=rot(-ang)*(p-c)/sc; float sd=leafL(l)*sc; if(sd>PX) return vec4(0.);
  vec3 n=BN(leafL,l,.05,.6); n.x+=sign(l.x+.35*l.y*l.y-.02)*.18; n=normalize(n); n.xy=rot(ang)*n.xy;
  vec3 col=shadeN(n,base,40.,.6);
  float lx=l.x+.35*l.y*l.y-.02;
  float mid=exp(-pow(lx/.006,2.))*smoothstep(.25,-.2,l.y);
  float vein=exp(-pow((fract((l.y+abs(lx)*.9)*10.)-.5)/.06,2.))*smoothstep(.008,.03,abs(lx))*smoothstep(0.,-.03,leafL(l));
  col=mix(col,ICE,mid*.6+vein*.3);
  float a=aa(sd)*.95; return vec4(col*a,a);
}
void finish(vec4 C){ C.rgb=max(hueRot(C.rgb,uHue),0.); gl_FragColor=C; }
`;

const LIB_SCENES = {};

/* ---- joint protection: a human knee from the side, gently flexed (about 18 degrees) - the femur
   and tibia angled at the joint, the round femoral condyles on the tibial plateau, the kneecap on
   the front held by its tendons, fibula, menisci and glowing cartilage - over a subtle glass
   shield, with a pulsing joint glow and a slow scan */
LIB_SCENES.joint = LIB + `
float sdShield(vec2 p){ float d=1e9,s=1.;
  vec2 v0=sv(220.,18.),v1=sv(336.,54.),v2=sv(336.,150.),v3=sv(320.,205.),v4=sv(278.,250.),v5=sv(220.,288.),v6=sv(162.,250.),v7=sv(120.,205.),v8=sv(104.,150.),v9=sv(104.,54.);
  edgeP(p,v0,v1,d,s);edgeP(p,v1,v2,d,s);edgeP(p,v2,v3,d,s);edgeP(p,v3,v4,d,s);edgeP(p,v4,v5,d,s);
  edgeP(p,v5,v6,d,s);edgeP(p,v6,v7,d,s);edgeP(p,v7,v8,d,s);edgeP(p,v8,v9,d,s);edgeP(p,v9,v0,d,s);
  return s*sqrt(d)-.02; }
float sdEll(vec2 p,vec2 r){ float k0=length(p/r), k1=length(p/(r*r)); return k0*(k0-1.)/max(k1,1e-5); }
/* the bones are drawn upright in their own frames, then turned about the joint centre JC:
   the femur by AF, the tibia by AT, so the knee bends forward with both ends going back */
vec2 JC; float AF, AT;
vec2 femL(vec2 p){ return JC+rot(-AF)*(p-JC); }
vec2 tibL(vec2 p){ return JC+rot(-AT)*(p-JC); }
vec2 femW(vec2 p){ return JC+rot(AF)*(p-JC); }
vec2 tibW(vec2 p){ return JC+rot(AT)*(p-JC); }
/* femur (side view, front to the right): shaft, the round condyles bulging behind, the trochlea in front */
float sdFemurL(vec2 p){ float r=su(16.)+su(6.)*(1.-smoothstep(.15,.55,p.y));
  float d=sdSeg(p,sv(207.,-60.),sv(211.,110.))-r;
  float m=length(p-sv(211.,151.))-su(30.);
  m=smin(m,length(p-sv(196.,149.))-su(27.),su(10.));
  m=smin(m,length(p-sv(229.,130.))-su(20.),su(14.));
  return smin(d,m,su(18.)); }
/* tibia: the plateau, the tuberosity in front, tapering into the shaft */
float sdTibiaL(vec2 p){ float d=sdBox(p-sv(213.,197.),vec2(su(42.),su(8.)),su(6.));
  d=smin(d,length(p-sv(240.,223.))-su(9.),su(10.));
  float m=max(sdUnevenCapsule(p-sv(212.,345.),su(13.),su(29.),su(131.)),p.y-sv(0.,197.).y);
  return smin(d,m,su(14.)); }
float sdFibulaL(vec2 p){ float d=length(p-sv(181.,215.))-su(10.);
  return smin(d,sdSeg(p,sv(183.,222.),sv(190.,345.))-su(6.),su(8.)); }
float sdPatL(vec2 p){ return sdEll(rot(-.26)*(p-sv(251.,140.)),vec2(su(11.),su(22.))); }
float sdMenL(vec2 p){ return min(sdEll(p-sv(188.,185.),vec2(su(14.),su(4.))),sdEll(p-sv(238.,185.),vec2(su(14.),su(4.)))); }
float sdFemur(vec2 p){ return sdFemurL(femL(p)); }
float sdTibia(vec2 p){ return sdTibiaL(tibL(p)); }
float sdFibula(vec2 p){ return sdFibulaL(tibL(p)); }
float sdPat(vec2 p){ return sdPatL(femL(p)); }
float sdMen(vec2 p){ return sdMenL(tibL(p)); }
/* a translucent tendon or ligament with fibres running along it */
vec4 band(vec2 P,vec2 a,vec2 b,float r,float a0){ vec2 c=segC(P,a,b); float sd=length(P-c)-r; if(sd>PX) return vec4(0.);
  vec4 g=glassN(tubeN(P,c,r),MINT,sd,a0); vec2 ab=normalize(b-a);
  float fib=.5+.5*sin(dot(P-a,vec2(-ab.y,ab.x))/r*9.); g.rgb+=LITE*fib*.1*g.a; return g; }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  float flex=.157+.014*sin(T*TAU/6.);                  /* ~18 degrees in all, breathing gently */
  JC=sv(213.,185.); AF=flex; AT=-flex;
  vec2 SH=vec2(su(12.),0.), B=P-SH, J=JC+SH; float pulse=.5+.5*sin(T*TAU/2.6);
  float fadeT=1.-smoothstep(.6,.9,P.y), fadeB=smoothstep(-.93,-.6,P.y);
  vec3 BONE=mix(ICE,LITE,.35)*.92, CART=mix(MINT,LITE,.5);
  C=over(C,halo(P,J,.8,.14));
  /* shield: a quiet glass pillow behind the knee, with a flowing dashed edge */
  float ss=sdShield(P);
  if(ss<PX){ vec3 n=BN(sdShield,P,.16,.7); C=over(C,glassN(n,MINT,ss,.03)*.5); }
  float ang=atan(P.y-sv(220.,150.).y,P.x);
  C=over(C,dashLine(abs(ss+.018),ang/TAU,LITE,su(1.4),14.,.08)*.5);
  /* protective ripples spreading from the joint, behind the bones */
  for(int i=0;i<3;i++){ float ph=fract(T/2.8+float(i)/3.); float r=su(40.)*(1.+1.5*ph);
    float rg=exp(-pow((length(P-J)-r)/su(1.6),2.))*(1.-ph)*.45; C=over(C,vec4(MINT*rg,rg*.6)); }
  vec2 FL=femL(B), TL=tibL(B);
  /* fibula, behind the tibia */
  float fb=sdFibulaL(TL);
  if(fb<PX){ vec3 n=BN(sdFibula,B,su(7.),1.); C=over(C,solidN(n,BONE*.8,fb,40.)*fadeB); }
  /* tibia, its plateau capped with cartilage */
  float tb=sdTibiaL(TL);
  if(tb<PX){ vec3 n=BN(sdTibia,B,su(14.),1.); vec4 s=solidN(n,BONE,tb,50.);
    s.rgb=mix(s.rgb,CART*(.8+.4*pulse)*s.a,smoothstep(-.3,-.27,TL.y)*.7); C=over(C,s*fadeB); }
  /* contact shadow in the joint space */
  C=over(C,shadowAt(TL,JC,vec2(su(46.),su(8.)),.35));
  /* femur, articular cartilage glowing on the condyles */
  float fd=sdFemurL(FL);
  if(fd<PX){ vec3 n=BN(sdFemur,B,su(15.),1.); vec4 s=solidN(n,BONE,fd,50.);
    float cart=(1.-smoothstep(-.09,-.04,FL.y))*smoothstep(-su(9.),-su(3.),fd);
    s.rgb=mix(s.rgb,CART*(.85+.35*pulse)*s.a,cart*.65); C=over(C,s*fadeT); }
  /* menisci cushioning the joint */
  float md=sdMenL(TL);
  if(md<PX){ vec3 n=BN(sdMen,B,su(4.),1.); vec4 g=glassN(n,LITE,md,.45); g.rgb+=MINT*(.3+.3*pulse)*aa(md); C=over(C,g); }
  /* joint illumination: the joint space glowing from within */
  float jl=exp(-pow((TL.y-JC.y)/su(3.5),2.))*exp(-pow((TL.x-JC.x)/su(40.),2.))*(.6+.5*pulse);
  C=over(C,vec4(mix(MINT,ICE,.4)*jl,jl*.55));
  C=over(C,glowSD(length(P-J)-su(12.),MINT,.07,.12+.12*pulse));
  /* lateral collateral ligament: femoral epicondyle to the fibular head */
  C=over(C,band(B,femW(sv(204.,142.)),tibW(sv(183.,207.)),su(3.5),.08)*.55);
  /* quadriceps tendon and patellar ligament holding the kneecap */
  C=over(C,band(B,femW(sv(245.,120.)),femW(sv(228.,14.)),su(10.),.14)*fadeT);
  C=over(C,band(B,femW(sv(256.,160.)),tibW(sv(243.,222.)),su(6.5),.2));
  /* the kneecap riding on the front of the femur */
  C=over(C,shadowAt(FL,sv(244.,142.),vec2(su(16.),su(26.)),.35));
  float pd=sdPatL(FL);
  C=over(C,glowSD(pd,LITE,.012,.25));
  if(pd<PX){ vec3 n=BN(sdPat,B,su(12.),1.); C=over(C,solidN(n,mix(BONE,ICE,.25),pd,70.)); }
  /* a slow scan sweeping the knee, lighting the bone contours as it passes */
  float sy=sv(0.,150.).y+.78*sin(T*TAU/5.);
  float sl=exp(-pow((P.y-sy)/su(1.),2.)), sb=exp(-pow((P.y-sy)/su(16.),2.));
  float bm=max(max(aa(fd)*fadeT,aa(tb)*fadeB),max(aa(pd),aa(fb)*fadeB));
  float edge=max(max(exp(-abs(fd)/su(1.5))*fadeT,exp(-abs(tb)/su(1.5))*fadeB),exp(-abs(pd)/su(1.5)));
  C.rgb+=(LITE*bm*.2+ICE*edge*.45)*sb;
  C=over(C,vec4(LITE*sl*.5,sl*.35)*aa(ss+.03));
  /* the gold protective arc sweeping around the front of the knee */
  float a=atan(P.y-J.y,P.x-J.x)-.35*sin(T*.7), rr=length(P-J);
  float span=smoothstep(.95,.8,abs(a));
  C=over(C,dashLine(abs(rr-su(100.)),a/TAU,GOLD,su(2.),10.,.25)*span);
  C=over(C,twinkle(P,sv(70.,80.),1.,0.)); C=over(C,twinkle(P,sv(380.,215.),.8,2.));
  finish(C);
}`;

/* ---- sleep: a lit 3D crescent moon, drifting Zs, twinkling stars, two flowing waves */
LIB_SCENES.sleep = LIB + `
vec4 zGlyph(vec2 p,vec2 c,float s,float a){ if(a<=.001) return vec4(0.);
  vec2 q=(p-c)/s; float r=.075;
  vec2 A=vec2(-.32,.36),B=vec2(.32,.36),D=vec2(-.32,-.36),E=vec2(.32,-.36);
  vec4 o=vec4(0.); o=over(o,tubeSeg(q,A,B,r,ICE,40.)); o=over(o,tubeSeg(q,B,D,r,ICE,40.)); o=over(o,tubeSeg(q,D,E,r,ICE,40.));
  return o*a; }
vec4 wave(vec2 P,float y0,float amp,float k,float spd,float r,vec3 col,float ph){
  float y=y0+amp*sin(P.x*k-uT*spd+ph), dy=amp*k*cos(P.x*k-uT*spd+ph);
  float d=(P.y-y)/sqrt(1.+dy*dy); float sd=abs(d)-r; if(sd>.06) return vec4(0.);
  float t=clamp(d/r,-1.,1.); vec3 n=normalize(vec3(-dy*t*.6,t,sqrt(max(0.,1.-t*t))));
  float head=exp(-pow(mod(P.x*.6-uT*.35+ph,1.)-.5,2.)/.01);
  vec4 o=glowSD(sd,col,.03,.25+.35*head);
  if(sd<PX){ vec4 s=solidN(n,col,sd,40.); s.rgb+=ICE*head*.4*s.a; o=over(o,s); }
  float edge=smoothstep(1.47,1.25,abs(P.x)); return o*edge; }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  vec2 M=sv(196.,140.)+vec2(0.,.025*sin(T*.9)); float R=su(74.);
  vec2 K=M+vec2(.28,.1467); float r2=su(62.);
  C=over(C,halo(P,M,.85,.2));
  float dm=length(P-M)-R, dk=length(P-K)-r2, cres=max(dm,-dk);
  C=over(C,glowSD(cres,LITE,.07,.3+.08*sin(T*1.3)));
  if(dm<PX){
    vec3 n=sphN(P,M,R);
    vec3 base=mix(TEAL,LITE,smoothstep(-.9,.7,n.y*.6-n.x*.7));
    /* soft craters */
    float cr=smoothstep(su(9.),su(6.),length(P-(M+vec2(-.2,.12))))*.12+smoothstep(su(7.),su(4.),length(P-(M+vec2(-.28,-.18))))*.1+smoothstep(su(5.),su(3.),length(P-(M+vec2(-.08,-.3))))*.1;
    vec4 lit=solidN(n,base*(1.-cr),dm,30.);
    float inC=1.-smoothstep(-PX,PX,-dk);                                   /* 1 on the lit crescent */
    vec4 dark=glassN(n,DEEP,dm,.04)*.28;                                      /* faint earthshine */
    C=over(C,mix(dark,lit,inC*aa(cres)+0.));
  }
  /* Zs drift up and fade in turn */
  for(int i=0;i<3;i++){ float fi=float(i); float ph=fract(T/3.+fi*.27);
    vec2 base=i==0?sv(300.,160.):(i==1?sv(338.,128.):sv(366.,102.)); float s=i==0?su(34.):(i==1?su(24.):su(16.));
    float a=smoothstep(0.,.35,ph)*smoothstep(1.,.6,ph);
    C=over(C,zGlyph(P,base+vec2(ph*.06,ph*.09),s,a)); }
  C=over(C,twinkle(P,sv(310.,60.),1.,0.)); C=over(C,twinkle(P,sv(350.,120.),.7,1.)); C=over(C,twinkle(P,sv(90.,60.),.7,2.));
  C=over(C,twinkle(P,sv(120.,230.),.9,3.)); C=over(C,twinkle(P,sv(380.,210.),.8,4.)); C=over(C,twinkle(P,sv(300.,230.),.6,5.));
  C=over(C,wave(P,sv(0.,262.).y,su(10.),4.2,1.2,su(2.6),MINT,0.));
  C=over(C,wave(P,sv(0.,282.).y,su(7.),4.2,-1.,su(2.),TEAL,1.7));
  finish(C);
}`;

/* ---- AI coach: a glass neural core with "AI", six nodes, light travelling along the links */
LIB_SCENES.ai = LIB + `
vec2 node(int i){ if(i==0) return sv(110.,70.); if(i==1) return sv(330.,70.); if(i==2) return sv(70.,170.);
  if(i==3) return sv(370.,170.); if(i==4) return sv(130.,250.); return sv(310.,250.); }
float sdAI(vec2 q){ float d=sdSeg(q,vec2(-1.15,-.7),vec2(-.65,.7)); d=min(d,sdSeg(q,vec2(-.65,.7),vec2(-.15,-.7)));
  d=min(d,sdSeg(q,vec2(-.92,-.2),vec2(-.38,-.2))); d=min(d,sdSeg(q,vec2(.55,-.7),vec2(.55,.7))); return d-.14; }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  vec2 O=sv(220.,150.); float pulse=.5+.5*sin(T*TAU/2.6);
  C=over(C,halo(P,O,.8,.18));
  /* links with pulses of light travelling to the core */
  for(int i=0;i<6;i++){ vec2 n=node(i); float fi=float(i);
    float d=sdSeg(P,O,n); float l=exp(-pow(d/su(1.2),2.))*.5+exp(-d/su(5.))*.08;
    C=over(C,vec4(MINT*l,l*.6));
    float s=fract(T/(2.2+fi*.3)+fi*.17); vec2 q=mix(n,O,s);
    float g=exp(-dot(P-q,P-q)/pow(su(4.),2.))*(1.-s*.4); C=over(C,vec4(ICE*g,g)); }
  /* orbit ring with a bead */
  float rr=length(P-O), ra=atan(P.y-O.y,P.x-O.x);
  float orb=exp(-pow((rr-su(62.))/su(1.),2.))*.35; C=over(C,vec4(LITE*orb,orb*.6));
  vec2 bp=O+su(62.)*vec2(cos(T*.8),sin(T*.8)); C=over(C,ball(P,bp,su(4.5),ICE,60.));
  /* nodes: small glass spheres with a pulsing heart */
  for(int i=0;i<6;i++){ vec2 n=node(i); float fi=float(i);
    C=over(C,glowSD(length(P-n)-su(17.),MINT,.03,.18));
    C=over(C,gball(P,n,su(17.),TEAL,.28));
    C=over(C,ball(P,n,su(6.)*(.85+.25*sin(T*2.4+fi)),MINT,40.)); }
  /* ripples and the core */
  for(int i=0;i<2;i++){ float ph=fract(T/2.4+float(i)*.5); float r=su(42.)*(1.+1.3*ph);
    float rg=exp(-pow((rr-r)/su(1.5),2.))*(1.-ph)*.6; C=over(C,vec4(MINT*rg,rg*.6)); }
  float cd=rr-su(42.);
  C=over(C,glowSD(cd,MINT,.06,.3+.2*pulse));
  if(cd<PX){ vec3 n=sphN(P,O,su(42.)); vec4 g=glassN(n,LITE,cd,.4);
    float sw=.5+.5*sin(ra*3.+T*1.2+rr*40.);
    g.rgb+=mix(TEAL,LITE,sw)*(.25+.2*pulse)*(1.-n.z*.3)*aa(cd); g.a=max(g.a,.75*aa(cd)); C=over(C,g);
    vec2 q=(P-O)/su(18.); float ad=sdAI(q)*su(18.);
    if(ad<PX){ float a=aa(ad); vec3 nn=normalize(vec3(0.,0.,1.)+n*.3); C=over(C,vec4(shadeN(nn,DEEP*.9,30.,.4)*a,a)); } }
  /* gold signal line above */
  float zd=min(min(sdSeg(P,sv(150.,40.),sv(180.,52.)),sdSeg(P,sv(180.,52.),sv(210.,30.))),min(sdSeg(P,sv(210.,30.),sv(240.,50.)),sdSeg(P,sv(240.,50.),sv(270.,36.))));
  C=over(C,dashLine(zd,P.x*1.4,GOLD,su(1.8),3.,.6));
  finish(C);
}`;

/* ---- heart: a glossy 3D heart that beats, an ECG trace sweeping across, ripples */
LIB_SCENES.heart = LIB + `
float beat(){ float f=fract(uT/1.3); return 1.+.06*exp(-pow((f-.1)/.05,2.))+.035*exp(-pow((f-.3)/.05,2.)); }
float sdH(vec2 p){ float S=su(190.)*beat(); vec2 q=(p-sv(220.,162.))/S+vec2(0.,.52); return sdHeart(q)*S; }
float ecg(vec2 p){ vec2 a=sv(10.,160.),b=sv(120.,160.),c=sv(134.,118.),d=sv(160.,214.),e=sv(182.,138.),f=sv(194.,160.),g=sv(430.,160.);
  return min(min(min(sdSeg(p,a,b),sdSeg(p,b,c)),min(sdSeg(p,c,d),sdSeg(p,d,e))),min(sdSeg(p,e,f),sdSeg(p,f,g))); }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  vec2 HC=sv(220.,160.); float b=beat()-1.;
  C=over(C,halo(P,HC,.8,.18+b*1.4));
  for(int i=0;i<3;i++){ float ph=fract(T/2.4+float(i)/3.); float r=su(70.)*(1.+1.2*ph);
    float rg=exp(-pow((length(P-HC)-r)/su(1.6),2.))*(1.-ph)*.55; C=over(C,vec4(MINT*rg,rg*.6)); }
  float hd=sdH(P);
  C=over(C,glowSD(hd,MINT,.06,.28+b*3.));
  if(hd<PX){ vec3 n=BN(sdH,P,su(40.),1.);
    float yy=clamp((P.y-HC.y)/.6+.5,0.,1.);
    vec3 base=mix(TEAL*.9,LITE,yy);
    vec4 s=solidN(n,base,hd,55.);
    float sss=pow(1.-n.z,1.5)*.25; s.rgb+=MINT*sss*s.a; C=over(C,s);
    vec2 hq=(P-sv(176.,122.))/vec2(su(22.),su(12.)); float hl=exp(-dot(hq,hq)*1.5)*.35; C.rgb+=ICE*hl*aa(hd); }
  /* the ECG trace: dim line, bright travelling head with a fading tail */
  float hx=-1.62+fract(T/2.6)*3.4; float d=ecg(P);
  float tail=exp(-max(hx-P.x,0.)/.55)*step(P.x,hx+.02);
  float line=exp(-pow(d/su(1.8),2.)); float glow=exp(-d/su(7.))*.25;
  float k=(.22+.95*tail)*line+glow*tail; C=over(C,vec4(GOLD*k,k*.85));
  C=over(C,twinkle(P,sv(60.,60.),1.,0.)); C=over(C,twinkle(P,sv(385.,70.),.8,2.)); C=over(C,twinkle(P,sv(370.,240.),.9,4.));
  finish(C);
}`;

/* ---- plate: a glass plate, a 3D portion pie turning slowly, cutlery, a leaf and a tomato */
LIB_SCENES.plate = LIB + `
const float RF=.5867;   /* su(88.) */
vec3 pieInfo(vec2 p){   /* x: inside distance, y: wedge index */
  float r=length(p); float a=fract(atan(p.x,p.y)/TAU+uT/40.);
  float a0=0.,a1=.35,w=0.; if(a>=.35){a0=.35;a1=.6;w=1.;} if(a>=.6){a0=.6;a1=.9;w=2.;} if(a>=.9){a0=.9;a1=1.;w=3.;}
  float ins=min(RF-r,r*sin(TAU*min(a-a0,a1-a)))-.012; return vec3(ins,w,r); }
float sdPie(vec2 p){ return -pieInfo(p).x; }
/* fork: a handle tapering to a slim neck, a flared head and four evenly spaced round-tipped tines */
float sdFork(vec2 p){
  float d=sdUnevenCapsule(p-sv(70.,226.),su(6.5),su(3.),su(82.));
  float hd=max(sdUnevenCapsule(p-sv(70.,146.),su(3.),su(15.),su(38.)),p.y-sv(0.,104.).y);
  float tn=1e9; for(int i=0;i<4;i++) tn=min(tn,sdBox(p-sv(70.+(float(i)-1.5)*7.3,80.),vec2(su(2.1),su(26.)),su(2.)));
  return smin(d,smin(hd,tn,su(2.)),su(4.)); }
/* knife: a rounded handle, a small bolster and a blade with a straight spine and a softly curved edge */
float sdBlade(vec2 p){ float d=1e9,s=1.;
  vec2 b0=sv(365.,151.),b1=sv(365.,76.),b2=sv(366.5,63.),b3=sv(370.5,55.),b4=sv(376.,56.),b5=sv(380.5,67.),b6=sv(382.,102.),b7=sv(380.5,138.),b8=sv(377.5,151.);
  edgeP(p,b0,b1,d,s);edgeP(p,b1,b2,d,s);edgeP(p,b2,b3,d,s);edgeP(p,b3,b4,d,s);edgeP(p,b4,b5,d,s);
  edgeP(p,b5,b6,d,s);edgeP(p,b6,b7,d,s);edgeP(p,b7,b8,d,s);edgeP(p,b8,b0,d,s);
  return s*sqrt(d)-su(.6); }
float sdKHandle(vec2 p){ return smin(sdUnevenCapsule(p-sv(372.,228.),su(6.5),su(5.),su(70.)),sdBox(p-sv(371.5,155.),vec2(su(5.),su(3.5)),su(1.5)),su(2.)); }
/* polished metal: key light, a bright studio streak, a darker lower reflection and a passing glint */
vec4 metal(vec3 n,float sd,float glint){ vec3 MET=mix(ICE,TEAL,.22);
  vec4 s=solidN(n,MET*.82,sd,110.);
  float streak=exp(-pow((n.x+.28)/.16,2.))*.4+exp(-pow((n.x-.5)/.1,2.))*.18;
  s.rgb+=ICE*(streak+glint*.55)*s.a; s.rgb=mix(s.rgb,DEEP*s.a,clamp(-n.y,0.,1.)*.35); return s; }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  C=over(C,halo(P,vec2(0.),.85,.16));
  C=over(C,shadowAt(P,vec2(.02,-.06),vec2(.75,.72),.25));
  /* plate: glass dish with a raised rim */
  float r=length(P), R=su(108.), pd=r-R;
  if(pd<PX){ float rim=exp(-pow((r-R*.88)/(R*.09),2.)); float dr=-2.*(r-R*.88)/pow(R*.09,2.)*rim*.012;
    float edge=bevel(pd,.03); float de=(bevel(pd-.002,.03)-bevel(pd+.002,.03))/.004;
    vec2 rd=P/max(r,1e-4); vec3 n=normalize(vec3(-rd*(dr+de*.6),1.));
    vec4 g=glassN(n,LITE,pd,.16); g.rgb+=ICE*rim*.12*aa(pd); C=over(C,g); }
  /* the portions */
  vec3 pi=pieInfo(P);
  if(-pi.x<PX){ vec3 n=BN(sdPie,P,su(18.),1.);
    vec3 col=pi.y<.5?MINT:(pi.y<1.5?TEAL:(pi.y<2.5?GOLD:ICE*.92));
    float grain=pi.y>1.5&&pi.y<2.5?.06*sin(P.x*180.)*sin(P.y*170.):0.;
    C=over(C,solidN(n,col*(1.+grain),-pi.x,45.)); }
  C=over(C,ball(P,vec2(0.),su(14.),DEEP*.9,30.));
  /* cutlery */
  float gy=sv(0.,mix(30.,250.,fract(T/7.))).y, glint=exp(-pow((P.y-gy)/su(14.),2.))*smoothstep(0.,.15,fract(T/7.))*(1.-smoothstep(.8,1.,fract(T/7.)));
  float fk=sdFork(P);
  if(fk<PX){ vec3 n=BN(sdFork,P,su(4.),1.); C=over(C,metal(n,fk,glint)); }
  float kh=sdKHandle(P);
  if(kh<PX){ vec3 n=BN(sdKHandle,P,su(6.),1.); C=over(C,metal(n,kh,glint)); }
  float kb=sdBlade(P);
  if(kb<PX){ vec3 n=BN(sdBlade,P,su(3.),1.); n.x+=(P.x-sv(373.5,0.).x)/su(8.5)*.22; n=normalize(n);
    vec4 s=metal(n,kb,glint); float ed=exp(-pow((P.x-sv(380.5,0.).x)/su(1.4),2.))*smoothstep(sv(0.,150.).y,sv(0.,140.).y,P.y);
    s.rgb+=ICE*ed*.25*s.a; C=over(C,s); }
  /* a leaf and a tomato drifting */
  C=over(C,leafAt(P,sv(343.,74.)+vec2(0.,.02*sin(T*1.1)),-.55,.42,MINT));
  vec2 tc=sv(84.,250.)+vec2(0.,.02*sin(T*1.1+2.5));
  C=over(C,ball(P,tc,su(12.),CORAL,50.));
  C=over(C,tubeSeg(P,tc+vec2(0.,su(11.)),tc+vec2(su(8.),su(17.)),su(1.8),MINT,30.));
  C=over(C,twinkle(P,sv(390.,170.),.8,1.));
  finish(C);
}`;

/* ---- DNA: a turning double helix of glossy strands and lit base pairs, floating molecules */
LIB_SCENES.helix = LIB + `
vec4 strand(vec2 P,float sgn,out float zo){
  float best=1e9; vec2 bc=vec2(0.); float bz=0.; float ph=uT*.7;
  for(int i=0;i<48;i++){ float x0=30.+float(i)*8., x1=x0+8.;
    float a0=x0/34.+ph, a1=x1/34.+ph;
    vec2 A=sv(x0,150.-sgn*62.*sin(a0)), B=sv(x1,150.-sgn*62.*sin(a1));
    vec2 c=segC(P,A,B); float d=length(P-c);
    if(d<best){ best=d; bc=c; float h=clamp(dot(P-A,B-A)/dot(B-A,B-A),0.,1.); bz=sgn*mix(cos(a0),cos(a1),h); } }
  zo=bz; float r=su(5.2)*(1.+.3*bz); float sd=best-r; if(sd>PX) return vec4(0.);
  vec3 col=(sgn>0.?MINT:TEAL)*(.55+.45*(bz*.5+.5));
  vec4 s=solidN(tubeN(P,bc,r),col,sd,50.); return s*(.75+.25*(bz*.5+.5)); }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  C=over(C,halo(P,vec2(0.),.85,.14));
  if(abs(P.x)<1.33){
    float z1,z2; vec4 s1=strand(P,1.,z1), s2=strand(P,-1.,z2);
    vec4 back=z1<z2?s1:s2, front=z1<z2?s2:s1;
    C=over(C,back);
    /* base pairs: lit one after another along the helix */
    float ph=T*.7; float xs=(P.x*150.+220.-30.)/24.; float k=floor(xs+.5);
    if(k>=0.&&k<=15.){ float x=30.+k*24.; float a=x/34.+ph;
      vec2 A=sv(x,150.-62.*sin(a)), B=sv(x,150.+62.*sin(a));
      vec2 c=segC(P,A,B); float d=length(P-c)-su(2.4)*(1.+.2*cos(a));
      float lit=.35+.65*pow(.5+.5*sin(T*2.-k*.55),4.);
      vec3 col=mix(P.y>sv(0.,150.).y?LITE:mix(TEAL,LITE,.4),ICE,lit*.4)*(.6+.5*lit);
      if(d<PX){ vec4 r=solidN(tubeN(P,c,su(2.4)),col,d,40.); C=over(C,r*(.65+.35*abs(cos(a)))); }
      C=over(C,glowSD(d,MINT,.012,.18*lit)); }
    C=over(C,front);
  }
  /* molecules */
  for(int i=0;i<4;i++){ float fi=float(i);
    vec2 c=(i==0?sv(90.,60.):(i==1?sv(340.,50.):(i==2?sv(380.,250.):sv(60.,245.))))+vec2(0.,.025*sin(T*1.1+fi*1.7));
    vec2 c2=c+su(16.)*vec2(cos(T*.5+fi),sin(T*.5+fi))*vec2(1.,.62);
    C=over(C,tubeSeg(P,c,c2,su(1.6),ICE*.85,30.));
    C=over(C,ball(P,c,su(9.),GOLD,50.)); C=over(C,ball(P,c2,su(5.),ICE,50.)); }
  finish(C);
}`;

/* ---- weekly planner: a glass board of bevelled day tiles, training days lighting in a wave */
LIB_SCENES.planner = LIB + `
vec2 cellOf(vec2 p){ float x=p.x*150.+220., y=150.-p.y*150.; return vec2(floor((x-48.+6.)/50.),floor((y-64.+7.)/52.)); }
float sdCell(vec2 p){ vec2 k=cellOf(p); k=clamp(k,vec2(0.),vec2(6.,3.));
  return sdBox(p-sv(48.+k.x*50.+19.,64.+k.y*52.+19.),vec2(su(19.)),su(10.)); }
float sdPanel(vec2 p){ return sdBox(p-sv(220.,155.),vec2(su(192.),su(125.)),su(22.)); }
float sdBell(vec2 p){ vec2 q=p-sv(210.,28.);
  float d=sdBox(q,vec2(su(20.),su(3.)),su(1.5));
  d=min(d,sdBox(q-vec2(su(-30.),0.),vec2(su(4.),su(17.)),su(2.))); d=min(d,sdBox(q-vec2(su(30.),0.),vec2(su(4.),su(17.)),su(2.)));
  d=min(d,sdBox(q-vec2(su(-40.),0.),vec2(su(4.),su(11.)),su(2.))); d=min(d,sdBox(q-vec2(su(40.),0.),vec2(su(4.),su(11.)),su(2.)));
  return d; }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  C=over(C,halo(P,sv(220.,155.),.9,.12));
  C=over(C,shadowAt(P,sv(222.,160.),vec2(1.35,.9),.18));
  float pd=sdPanel(P);
  if(pd<PX){ vec3 n=BN(sdPanel,P,su(14.),.8); C=over(C,glassN(n,TEAL,pd,.08)); }
  /* the selected day eases from column to column */
  float s=T/1.6, f=smoothstep(.7,1.,fract(s)); float colp=mod(floor(s)+f,7.);
  float bx=sv(48.+colp*50.+19.,0.).x; float band=sdBox(P-vec2(bx,sv(0.,155.).y),vec2(su(24.),su(105.)),su(14.));
  C=over(C,glowSD(abs(band),LITE,.01,.35));
  vec2 k=cellOf(P);
  if(k.x>=0.&&k.x<=6.&&k.y>=0.&&k.y<=3.){
    float cd=sdCell(P);
    if(cd<PX){ vec3 n=BN(sdCell,P,su(9.),1.);
      bool on=mod(k.x,2.)>.5&&k.x<5.5, rest=k.x>5.5;
      if(on){ float w=.55+.45*pow(.5+.5*sin(T*1.8-k.x*.7-k.y*.45),3.);
        vec4 t=solidN(n,mix(TEAL,MINT,w),cd,50.); t.rgb+=MINT*.25*w*t.a; C=over(C,t);
        vec2 c=sv(48.+k.x*50.+19.,64.+k.y*52.+19.);
        float ck=min(sdSeg(P,c+su(1.)*vec2(-7.,0.),c+su(1.)*vec2(-2.,-5.)),sdSeg(P,c+su(1.)*vec2(-2.,-5.),c+su(1.)*vec2(8.,6.)))-su(2.);
        float ca=aa(ck)*.9; C=over(C,vec4(ICE*ca,ca)); }
      else if(rest) C=over(C,solidN(n,GOLD*.88,cd,50.));
      else C=over(C,glassN(n,LITE,cd,.12)); } }
  /* a dumbbell floating above the board */
  vec2 Q=P-vec2(0.,.02*sin(T*1.2));
  float dd=sdBell(Q);
  if(dd<PX){ vec3 n=BN(sdBell,Q,su(3.),1.); C=over(C,solidN(n,mix(ICE,LITE,.3),dd,70.)); }
  finish(C);
}`;

/* ---- skin & hair: a luminous glass sphere with a pearl drop, ripples, flowing hair strands */
LIB_SCENES.skin = LIB + `
float sdDrop(vec2 p){ return sdUnevenCapsule(p-sv(220.,166.)+vec2(0.,.02*sin(uT*1.4)),su(28.),su(1.),su(64.)); }
vec4 strandW(vec2 P,float x0,float amp,float ph,vec3 col){
  float y=150.-P.y*150.; if(y<36.||y>274.) return vec4(0.);
  float k=.024, x=x0+amp*sin(y*k+uT*1.1+ph), dx=amp*k*cos(y*k+uT*1.1+ph);
  float d=(P.x-sv(x,0.).x)/sqrt(1.+dx*dx); float r=su(3.2), sd=abs(d)-r; if(sd>.04) return vec4(0.);
  float t=clamp(d/r,-1.,1.); vec3 n=normalize(vec3(t,-dx*t*.5,sqrt(max(0.,1.-t*t))));
  float fl=.5+.5*sin(y*.05-uT*2.+ph); float fade=smoothstep(36.,70.,y)*smoothstep(274.,240.,y);
  vec4 o=glowSD(sd,col,.02,.15*fl);
  if(sd<PX) o=over(o,solidN(n,mix(col,ICE,fl*.25),sd,40.)); return o*fade; }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  vec2 O=sv(220.,150.)+vec2(0.,.018*sin(T*.9)); float R=su(82.);
  C=over(C,halo(P,O,.8,.2));
  C=over(C,strandW(P,60.,20.,0.,MINT)); C=over(C,strandW(P,86.,20.,.8,TEAL)); C=over(C,strandW(P,380.,-20.,1.7,MINT));
  for(int i=0;i<2;i++){ float ph=fract(T/3.+float(i)*.5); float r=R*(1.+.45*ph);
    float rg=exp(-pow((length(P-O)-r)/su(1.6),2.))*(1.-ph)*.55; C=over(C,vec4(MINT*rg,rg*.6)); }
  float sd=length(P-O)-R;
  C=over(C,glowSD(sd,LITE,.06,.25));
  if(sd<PX){ vec3 n=sphN(P,O,R); vec4 g=glassN(n,LITE,sd,.3);
    g.rgb+=mix(TEAL,LITE,.5+.5*n.y)*.32*aa(sd); g.a=max(g.a,.62*aa(sd)); C=over(C,g);
    float dd=sdDrop(P-(O-sv(220.,150.)));
    if(dd<PX){ vec3 dn=BN(sdDrop,P-(O-sv(220.,150.)),su(14.),1.);
      vec4 pearl=solidN(dn,mix(ICE,LITE,.25),dd,70.); pearl.rgb+=ICE*.12*(.5+.5*sin(T*2.))*pearl.a; C=over(C,pearl); } }
  C=over(C,twinkle(P,sv(330.,80.),1.2,0.)); C=over(C,twinkle(P,sv(120.,70.),.9,1.)); C=over(C,twinkle(P,sv(350.,230.),1.,2.));
  C=over(C,twinkle(P,sv(100.,235.),.8,3.)); C=over(C,twinkle(P,sv(262.,48.),.7,4.));
  finish(C);
}`;

/* ---- hormonal rhythms: four glass orbits with beads and comet tails around a beating heart */
LIB_SCENES.rings = LIB + `
float sdHc(vec2 p){ float b=1.+.07*exp(-pow((fract(uT/1.3)-.1)/.06,2.)); float S=su(46.)*b; vec2 q=(p-sv(220.,152.))/S+vec2(0.,.52); return sdHeart(q)*S; }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  vec2 O=sv(220.,150.); float rr=length(P-O), a=atan(P.y-O.y,P.x-O.x);
  C=over(C,halo(P,O,.75,.2));
  for(int i=0;i<4;i++){ float fi=float(i); float R=su(110.-fi*24.); float w=su(2.6-fi*.3);
    float dir=mod(fi,2.)<.5?1.:-1.; float ba=dir*T*TAU/(10.+fi*5.)+fi*1.3;
    vec3 col=i==0?GOLD:(i==1?MINT:(i==2?ICE:TEAL));
    float sd=abs(rr-R)-w;
    if(sd<PX){ float t=clamp((rr-R)/w,-1.,1.); vec3 n=normalize(vec3((P-O)/max(rr,1e-4)*t,sqrt(max(0.,1.-t*t))));
      C=over(C,solidN(n,mix(TEAL,LITE,.35)*(.75-fi*.08),sd,40.)*.8); }
    /* comet tail behind the bead */
    float da=mod((a-ba)*dir+TAU,TAU); float tail=exp(-(TAU-da)/.7)*step(.02,TAU-da)*exp(-pow((rr-R)/su(2.5),2.));
    C=over(C,vec4(col*tail*.8,tail*.6));
    vec2 bp=O+R*vec2(cos(ba),sin(ba)); float br=su(9.-fi);
    C=over(C,glowSD(length(P-bp)-br,col,.025,.4)); C=over(C,ball(P,bp,br,col,60.)); }
  float hd=sdHc(P);
  C=over(C,glowSD(hd,LITE,.05,.35));
  if(hd<PX){ vec3 n=BN(sdHc,P,su(16.),1.); C=over(C,solidN(n,mix(TEAL,LITE,.6),hd,55.)); }
  C=over(C,twinkle(P,sv(60.,60.),1.,0.)); C=over(C,twinkle(P,sv(390.,240.),1.,2.));
  finish(C);
}`;

/* ---- growth: glass height pillars with heads, lit in turn, a rising gold trend and a star */
LIB_SCENES.growth = LIB + `
float hOf(float i){ return i<.5?40.:(i<1.5?56.:(i<2.5?72.:(i<3.5?90.:(i<4.5?110.:134.)))); }
float g_i; float sdBar(vec2 p){ float i=g_i, x=60.+i*62., h=hOf(i)*(1.+.03*sin(uT*1.5-i*.5));
  return sdBox(p-sv(x,270.-h*.5),vec2(su(8.+i),su(h*.5)),su(7.+i)); }
vec2 quad(vec2 a,vec2 b,vec2 c,float t){ return mix(mix(a,b,t),mix(b,c,t),t); }
float sdStar(vec2 p){ vec2 q=rot(.15*sin(uT*.8))*(p-sv(375.,60.)); return sdStar5(q,su(14.),.45); }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  C=over(C,halo(P,sv(330.,120.),.75,.16));
  C=over(C,shadowAt(P,sv(215.,272.),vec2(1.2,.03),.35));
  float base=exp(-pow((P.y-sv(0.,270.).y)/su(1.),2.))*smoothstep(1.3,1.1,abs(P.x+.03)); C=over(C,vec4(ICE*base*.4,base*.35));
  /* trend line under the pillars */
  float best=1e9, u=0.; vec2 A=sv(60.,190.),B=sv(200.,170.),Cc=sv(360.,70.);
  for(int i=0;i<16;i++){ float t0=float(i)/16., t1=t0+1./16.; vec2 a=quad(A,B,Cc,t0), b=quad(A,B,Cc,t1);
    float d=sdSeg(P,a,b); if(d<best){best=d; u=t0;} }
  for(int i=0;i<6;i++){ float fi=float(i); g_i=fi; float x=60.+fi*62., h=hOf(fi)*(1.+.03*sin(T*1.5-fi*.5));
    float lit=pow(.5+.5*sin(T*1.6-fi*.8),4.);
    float sd=sdBar(P);
    if(sd<PX){ vec3 n=BN(sdBar,P,su(6.+fi),1.);
      if(i==5){ vec3 col=mix(TEAL,LITE,clamp((P.y-sv(0.,270.).y)/su(h),0.,1.)); C=over(C,solidN(n,col,sd,50.)); }
      else { vec4 g=glassN(n,MINT,sd,.18+.2*lit); float fill=clamp((P.y-sv(0.,270.).y)/su(h),0.,1.);
        g.rgb+=mix(TEAL,LITE,fill)*(.18+.35*lit)*aa(sd)*(1.-fill*.5); g.a=max(g.a,(.3+.3*lit)*aa(sd)); C=over(C,g); } }
    vec2 hc=sv(x,270.-h-12.); float hr=su(9.+fi*1.3);
    C=over(C,glowSD(length(P-hc)-hr,MINT,.02,.15+.35*lit));
    C=over(C,ball(P,hc,hr,i==5?MINT:mix(ICE,LITE,.3),55.)); }
  C=over(C,dashLine(best,u,GOLD,su(1.6),9.,.5));
  float st=sdStar(P);
  C=over(C,glowSD(st,GOLD,.04,.4+.15*sin(T*2.)));
  if(st<PX){ vec3 n=BN(sdStar,P,su(6.),1.); C=over(C,solidN(n,GOLD,st,60.)); }
  C=over(C,twinkle(P,sv(300.,50.),.7,1.)); C=over(C,twinkle(P,sv(60.,60.),.7,3.));
  finish(C);
}`;

/* ---- gut health: a translucent glass small intestine - one tube folded into compact connected loops -
   with nutrients flowing through it, a leaf, a check */
LIB_SCENES.gut = LIB + `
vec2 cub(vec2 a,vec2 b,vec2 c,vec2 d,float t){ float s=1.-t; return s*s*s*a+3.*s*s*t*b+3.*s*t*t*c+t*t*t*d; }
void piece(float k,out vec2 a,out vec2 b,out vec2 c,out vec2 d){
  if(k<0.5){a=sv(98.0,60.0);b=sv(131.8,63.4);c=sv(156.0,74.0);d=sv(196.0,72.0);return;}
  if(k<1.5){a=sv(196.0,72.0);b=sv(236.0,70.0);c=sv(256.0,62.0);d=sv(290.0,62.0);return;}
  if(k<2.5){a=sv(290.0,62.0);b=sv(310.0,62.0);c=sv(328.0,70.0);d=sv(328.0,92.0);return;}
  if(k<3.5){a=sv(328.0,92.0);b=sv(328.0,114.0);c=sv(316.0,116.0);d=sv(296.0,116.0);return;}
  if(k<4.5){a=sv(296.0,116.0);b=sv(262.0,116.0);c=sv(262.0,106.2);d=sv(226.0,108.0);return;}
  if(k<5.5){a=sv(226.0,108.0);b=sv(190.0,109.8);c=sv(190.0,124.0);d=sv(156.0,124.0);return;}
  if(k<6.5){a=sv(156.0,124.0);b=sv(136.0,124.0);c=sv(122.0,130.0);d=sv(122.0,150.0);return;}
  if(k<7.5){a=sv(122.0,150.0);b=sv(122.0,170.0);c=sv(136.0,174.0);d=sv(156.0,174.0);return;}
  if(k<8.5){a=sv(156.0,174.0);b=sv(190.0,174.0);c=sv(186.0,163.8);d=sv(222.0,162.0);return;}
  if(k<9.5){a=sv(222.0,162.0);b=sv(258.0,160.2);c=sv(256.0,172.0);d=sv(290.0,172.0);return;}
  if(k<10.5){a=sv(290.0,172.0);b=sv(310.0,172.0);c=sv(326.0,178.0);d=sv(326.0,200.0);return;}
  if(k<11.5){a=sv(326.0,200.0);b=sv(326.0,222.0);c=sv(312.0,226.0);d=sv(292.0,226.0);return;}
  if(k<12.5){a=sv(292.0,226.0);b=sv(258.0,226.0);c=sv(252.0,216.1);d=sv(214.0,218.0);return;}
  if(k<13.5){a=sv(214.0,218.0);b=sv(176.0,219.9);c=sv(180.0,234.0);d=sv(146.0,234.0);return;}
  if(k<14.5){a=sv(146.0,234.0);b=sv(126.0,234.0);c=sv(114.0,240.0);d=sv(114.0,258.0);return;}
  if(k<15.5){a=sv(114.0,258.0);b=sv(114.0,276.0);c=sv(128.0,280.0);d=sv(146.0,280.0);return;}
  if(k<16.5){a=sv(146.0,280.0);b=sv(186.0,280.0);c=sv(214.1,276.2);d=sv(258.0,274.0);return;}
  a=sv(258.0,274.0);b=sv(301.9,271.8);c=sv(328.8,259.8);d=sv(368.0,252.0); }
vec2 pathAt(float u){ float k=floor(u*18.), t=fract(u*18.); if(u>=1.){k=17.;t=1.;} vec2 a,b,c,d; piece(k,a,b,c,d); return cub(a,b,c,d,t); }
float sdCheck(vec2 p){ vec2 c=sv(388.,248.); return min(sdSeg(p,c+su(1.)*vec2(-9.,0.),c+su(1.)*vec2(-2.,-7.)),sdSeg(p,c+su(1.)*vec2(-2.,-7.),c+su(1.)*vec2(10.,8.)))-su(2.4); }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  C=over(C,halo(P,vec2(0.),.9,.14));
  float best=1e9, ub=0.; vec2 bc=vec2(0.);
  for(int j=0;j<18;j++){ vec2 a,b,c,d; piece(float(j),a,b,c,d);
    vec2 lo=min(min(a,b),min(c,d)), hi=max(max(a,b),max(c,d)); if(length(P-clamp(P,lo,hi))>best) continue;
    vec2 prev=a;
    for(int i=1;i<=6;i++){ float t=float(i)/6.; vec2 cur=cub(a,b,c,d,t); vec2 q=segC(P,prev,cur); float dd=length(P-q);
      if(dd<best){best=dd; bc=q; ub=(float(j)+t)/18.;} prev=cur; } }
  float R=su(15.), sd=best-R;
  C=over(C,glowSD(sd,MINT,.03,.18));
  if(sd<PX){ vec3 n=tubeN(P,bc,R); vec4 g=glassN(n,MINT,sd,.22);
    float peri=.5+.5*sin(ub*TAU*16.-T*2.2);                                   /* gentle peristaltic wave */
    float lumen=exp(-pow(best/(R*.35),2.));
    g.rgb+=(mix(TEAL,LITE,peri)*.22+LITE*lumen*.25)*aa(sd); g.a=max(g.a,(.4+.15*peri)*aa(sd)); C=over(C,g); }
  for(int i=0;i<6;i++){ float fi=float(i); float u=fract(T/20.+fi/6.); vec2 q=pathAt(u);
    vec3 col=mod(fi,4.)<.5?GOLD:(mod(fi,4.)<1.5?MINT:(mod(fi,4.)<2.5?ICE:LITE));
    C=over(C,glowSD(length(P-q)-su(6.),col,.02,.4)); C=over(C,ball(P,q,su(6.+mod(fi,2.)*1.5),col,60.)); }
  C=over(C,leafAt(P,sv(38.,52.)+vec2(0.,.02*sin(T*1.1)),.3,.36,MINT));
  vec2 cc=sv(388.,248.); float pul=.5+.5*sin(T*TAU/2.6);
  C=over(C,glowSD(length(P-cc)-su(20.),MINT,.03,.25+.2*pul));
  C=over(C,ball(P,cc,su(20.),MINT,55.));
  float ck=sdCheck(P); C=over(C,vec4(DEEP*aa(ck),aa(ck)));
  C=over(C,twinkle(P,sv(300.,50.),.8,1.));
  finish(C);
}`;

/* ---- play: a glossy ball bouncing with squash, spin and a shadow, gold trajectories, stars */
LIB_SCENES.play = LIB + `
float arcQ(vec2 P,vec2 a,vec2 b,vec2 c,out float u){ float best=1e9; u=0.;
  for(int i=0;i<14;i++){ float t0=float(i)/14., t1=t0+1./14.; vec2 p0=mix(mix(a,b,t0),mix(b,c,t0),t0), p1=mix(mix(a,b,t1),mix(b,c,t1),t1);
    float d=sdSeg(P,p0,p1); if(d<best){best=d; u=t0;} } return best; }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  float f=fract(T/1.6), hgt=1.-pow(2.*f-1.,2.), sq=exp(-pow(min(f,1.-f)/.045,2.));
  vec2 BC=sv(220.,224.-150.*hgt+48.*.12*sq); vec2 S=vec2(1.+.13*sq,1.-.13*sq);
  C=over(C,halo(P,sv(220.,170.),.8,.16));
  float u1,u2; float d1=arcQ(P,sv(40.,250.),sv(110.,40.),sv(180.,150.),u1), d2=arcQ(P,sv(400.,250.),sv(330.,40.),sv(260.,150.),u2);
  C=over(C,dashLine(d1,u1,GOLD,su(1.6),7.,.6)); C=over(C,dashLine(d2,u2,GOLD,su(1.6),7.,.6));
  float g=exp(-pow((P.y-sv(0.,272.).y)/su(1.),2.))*smoothstep(1.32,1.1,abs(P.x)); C=over(C,vec4(ICE*g*.4,g*.35));
  C=over(C,shadowAt(P,sv(220.,270.),vec2(su(46.)*(1.-.45*hgt),su(8.)*(1.-.3*hgt)),.45*(1.-.55*hgt)));
  vec2 q=(P-BC)/S; float R=su(48.); float sd=(length(q)-R)*min(S.x,S.y);
  C=over(C,glowSD(sd,MINT,.04,.18));
  if(sd<PX){ vec3 n=sphN(q,vec2(0.),R);
    vec3 m=n; m.xy=rot(T*2.4)*m.xy;
    float s1=abs(m.x), s2=abs(dot(m,normalize(vec3(0.,1.,.35)))-.45), s3=abs(dot(m,normalize(vec3(0.,-1.,.35)))-.45);
    float seam=smoothstep(.06,.03,min(s1,min(s2,s3)));
    vec3 col=mix(TEAL,LITE,clamp(.5+.6*n.y-.3*n.x,0.,1.));
    vec4 b=solidN(n,mix(col,DEEP,seam*.75),sd,70.); C=over(C,b); }
  C=over(C,twinkle(P,sv(90.,90.),1.,0.)); C=over(C,twinkle(P,sv(350.,80.),1.2,1.)); C=over(C,twinkle(P,sv(70.,190.),.7,2.));
  C=over(C,twinkle(P,sv(380.,190.),.8,3.)); C=over(C,twinkle(P,sv(300.,40.),.6,4.));
  finish(C);
}`;

/* ---- milestones: glass steps lighting as a glowing orb climbs to a gold star */
LIB_SCENES.stairs = LIB + `
float s_i; float sdStep(vec2 p){ float i=s_i, x=50.+i*68.+32., h=40.+i*38.; return sdBox(p-sv(x,270.-h*.5),vec2(su(32.),su(h*.5)),su(10.)); }
vec2 qb(vec2 a,vec2 b,vec2 c,float t){ return mix(mix(a,b,t),mix(b,c,t),t); }
vec2 pathAt(float u){ return u<.5?qb(sv(70.,215.),sv(150.,170.),sv(220.,155.),u*2.):qb(sv(220.,155.),sv(290.,140.),sv(380.,60.),u*2.-1.); }
float sdStar(vec2 p){ vec2 q=rot(.12*sin(uT*.9))*(p-sv(396.,44.)-vec2(0.,.02*sin(uT*1.2))); return sdStar5(q,su(20.),.45); }
void main(){
  PX=pixelSize(); vec2 P=framePos(); float T=uT; vec4 C=vec4(0.);
  C=over(C,halo(P,sv(350.,80.),.75,.18));
  C=over(C,shadowAt(P,sv(218.,272.),vec2(1.15,.03),.35));
  float u=fract(T/4.5); vec2 orb=pathAt(u); float ox=orb.x*150.+220.;
  for(int i=0;i<5;i++){ float fi=float(i); s_i=fi;
    float on=smoothstep(30.,0.,abs(ox-(50.+fi*68.+32.)))+.15;
    float sd=sdStep(P);
    if(sd<PX){ vec3 n=BN(sdStep,P,su(10.),1.); vec4 g=glassN(n,MINT,sd,.14+.3*on);
      float top=exp(-pow((P.y-sv(0.,270.-40.-fi*38.).y)/su(5.),2.));
      g.rgb+=(MINT*.3*on+LITE*top*.25*on)*aa(sd); g.a=max(g.a,(.28+.35*on)*aa(sd)); C=over(C,g); } }
  float best=1e9, ub=0.; vec2 pr=pathAt(0.);
  for(int i=1;i<=20;i++){ float t=float(i)/20.; vec2 cu=pathAt(t); float d=sdSeg(P,pr,cu); if(d<best){best=d; ub=t;} pr=cu; }
  C=over(C,dashLine(best,ub,MINT,su(1.6),12.,.5));
  for(int i=1;i<6;i++){ vec2 tp=pathAt(max(u-float(i)*.012,0.)); float tr=exp(-dot(P-tp,P-tp)/pow(su(5.),2.))*(1.-float(i)/6.)*.5; C=over(C,vec4(ICE*tr,tr)); }
  C=over(C,glowSD(length(P-orb)-su(8.),ICE,.03,.6)); C=over(C,ball(P,orb,su(8.),ICE,60.));
  float st=sdStar(P);
  C=over(C,glowSD(st,GOLD,.05,.45+.2*sin(T*2.)));
  if(st<PX){ vec3 n=BN(sdStar,P,su(8.),1.); C=over(C,solidN(n,GOLD,st,60.)); }
  C=over(C,twinkle(P,sv(60.,60.),1.,0.)); C=over(C,twinkle(P,sv(120.,110.),.7,2.));
  finish(C);
}`;

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
