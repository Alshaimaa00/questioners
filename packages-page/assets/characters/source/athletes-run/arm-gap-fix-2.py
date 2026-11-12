# Athletes run - rear arm continuity, round 2 (10 Nov 2026).
# THE CAUSE (seen on the live card, every 20 ms): during the rear arm's backswing before the kick (index 23-26 = poses 24-27, t ~1.84-2.12 s
# of the 2.4 s loop) the storyboard draws that arm badly: in index 24 and 25 only the UPPER arm is drawn (a stub ending at the elbow - the
# forearm and hand vanish and come back), and in index 23 and 26 the arm is drawn as two "chain links" pinched to a thin neck at the elbow
# (a ring across the joint). The poses either side, index 22 and 27, draw the same arm as one smooth continuous tube.
# FIX: index 23 and 24 get index 22's own arm, index 25 and 26 get index 27's own arm (his drawn dots/outline, unchanged), each turned
# about the shoulder and shifted to where that pose's own arm was (best match to the original arm, or for 24/25 to the arm of the
# neighbour they sit next to), so the swing path is kept. Only the arm region (left of his torso, above his shorts) is replaced,
# feathered at its edge. All other poses and pixels are kept exactly (lossless).
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
P="../../athletes-run/poses.webp"; SRC="../../../../rollback/before-athletes-run-arm-gap/characters/athletes-run/poses.webp"   # the restored original
A0=np.asarray(Image.open(SRC).convert("RGB")); A=A0.copy(); TW,TH,COLS=312,288,6
def tile(a,k): r,c=divmod(k,COLS); return a[r*TH:(r+1)*TH,c*TW:(c+1)*TW]
m=Image.new("L",(TW,TH),0); ImageDraw.Draw(m).polygon([(52,54),(126,54),(126,99),(108,103),(104,132),(52,132)],fill=255)
MR=np.asarray(m)>0; R=nd.gaussian_filter(MR.astype(float),1.5)
yy,xx=np.mgrid[0:TH,0:TW].astype(float); SH=np.array([150.,48.])
def move(img,deg,dx,dy):
    t=np.deg2rad(deg); C,S=np.cos(t),np.sin(t); X=xx-SH[0]-dx; Y=yy-SH[1]-dy
    sx=C*X+S*Y+SH[0]; sy=-S*X+C*Y+SH[1]
    return np.stack([nd.map_coordinates(img[...,ch].astype(float),[sy,sx],order=1,cval=0) for ch in range(img.shape[2])],-1)
def score(a,b):
    a=nd.gaussian_filter(np.asarray(a,float),2.)*MR; b=nd.gaussian_filter(np.asarray(b,float),2.)*MR; return (a*b).sum()/np.sqrt((a*a).sum()*(b*b).sum()+1e-9)
ref={23:tile(A0,23)[...,0], 24:np.roll(tile(A0,23)[...,0],-5,1), 25:np.roll(np.roll(tile(A0,26)[...,0],-1,0),-3,1), 26:tile(A0,26)[...,0]}
for dst,src in ((23,22),(24,22),(25,27),(26,27)):
    S_=tile(A0,src); best=None
    for deg in np.arange(-20,20.1,1.):
        for dx in range(-8,9,2):
            for dy in range(-8,9,2):
                sc=score(move(S_[...,:1],deg,dx,dy)[...,0],ref[dst])
                if best is None or sc>best[0]: best=(sc,deg,dx,dy)
    sc,deg,dx,dy=best
    for dd in (-1,0,1):                                                   # fine shift
        for ee in (-1,0,1):
            s2=score(move(S_[...,:1],deg,dx+dd,dy+ee)[...,0],ref[dst])
            if s2>sc: sc,best=s2,(s2,deg,dx+dd,dy+ee)
    _,deg,dx,dy=best; arm=move(S_,deg,dx,dy); d=tile(A0,dst).astype(float)
    new=d*(1-R[...,None])+arm*R[...,None]
    r,c=divmod(dst,COLS); A[r*TH:(r+1)*TH,c*TW:(c+1)*TW]=np.clip(np.round(new),0,255).astype(np.uint8)
    print("index",dst,"<- arm of index",src,"turn %.0f deg, shift %d,%d, match %.3f"%(deg,dx,dy,best[0]))
Image.fromarray(A).save(P,lossless=True)
d=np.abs(A.astype(int)-A0.astype(int)).max(2); ys,xs=np.nonzero(d)
print("changed px",len(ys),"tiles",sorted({int((y//TH)*COLS+x//TW) for y,x in zip(ys,xs)}))
