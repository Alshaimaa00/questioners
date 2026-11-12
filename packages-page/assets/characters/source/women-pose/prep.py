import numpy as np, json
from PIL import Image
from scipy import ndimage as nd
from skimage.registration import phase_cross_correlation
P=json.load(open("panels.json")); A=np.asarray(Image.open("../../images/29.webp").convert("RGB")).astype(float)
F=[]
for k,(x0,y0,x1,y1) in enumerate(P):
    a=A[y0:y1,x0:x1]; G=a[...,1]; bg=np.median(G[200:,:]) if False else nd.median_filter(G,size=41)
    l=np.clip((G-bg)/(255-bg),0,1)
    l[:68,:80]=0                                  # the frame number and time
    l[:,:3]=0; l[:,-3:]=0; l[-3:,:]=0; l[:3,:]=0
    F.append(l)
# align every frame to frame 1 on the still parts of her body (her left side, viewer-left, and the waist)
ref=F[0]; H,W=ref.shape; m=np.zeros_like(ref); m[150:330,5:85]=1
S=[]
for k in range(20):
    sh,_,_=phase_cross_correlation(ref*m, F[k]*m, upsample_factor=10); S.append(sh.tolist())
    F[k]=nd.shift(F[k], sh, order=3, mode='constant')
print([[round(a,1) for a in s] for s in S])
Y0,Y1,X0,X1=62,340,0,156
SC=3
for k in range(20):
    c=np.clip(F[k][Y0:Y1,X0:X1],0,1); c=nd.zoom(c,SC,order=3); np.save(f"crop{k:02d}.npy",np.clip(c,0,1).astype(np.float32))
json.dump(dict(crop=[X0,X1,Y0,Y1],SC=SC),open("crop.json","w"))
ims=[Image.fromarray((np.load(f"crop{k:02d}.npy")*255).astype(np.uint8)).resize(((X1-X0),(Y1-Y0))) for k in range(20)]
o=Image.new("L",((X1-X0)*10,(Y1-Y0)*2))
for k,i in enumerate(ims): o.paste(i,((k%10)*(X1-X0),(k//10)*(Y1-Y0)))
o.save("crops.png")
