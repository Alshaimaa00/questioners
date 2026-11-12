# Athletes run - rear arm gap (10 Nov 2026): in pose 27 (index 26, the back arm swung behind him during the follow-through) the
# forearm + hand piece hung off the upper arm by one thin diagonal stroke - the arm's lower outline was missing between the forearm
# (~92,104) and the upper arm (~110,88), and the top strand had a ~4 px gap, so on the card the hand read as detached. Fix: the two
# missing outline strokes drawn at the brightness of his own outline there, and the faint inner tone the rest of the arm has between
# them. Only that pose's arm joint changes; every other pose and pixel is kept exactly (saved lossless).
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
P="../../athletes-run/poses.webp"; SRC="../../../../rollback/before-athletes-run-arm-gap/characters/athletes-run/poses.webp"
A=np.asarray(Image.open(SRC).convert("RGB")).copy(); TW,TH,COLS=312,288,6
k=26; r,c=divmod(k,COLS); t=A[r*TH:(r+1)*TH,c*TW:(c+1)*TW,0].astype(float)
SS=4
def draw(fn):
    m=Image.new("L",(TW*SS,TH*SS),0); fn(ImageDraw.Draw(m)); return np.asarray(m.resize((TW,TH),Image.LANCZOS)).astype(float)/255
S=lambda pts:[(x*SS,y*SS) for x,y in pts]
lower=[(90,106),(95,103.5),(100,100.5),(105,97),(109,93.5),(113,90)]    # the arm's lower outline, forearm -> elbow (as wide as the forearm)
upper=[(93,94.5),(98,91.5),(102,87.5),(104.5,83.5)]                     # the top outline, forearm -> elbow
fill=[(91,95.5),(98,91.5),(102,87.5),(104.5,83.5),(108,86),(113,90),(105,97),(100,100.5),(91,105)]
F=draw(lambda d:d.polygon(S(fill),fill=255))
L=draw(lambda d:(d.line(S(lower),fill=255,width=int(1.6*SS),joint="curve"),d.line(S(upper),fill=255,width=int(1.4*SS),joint="curve")))
L=nd.gaussian_filter(L,.45); F=nd.gaussian_filter(F,.8)
inner=66.; edge=138.
new=np.maximum(t,np.maximum(F*inner,L*edge))
ch_=np.round(new)>t                                                        # only the joint's own pixels change (each channel lifted
for ch in range(3):                                                      # to the new value there; elsewhere untouched)
    v=A[r*TH:(r+1)*TH,c*TW:(c+1)*TW,ch]; v[ch_]=np.maximum(v[ch_],np.clip(np.round(new[ch_]),0,255).astype(np.uint8))
Image.fromarray(A).save(P,lossless=True)
d=np.abs(A.astype(int)-np.asarray(Image.open(SRC).convert("RGB")).astype(int)).max(2); ys,xs=np.nonzero(d)
print("changed px",len(ys),"rows",ys.min(),ys.max(),"cols",xs.min(),xs.max())
