# Athletes, kick only (Nov 2026): the storyboard's frames 17-29 (plant by the ball, small backswing, kick at frame 23, short follow-
# through, back to the plant pose) as one loop - frame 29 is as close to frame 17 as two neighbouring frames are, so the loop closes
# without a jump. Motion measured between consecutive poses (and 29 -> 17); poses toned to Men's dot finish (as match_men.py).
import numpy as np, json, sys
from PIL import Image
from scipy import ndimage as nd
from skimage.registration import optical_flow_tvl1
from skimage.transform import resize
O=sys.argv[1]; SEQ=list(range(16,29)); N=len(SEQ)
R=json.load(open("reg.json")); X0,X1,Y0,Y1=16,172,6,150; CW,CH=X1-X0,Y1-Y0; S2=2; TW,TH=CW*S2,CH*S2; COLS=5; ROWS=3; SC=3
T={k:np.load(f"crop{k:02d}.npy") for k in SEQ}; H,W=T[SEQ[0]].shape; FS=2
def prep(a): return nd.gaussian_filter(resize(a,(H//FS,W//FS),anti_aliasing=True),1.6)
def flow(a,b):
    v,u=optical_flow_tvl1(prep(a),prep(b),attachment=8,tightness=.3,num_warp=8,num_iter=40,tol=1e-4,prefilter=True); return np.stack([u,v],-1)*FS
def tone(l):
    L=nd.gaussian_filter(l,1.2); t=L+2.4*(L-nd.gaussian_filter(L,4))+1.0*(L-nd.gaussian_filter(L,10)); return np.clip(t/np.percentile(t[t>.03],95),0,1)**.8
men=np.asarray(Image.open(sys.argv[2]).convert("L").resize((69,125),Image.LANCZOS)).astype(float)/255; ref=np.sort(men[men>=.07]); q=np.linspace(0,1,256); rq=np.quantile(ref,q)
atlas=np.zeros((TH*ROWS,TW*COLS),np.uint8); FF=np.full((CH*ROWS,CW*COLS,3),128,np.uint8); FB=FF.copy(); sq=None
for i,k in enumerate(SEQ):
    n=SEQ[(i+1)%N]; p=SEQ[(i-1)%N]; fwd=flow(T[k],T[n])/SC; bwd=flow(T[k],T[p])/SC
    t=resize(tone(T[k]),(TH,TW),anti_aliasing=True)
    small=resize(t,(114,123),anti_aliasing=True); src=small[small>=.07]
    if sq is None: sq=np.quantile(src,q)        # one brightness mapping for all poses
    m=t>=.07; t2=np.zeros_like(t); t2[m]=np.interp(t[m],sq,rq)
    r,c=divmod(i,COLS); atlas[r*TH:(r+1)*TH,c*TW:(c+1)*TW]=(np.clip(t2,0,1)*255).astype(np.uint8)
    for arr,f in ((FF,fwd),(FB,bwd)):
        f=np.stack([resize(f[...,j],(CH,CW)) for j in (0,1)],-1)
        arr[r*CH:(r+1)*CH,c*CW:(c+1)*CW,0]=np.clip(128+4*f[...,0],0,255).round().astype(np.uint8)
        arr[r*CH:(r+1)*CH,c*CW:(c+1)*CW,1]=np.clip(128+4*f[...,1],0,255).round().astype(np.uint8)
    print(k+1,end=" ",flush=True)
Image.fromarray(atlas).save(f"{O}/poses.webp",quality=90,method=6)
Image.fromarray(FF).save(f"{O}/flow-next.png",optimize=True); Image.fromarray(FB).save(f"{O}/flow-prev.png",optimize=True)
path=[[round(R['meta'][str(k)]['ball'][0]-X0,1),round(R['meta'][str(k)]['ball'][1]-Y0,1)] for k in list(range(16,25))]
print("\npath",json.dumps(path,separators=(",",":")))
