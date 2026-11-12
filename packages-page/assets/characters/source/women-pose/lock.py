import numpy as np
from PIL import Image
from scipy import ndimage as nd
N=40; F=[np.load(f"crop{k:02d}.npy") for k in range(N)]; SC=3
def figure(l):
    core=nd.gaussian_filter(l,2)>.08; lab,n=nd.label(core); sz=nd.sum(core,lab,range(1,n+1))
    keep=np.zeros_like(core)
    for i in np.argsort(sz)[::-1][:3]:
        if sz[i]>sz.max()*.02: keep|=lab==i+1
    return l*nd.binary_dilation(keep,iterations=9)
F=[figure(l) for l in F]
St=np.stack(F); med=np.median(St,0)
var=np.max(np.abs(nd.gaussian_filter(St,(0,3,3))-nd.gaussian_filter(med,3)[None]),0)
M=nd.gaussian_filter((var>float(__import__('sys').argv[1])).astype(float),1)>.2
M=nd.binary_opening(M,iterations=4)
M=nd.binary_closing(M,iterations=10); M=nd.binary_fill_holes(M); M=nd.binary_dilation(M,iterations=10)
# her torso below the shoulders, contour included, is never taken from a frame: the median body (in which the arm, mostly raised,
# is absent) filled, its largest part, below the shoulder line, grown a little to hold the contour
mb=nd.binary_closing(nd.gaussian_filter(F[19],3)>.05,iterations=8)   # frame 20: arm raised, torso outline complete
for yb in range(mb.shape[0]-int(.05*mb.shape[0]),mb.shape[0]):
    qb=np.nonzero(mb[yb])[0]
    if len(qb)>1: mb[yb,qb.min():qb.max()+1]=True
H,W=med.shape; tor=nd.binary_fill_holes(mb); yy=np.mgrid[0:H,0:W][0]; tor&=yy>int(.44*H)
lab,nl=nd.label(tor); tor=lab==1+int(np.argmax(nd.sum(tor,lab,range(1,nl+1))))
xs_=np.nonzero(tor.any(0))[0]; x0_,x1_=xs_.min(),xs_.max(); xx=np.mgrid[0:H,0:W][1]
tor&=~((yy<int(.62*H))&(xx>x0_+.74*(x1_-x0_)))      # not that frame's raised upper arm beside the shoulder
tor=nd.binary_opening(tor,iterations=6); lab,nl=nd.label(tor); tor=lab==1+int(np.argmax(nd.sum(tor,lab,range(1,nl+1)))); tor=nd.binary_dilation(tor,iterations=6); np.save('torso.npy',tor)
Mf=nd.gaussian_filter(M.astype(float),8)*(1-nd.gaussian_filter(tor.astype(float),4)); np.save('motionmask.npy',M)
H,W=med.shape
# the head and neck and the hair around them are LOCKED too (Nov 2026): taken from the rest pose (frame 1, crisp, not an average),
# only the arm's sweep and the hair beside her shoulder where the hand touches it keep moving. Head zone: above the shoulder line,
# left of the hair the hand reaches (x < .6 of the width); it fades into the moving zone over a few pixels
yy,xx=np.mgrid[0:H,0:W]
head=(yy<.44*H)&(xx<.6*W); headf=nd.gaussian_filter(head.astype(float),5)
Mf=Mf*(1-headf); base=med*(1-headf)+F[0]*headf
np.save("headf.npy",headf)
for k in range(N):
    o=Mf*F[k]+(1-Mf)*base; np.save(f"lock{k:02d}.npy",np.clip(o,0,1).astype(np.float32))
v=np.stack([med*.8+.0]*3,-1); v[...,0]=np.maximum(v[...,0],Mf*.7)
Image.fromarray((np.clip(v,0,1)*255).astype(np.uint8)).resize((W//2,H//2)).save("mask.png")
o=Image.new("L",(W//SC*10,H//SC*4))
for k in range(N): o.paste(Image.fromarray((np.load(f"lock{k:02d}.npy")*255).astype(np.uint8)).resize((W//SC,H//SC)),((k%10)*(W//SC),(k//10)*(H//SC)))
o.save("locked.png")
