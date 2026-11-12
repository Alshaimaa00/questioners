import numpy as np, json, time
from scipy import ndimage as nd
from skimage.registration import optical_flow_tvl1
from skimage.transform import resize
SC=3; X0,X1,Y0,Y1=16,172,6,150     # the crop, in canvas units
KEYS=list(range(30))
T={}
for k in range(30):
    l=np.load(f"reg{k:02d}.npy")[Y0*SC:Y1*SC, X0*SC:X1*SC]; T[k]=l; np.save(f"crop{k:02d}.npy",l)
H,W=T[0].shape; FS=2   # flow computed at 1/2 of the tile resolution (1.5 px per unit)
def prep(a): return nd.gaussian_filter(resize(a,(H//FS,W//FS),anti_aliasing=True),1.6)
def flow(a,b):
    v,u=optical_flow_tvl1(prep(a),prep(b),attachment=8,tightness=.3,num_warp=8,num_iter=40,tol=1e-4,prefilter=True)
    return np.stack([u,v],-1)*FS   # (dx,dy) in tile px, on the half-res grid
t0=time.time(); F={}; Bk={}
for i,k in enumerate(KEYS):
    n=KEYS[(i+1)%len(KEYS)]
    F[k]=flow(T[k],T[n]); Bk[n]=flow(T[n],T[k])
    print(k+1,"->",n+1, round(time.time()-t0,1), np.abs(F[k]).max().round(1))
np.savez("flows.npz",**{f"F{k}":F[k] for k in F},**{f"B{k}":Bk[k] for k in Bk})
json.dump(dict(KEYS=KEYS,crop=[X0,X1,Y0,Y1],SC=SC,FS=FS,H=H,W=W),open("flows.json","w"))
