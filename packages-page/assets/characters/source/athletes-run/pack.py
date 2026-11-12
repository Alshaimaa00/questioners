import numpy as np, json, sys
from PIL import Image
from scipy import ndimage as nd
from skimage.transform import resize
O=sys.argv[1]
J=json.load(open("flows.json")); Z=np.load("flows.npz"); R=json.load(open("reg.json")); X0,X1,Y0,Y1=J['crop']
CW,CH=X1-X0,Y1-Y0; S2=2; TW,TH=CW*S2,CH*S2; COLS=6
def tone(l):
    L=nd.gaussian_filter(l,1.2); T=L+2.4*(L-nd.gaussian_filter(L,4))+1.0*(L-nd.gaussian_filter(L,10))
    T=np.clip(T/np.percentile(T[T>.03],95),0,1)**.8; return T
atlas=np.zeros((TH*5,TW*COLS),np.uint8); FF=np.zeros((CH*5,CW*COLS,3),np.uint8); FB=FF.copy()
FF[...]=128; FB[...]=128
for k in range(30):
    l=np.load(f"crop{k:02d}.npy"); t=resize(tone(l),(TH,TW),anti_aliasing=True)
    r,c=divmod(k,COLS); atlas[r*TH:(r+1)*TH,c*TW:(c+1)*TW]=(np.clip(t,0,1)*255).astype(np.uint8)
    for arr,key in ((FF,f"F{k}"),(FB,f"B{k}")):
        f=Z[key]/3.0                      # tile px at SC=3 -> canvas units
        f=np.stack([resize(f[...,i],(CH,CW)) for i in (0,1)],-1)
        arr[r*CH:(r+1)*CH,c*CW:(c+1)*CW,0]=np.clip(128+4*f[...,0],0,255).round().astype(np.uint8)
        arr[r*CH:(r+1)*CH,c*CW:(c+1)*CW,1]=np.clip(128+4*f[...,1],0,255).round().astype(np.uint8)
Image.fromarray(atlas).save(f"{O}/poses.webp",quality=88,method=6)
Image.fromarray(FF).save(f"{O}/flow-next.png",optimize=True); Image.fromarray(FB).save(f"{O}/flow-prev.png",optimize=True)
# the ball: from frame 1, cleaned, in canvas units (scale 1 there), drawn at 2 px per unit
l0=np.load("lum00.npy"); B=json.load(open("ball2.json")); bx,by=B["0"][0],B["0"][1]; rr=14
bl=l0[by-rr:by+rr,bx-rr:bx+rr].copy(); yy,xx=np.mgrid[-rr:rr,-rr:rr]; bl*=np.clip((13-np.hypot(xx+.5,yy+.5))/1.5,0,1)
bt=resize(tone(bl),(rr*2*S2,rr*2*S2),anti_aliasing=True); Image.fromarray((np.clip(bt,0,1)*255).astype(np.uint8)).save(f"{O}/ball.webp",quality=90)
# the ball's path, one point per frame (crop units, its centre), smoothed before the kick; contact at frame 23
M=R['meta']; P=[]
for k in range(30):
    b=M[str(k)]['ball']; P.append(None if b is None else [b[0]-X0,b[1]-Y0])
pre=np.array(P[:23]); sm=pre.copy()
for k in range(23):
    w=[j for j in range(max(0,k-2),min(23,k+3))]; sm[k]=pre[w].mean(0)
sm[22]=pre[22]           # the contact point exactly where the storyboard puts it
path=[[round(float(a),1) for a in p] for p in sm]+[[round(float(a),1) for a in P[23]],[round(float(a),1) for a in P[24]]]
meta=dict(n=30,cols=COLS,tw=TW,th=TH,cw=CW,ch=CH,ar=round(CW/CH,4),ball=dict(r=rr,path=path,contact=22))
json.dump(meta,open(f"{O}/../athletes-run-meta.json","w")); print(json.dumps(meta))
# the still image (reduced motion / before the particles): frame 1 in the dots' mint, with its ball, as an RGBA cut-out
l=np.load("crop00.npy"); a=np.clip(tone(l),0,1)
c=np.array(P[0])*3; yy,xx=np.mgrid[0:a.shape[0],0:a.shape[1]]
blb=resize(tone(bl),(rr*2*3,rr*2*3)); y0=int(c[1]-rr*3); x0=int(c[0]-rr*3)
a[y0:y0+rr*6,x0:x0+rr*6]=np.maximum(a[y0:y0+rr*6,x0:x0+rr*6],np.clip(blb,0,1))
rgba=np.dstack([np.full_like(a,220/255),np.full_like(a,253/255),np.full_like(a,237/255),a])
Image.fromarray((rgba*255).astype(np.uint8)).save("still-cutout.png")
