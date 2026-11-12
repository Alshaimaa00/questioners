import numpy as np, json
from PIL import Image
from scipy import ndimage as nd
B=json.load(open("ball.json")); B={int(k):v for k,v in B.items()}
B[22]=[141,121,1]; B[25]=[239,67,1]
for k in (26,27,28,29): B[k]=None
json.dump(B,open("ball2.json","w"))
M={}
for k in range(30):
    l=np.load(f"lum{k:02d}.npy"); h,w=l.shape; yy,xx=np.mgrid[0:h,0:w]
    if B[k]:
        bx,by=B[k][0],B[k][1]; r=13.5
        cut=(xx-bx)**2+(yy-by)**2<r*r
        if k in (23,24,25): cut|=(xx>bx-62)&(xx<bx)&(np.abs(yy-by)<9)&(l<.75)   # the flight trail (not the foot's bright core)
        l=l*(~cut)
    # keep only the figure: the largest connected bright region, plus everything near it (the ribbons, the sparkle)
    core=nd.gaussian_filter(l,1.5)>.12
    lab,n=nd.label(core); sz=nd.sum(core,lab,range(1,n+1)); big=1+int(np.argmax(sz))
    keep=nd.binary_dilation(lab==big,iterations=6)
    l=l*keep
    np.save(f"fig{k:02d}.npy",l)
    ys,xs=np.where(l>.25)
    M[k]=dict(top=int(ys.min()),bot=int(ys.max()),cx=float((xs*l[ys,xs]).sum()/l[ys,xs].sum()),x0=int(xs.min()),x1=int(xs.max()),h=h,w=w)
    print(k+1,M[k])
json.dump(M,open("meas.json","w"))
# preview sheet
ims=[]
for k in range(30):
    l=np.load(f"fig{k:02d}.npy"); im=Image.fromarray((np.clip(l,0,1)*255).astype(np.uint8)).resize((l.shape[1]*2,l.shape[0]*2)).convert("RGB")
    ims.append(im)
W=max(i.size[0] for i in ims); H=max(i.size[1] for i in ims); o=Image.new("RGB",(W*6,H*5))
for k,i in enumerate(ims): o.paste(i,((k%6)*W,(k//6)*H))
o.save("figs.png")
