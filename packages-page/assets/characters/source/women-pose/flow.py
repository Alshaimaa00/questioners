import numpy as np, json, time
from scipy import ndimage as nd
from skimage.registration import optical_flow_tvl1
from skimage.transform import resize
T={k:np.load(f"lock{k:02d}.npy") for k in range(40)}; H,W=T[0].shape; FS=2
def prep(a): return nd.gaussian_filter(resize(a,(H//FS,W//FS),anti_aliasing=True),1.6)
def flow(a,b):
    v,u=optical_flow_tvl1(prep(a),prep(b),attachment=8,tightness=.3,num_warp=8,num_iter=40,tol=1e-4,prefilter=True)
    return np.stack([u,v],-1)*FS
F={};B={}; t0=time.time()
for k in range(40):
    n=(k+1)%40; F[k]=flow(T[k],T[n]); B[n]=flow(T[n],T[k])
print("done",round(time.time()-t0))
np.savez("flows.npz",**{f"F{k}":F[k] for k in F},**{f"B{k}":B[k] for k in B})
json.dump(dict(KEYS=list(range(40)),SC=3,FS=FS,H=H,W=W),open("flows.json","w"))
