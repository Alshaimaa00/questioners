import numpy as np, json, sys
from PIL import Image
from scipy import ndimage as nd
from skimage.transform import resize
O=sys.argv[1]; Z=np.load("flows.npz"); SC=3; N=40
C=[np.load(f"lock{k:02d}.npy") for k in range(N)]
U=np.zeros_like(C[0])
for c in C: U=np.maximum(U,c)
ys,xs=np.nonzero(nd.gaussian_filter(U,2)>.12)
y0=max(0,ys.min()//SC-2); y1=min(C[0].shape[0]//SC,ys.max()//SC+3); x0=max(0,xs.min()//SC-2); x1=min(C[0].shape[1]//SC,xs.max()//SC+3)
FILL=float(sys.argv[2]) if len(sys.argv)>2 else .1
x0,x1,y0,y1=38,150,38,200   # the approved framing (kept fixed, so her size on the card does not change)
CW,CH=x1-x0,y1-y0; S2=2; TW,TH=CW*S2,CH*S2; COLS=8; ROWS=5
print("box units",x0,x1,y0,y1,CW,CH)
def tone(l):
    L=nd.gaussian_filter(l,1.2); T=L+2.4*(L-nd.gaussian_filter(L,4))+1.0*(L-nd.gaussian_filter(L,10))
    return np.clip(T/np.percentile(T[T>.03],95),0,1)**.8
# her approved dot finish: the current card's dot light distribution (women-tone.webp sampled at card size)
ref=np.asarray(Image.open("/Users/dunon/Desktop/dev/questioners-MulhimWebSite/packages-page/assets/characters/women-tone.webp").convert("L").resize((71,125),Image.LANCZOS)).astype(float)/255
ref=np.sort(ref[ref>=.07]); q=np.linspace(0,1,256); rq=np.quantile(ref,q)
atlas=np.zeros((TH*ROWS,TW*COLS),np.uint8); FF=np.full((CH*ROWS,CW*COLS,3),128,np.uint8); FB=FF.copy()
for k in range(N):
    l=C[k][y0*SC:y1*SC,x0*SC:x1*SC]; t=resize(tone(l),(TH,TW),anti_aliasing=True)
    if k==0: TOR0=resize(np.load("torso.npy")[y0*SC:y1*SC,x0*SC:x1*SC].astype(float),t.shape)>.5; MM0=resize(np.load("motionmask.npy")[y0*SC:y1*SC,x0*SC:x1*SC].astype(float),t.shape)>.5
    # small loose fragments of line beside her waist (left from the hanging arm's outline): removed, so nothing floats there
    side=MM0&~nd.binary_erosion(TOR0,iterations=6)&(np.mgrid[0:t.shape[0],0:t.shape[1]][0]>.45*t.shape[0])
    br=nd.gaussian_filter(t,1)>.12; lab,nl=nd.label(br)
    if nl:
        szs=nd.sum(br,lab,range(1,nl+1)); ins=nd.sum(side&br,lab,range(1,nl+1))
        bad=np.isin(lab,1+np.nonzero((szs<160)&(ins>.6*szs))[0]); t=t*~nd.binary_dilation(bad,iterations=2)
    # a faint even fill inside her silhouette (the storyboard's body is sparser than her approved figure): the body is the
    # filled, slightly eroded outline; the fill sits just above the dot threshold, varied, so the inside reads as fine dim dots
    bm=nd.binary_closing(nd.gaussian_filter(t,3)>.05,iterations=6)
    for y in range(bm.shape[0]-int(.06*bm.shape[0]),bm.shape[0]):          # close the outline along the bottom edge (her hips run off the frame)
        xs=np.nonzero(bm[y])[0]
        if len(xs)>1: bm[y,xs.min():xs.max()+1]=True
    body=nd.binary_fill_holes(bm); body=nd.binary_erosion(body,iterations=3)
    if k==0:
        # her torso is locked, so one torso fill serves every frame: below the shoulders it is taken from a frame with the arm raised
        # (frame 20, where her torso's outline is complete on both sides), above them from the rest pose
        def bodyof(j):
            tt=resize(tone(C[j][y0*SC:y1*SC,x0*SC:x1*SC]),(TH,TW),anti_aliasing=True); b=nd.binary_closing(nd.gaussian_filter(tt,3)>.05,iterations=6)
            for yb in range(b.shape[0]-int(.06*b.shape[0]),b.shape[0]):
                qb=np.nonzero(b[yb])[0]
                if len(qb)>1: b[yb,qb.min():qb.max()+1]=True
            return nd.binary_erosion(nd.binary_fill_holes(b),iterations=3)
        up=bodyof(19); yy=np.mgrid[0:TH,0:TW][0]; cut=int(.4*TH)
        # below the shoulders keep only the torso (the largest part), not the loop of the raised arm
        lo=up&(yy>=cut); lab,nl=nd.label(lo); lo=lab==1+int(np.argmax(nd.sum(lo,lab,range(1,nl+1))))
        xx=np.mgrid[0:TH,0:TW][1]; xr=int(.74*TW)   # her shoulder line on the arm's side
        lo&=~((yy<int(.62*TH))&(xx>xr))          # not the raised upper arm of that frame
        BODY0=(body&(yy<cut)&(xx<=xr))|lo
    body=BODY0
    # the arm's own fill (the storyboard draws the arm as an outline): the arm outline closed over its width (a thin closing, so the
    # wider loop between the raised arm and the head is not filled), outside the torso and away from the head
    if k==0: TOR=resize(np.load("torso.npy")[y0*SC:y1*SC,x0*SC:x1*SC].astype(float),t.shape)>.5; MM2=resize(np.load("motionmask.npy")[y0*SC:y1*SC,x0*SC:x1*SC].astype(float),t.shape)>.5
    # the arm's own fill (the storyboard draws it as an outline): every enclosed gap of the outline in the moving zone, outside the
    # torso, that is no wider than an arm (its distance to the outline at most ~arm half-width) - the forearm, wrist, hand and elbow;
    # the wider space between the raised arm and her head or side is left empty
    ol=nd.gaussian_filter(t,1.2)>.1; cl=nd.binary_closing(ol,iterations=2)
    holes=nd.binary_fill_holes(cl)&~cl
    open_=~nd.binary_fill_holes(cl)
    # gaps open to the outside along a thin arm (a forearm whose outline is not closed): close them a little more
    holes|=(nd.binary_fill_holes(nd.binary_closing(ol,iterations=5))&~nd.binary_closing(ol,iterations=5))
    zone=MM2&~nd.binary_dilation(TOR,iterations=4)&(resize(np.load("headf.npy")[y0*SC:y1*SC,x0*SC:x1*SC],t.shape)<.5)
    holes&=zone; armf=np.zeros_like(holes)
    lab,nl=nd.label(holes); dt=nd.distance_transform_edt(holes)
    for i in range(1,nl+1):
        cm=lab==i
        if cm.sum()>6 and dt[cm].max()<=.05*t.shape[1]: armf|=cm
    # the hand and the thin forearm while the arm rises: their outline strokes (in the arm's zone, below the shoulder) given a little
    # body, closing the hand's ring - so the hand reads as a hand, not a hollow circle
    yy3=np.mgrid[0:t.shape[0],0:t.shape[1]][0]
    stroke=ol&MM2&~nd.binary_dilation(TOR,iterations=1)&(yy3>.42*t.shape[0])
    sf=nd.binary_fill_holes(nd.binary_dilation(stroke,iterations=2))&~ol&~nd.binary_dilation(TOR,iterations=7)
    lab,nl=nd.label(sf); szs=nd.sum(sf,lab,range(1,nl+1)); armf|=np.isin(lab,1+np.nonzero(szs>25)[0])   # no small specks
    armf=nd.binary_dilation(armf,iterations=1)
    rng=np.random.default_rng(7); R7=.7+.6*rng.random(t.shape)
    fill=body*FILL*R7+armf*FILL*1.8*R7      # one fill pattern for every pose (no blinking); the arm filled a little brighter, so it reads solid
    t=np.maximum(t,nd.gaussian_filter(fill,1.0))
    small=resize(t,(125,int(125*CW/CH)),anti_aliasing=True); src=small[small>=.07]
    if k==0: sq=np.quantile(src,q)            # one brightness mapping for all poses (from the rest pose): no flicker between them
    m=t>=.07; t2=np.zeros_like(t); t2[m]=np.interp(t[m],sq,rq)
    r,c=divmod(k,COLS); atlas[r*TH:(r+1)*TH,c*TW:(c+1)*TW]=(np.clip(t2,0,1)*255).astype(np.uint8)
    for arr,key in ((FF,f"F{k}"),(FB,f"B{k}")):
        f=Z[key]/SC; f=np.stack([resize(f[...,i],(C[0].shape[0]//SC,C[0].shape[1]//SC)) for i in (0,1)],-1)[y0:y1,x0:x1]
        arr[r*CH:(r+1)*CH,c*CW:(c+1)*CW,0]=np.clip(128+4*f[...,0],0,255).round().astype(np.uint8)
        arr[r*CH:(r+1)*CH,c*CW:(c+1)*CW,1]=np.clip(128+4*f[...,1],0,255).round().astype(np.uint8)
Image.fromarray(atlas).save(f"{O}/poses.webp",quality=90,method=6)
# blue channel of flow-next: how much each place moves (0 = locked torso and head, 255 = the arm's and hair's zone) - the engine keeps
# one permanent set of dots wherever it is low, and exchanges pose dots only where it is high
Mw=np.load("motionmask.npy").astype(float); tw_=np.load("torso.npy").astype(float); hf=np.load("headf.npy")
wg=nd.gaussian_filter(Mw,8)*(1-nd.gaussian_filter(tw_,4))*(1-hf); wg=resize(wg[y0*SC:y1*SC,x0*SC:x1*SC],(CH,CW))
for k in range(N):
    r,c=divmod(k,COLS); FF[r*CH:(r+1)*CH,c*CW:(c+1)*CW,2]=(np.clip(wg,0,1)*255).astype(np.uint8)
Image.fromarray(FF).save(f"{O}/flow-next.png",optimize=True); Image.fromarray(FB).save(f"{O}/flow-prev.png",optimize=True)
# still (reduced motion): frame 1 in her pink
a=resize(tone(C[0][y0*SC:y1*SC,x0*SC:x1*SC]),(CH*3,CW*3)); a=np.clip(a*1.1,0,1)
rgba=np.dstack([np.full_like(a,1.),np.full_like(a,214/255),np.full_like(a,231/255),a])
Image.fromarray((rgba*255).astype(np.uint8)).save(f"{O}/still.webp",quality=90,method=6)
print(dict(n=N,cols=COLS,tw=TW,th=TH,cw=CW,ch=CH))
