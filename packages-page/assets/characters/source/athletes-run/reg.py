import numpy as np, json
from PIL import Image
from scipy import ndimage as nd
M={int(k):v for k,v in json.load(open("meas.json")).items()}
B={int(k):v for k,v in json.load(open("ball2.json")).items()}
rows=[range(r*5,r*5+5) for r in range(6)]
S={};G={};HX={}
for r in rows:
    hs=[M[k]['bot']-M[k]['top'] for k in r]; g=max(M[k]['bot'] for k in r); sc=130/np.median(hs)
    for k in r: S[k]=sc; G[k]=g
for k in range(30):
    l=np.load(f"fig{k:02d}.npy"); t=M[k]['top']; band=l[t:t+16]; ys,xs=np.nonzero(band>.2)
    HX[k]=float(np.median(xs))
hx=np.array([HX[k] for k in range(30)])
# a gentle circular smoothing of the head's x (keeps slow framing drift, removes frame-to-frame jitter)
sm=np.array([np.mean([hx[(k+d)%30] for d in range(-3,4)]) for k in range(30)])
SC=3.0; CH=150; GY=143; HXC=110; CW=230      # canvas (in normalized src units): height 150, ground at 143, head x at 62, width 128
TH=int(CH*SC); TW=int(CW*SC)
meta={}
for k in range(30):
    l=np.load(f"fig{k:02d}.npy"); s=S[k]
    # canvas -> panel: x_p = (x_c - HXC)/s + jitter-corrected head x ; y_p = (y_c - GY)/s + ground
    ox=hx[k]-(hx[k]-sm[k])*0 ; ox=sm[k] + (hx[k]-sm[k])  # placeholder (overwritten below)
    ox=hx[k]   # align the head's x per frame to the smoothed path: x_p = (x_c-HXC)/s + hx[k] - (hx[k]-sm[k]) ... see below
    ox=hx[k]
    def c2p(yc,xc): return ((yc/SC-GY)/s+G[k], (xc/SC-HXC)/s+ox + (hx[k]-sm[k])*0)
    yy,xx=np.mgrid[0:TH,0:TW].astype(float); py,px=c2p(yy,xx)
    out=nd.map_coordinates(l,[py,px],order=3,mode='constant',cval=0)
    out=np.clip(out,0,1)
    # the storyboard's thin ground-glow line under the feet: removed where nothing of the figure is just above it
    gy=int(GY*SC); above=nd.maximum_filter(out,size=(1,7))
    for y in range(gy-int(4*SC), min(TH, gy+int(4*SC))):
        a=above[max(0,y-int(9*SC)):y-int(3*SC)].max(0) if y-int(3*SC)>0 else np.zeros(TW)
        out[y]*=np.clip((a-.08)/.12,0,1)
    np.save(f"reg{k:02d}.npy",out.astype(np.float32))
    bc=None
    if B[k]: bc=[(B[k][0]-ox)*s+HXC, (B[k][1]-G[k])*s+GY]   # ball centre in canvas units
    meta[k]=dict(s=s,ox=ox,g=G[k],ball=bc)
json.dump(dict(meta=meta,CH=CH,CW=CW,GY=GY,HXC=HXC,SC=SC),open("reg.json","w"))
print({k:(round(S[k],3),round(hx[k]-sm[k],1)) for k in range(30)})
ims=[Image.fromarray((np.load(f"reg{k:02d}.npy")*255).astype(np.uint8)).resize((TW//2,TH//2)) for k in range(30)]
o=Image.new("L",(TW//2*10,TH//2*3))
for k,i in enumerate(ims): o.paste(i,((k%10)*(TW//2),(k//10)*(TH//2)))
d=Image.new("RGB",o.size); d.paste(o)
from PIL import ImageDraw
dr=ImageDraw.Draw(d)
for k in range(30):
    x=(k%10)*(TW//2); y=(k//10)*(TH//2); dr.line([(x,y+GY*SC/2),(x+TW//2,y+GY*SC/2)],fill=(255,0,0)); dr.line([(x+HXC*SC/2,y),(x+HXC*SC/2,y+40)],fill=(0,160,255))
    if meta[k]['ball']: bx,by=meta[k]['ball']; dr.ellipse([x+bx*SC/2-6,y+by*SC/2-6,x+bx*SC/2+6,y+by*SC/2+6],outline=(255,200,0))
    dr.text((x+4,y+4),str(k+1),fill=(255,255,0))
d.save("regsheet.png")
