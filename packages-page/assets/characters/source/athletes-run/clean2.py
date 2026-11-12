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
    txt[z]=tz; txt=nd.binary_dilation(txt,iterations=2)
    m&=~txt   # only the letters (white, unsaturated), so a foot overlapping the text is kept
    m[-3:,:]=False; m[:, :2]=False; m[:, -2:]=False
    lum=lum*m
    out[k]=dict(lum=lum)
    np.save(f"lum{k:02d}.npy",lum)
