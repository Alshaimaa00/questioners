import numpy as np, json
from PIL import Image
from scipy import ndimage as nd
from skimage.feature import match_template
P=json.load(open("panels.json")); sb=np.asarray(Image.open("../../images/28.webp").convert("RGB")).astype(float)
out={}
ball_t=None
for k,(x0,y0,x1,y1) in enumerate(P):
    a=sb[y0:y1,x0:x1]; h,w=a.shape[:2]
    R,G,B=a[...,0],a[...,1],a[...,2]
    bg=nd.median_filter(G, size=31)            # local background
    lum=np.clip((G-bg)/(255-bg+1e-3),0,1)
    m=np.ones((h,w),bool)
    m[:int(.30*h),:int(.30*w)]=False             # frame number + time
    m[:int(.27*h),int(.60*w):]=False             # the pill
    # the bottom-right text: pure-white pixels in the bottom-right zone, dilated
    txt=np.zeros((h,w),bool); z=(slice(int(.76*h),h),slice(int(.6*w),w))
    tz=(R[z]>170)&(np.abs(R[z]-G[z])<28)&(np.abs(B[z]-G[z])<28)
    txt[z]=tz; txt=nd.binary_dilation(txt,iterations=3)
    if txt.any():
        ys,xs=np.where(txt); tb=(xs.min(),ys.min(),xs.max(),ys.max())
        # the text box as a rectangle, a little padded
        m[max(0,tb[1]-2):tb[3]+3, max(0,tb[0]-3):tb[2]+3]=False
    m[-3:,:]=False; m[:, :2]=False; m[:, -2:]=False
    lum=lum*m
    out[k]=dict(lum=lum)
    np.save(f"lum{k:02d}.npy",lum)
# ball template from frame 1 (manually: the ball near (.57w,.8h))
l0=np.load("lum00.npy"); h,w=l0.shape
cy,cx=int(.8*h),int(.575*w)
sub=l0[cy-25:cy+25,cx-25:cx+25]; yy,xx=np.unravel_index(np.argmax(nd.gaussian_filter(sub,4)),sub.shape)
cy,cx=cy-25+yy,cx-25+xx; r=11
tpl=l0[cy-r:cy+r+1,cx-r:cx+r+1]; np.save("balltpl.npy",tpl)
res={}
for k in range(30):
    l=np.load(f"lum{k:02d}.npy"); h,w=l.shape
    c=match_template(l,tpl,pad_input=True); c[:int(.45*h),:]=-1
    j=np.unravel_index(np.argmax(c),c.shape); res[k]=[int(j[1]),int(j[0]),float(c[j])]
json.dump(res,open("ball.json","w")); print(res)
