# Women (8 Nov 2026): fuller LOWER body only. Her approved tone map (women-tone-prev.webp) darkens from the waist down (it dissolves
# into the bottom of the artwork), so fewer and dimmer dots were made there. From the waist (y ~ 560 of 1000) down, the tone is lifted
# progressively (a gamma lift - the folds and contours keep their contrast, nothing is blurred) and the darkest cells inside her
# silhouette get a light dot grain, so the hips and lower torso read as full as the rest; the last strip still dissolves softly.
# Above the waist the map is unchanged, pixel for pixel. Output: women-tone.webp
import numpy as np
from PIL import Image
from scipy import ndimage as nd
T=np.asarray(Image.open("women-tone-prev.webp").convert("L")).astype(float)/255
A=np.asarray(Image.open("women.webp").convert("RGBA"))[...,3].astype(float)/255
H,W=T.shape; y=np.arange(H)[:,None].astype(float)
ss=lambda a,b,x: np.clip((x-a)/(b-a),0,1)**2*(3-2*np.clip((x-a)/(b-a),0,1))
w=ss(540,720,y)*(1-.55*ss(920,1000,y))                       # 0 above the waist -> 1 over the hips and lower torso, easing at the very bottom
sil=nd.gaussian_filter((nd.binary_erosion(A>.12,iterations=2)).astype(float),1.2)   # inside her outline only
rng=np.random.default_rng(8); grain=(rng.random((H,W))<.22)*rng.uniform(.18,.42,(H,W))
lift=np.clip(T**.66*1.12,0,1)
lift=np.maximum(lift,grain*sil)                                # the empty cells inside her get some dots, like the dots around them
out=T*(1-w)+lift*w*np.maximum(sil,(T>0).astype(float))
out=np.where(y<540,T,np.clip(out,0,1))
# (8 Nov 2026, round 2) the bottom band (y 850-1000), where her artwork fades out, filled like the hips above it: her outline at
# y 850 carried straight down, the tone raised to the hips' level (the existing dots keep their pattern - a gain, not a blur), and
# the empty cells inside get dots at the hips' density; only the last ~25px keep a soft fade into the card
row=(A[850]>.1); cols=np.nonzero(row)[0]
ext=np.zeros_like(A); ext[850:,:]=(np.arange(W)[None,:]>=cols.min())&(np.arange(W)[None,:]<=cols.max())
ext=np.maximum(ext*np.repeat(nd.binary_closing(row[None,:],iterations=6),H,0),sil*(y<850))
ext=nd.gaussian_filter(ext.astype(float),1.2)
b=ss(850,960,y)                                               # 0 at the hips -> 1 in the fading band
ref=out[800:850][A[800:850]>.1]; lvl=float(np.median(ref[ref>=.07]))
gain=1+b*np.clip(lvl/np.maximum(nd.uniform_filter(out,(25,1)),.05)-1,0,2.2)
fill=(rng.random((H,W))<.42*(1-.75*ss(925,1000,y)))*rng.uniform(.45*lvl,1.05*lvl,(H,W))
band=np.maximum(np.clip(out*gain,0,1),fill*ext*b)
tail=1-.9*ss(925,1000,y)                                      # the soft end: light and dots thin out over the last ~75px
out=np.where(y<850,out,np.clip(band*np.maximum(ext,(out>0)*1.)*tail,0,1))
g=(out*255).round().astype(np.uint8); Image.fromarray(np.dstack([g,g,g])).save("women-tone.webp",lossless=True)
for y0 in range(500,1000,50):
    m=(ext[y0:y0+50]>.3)|(A[y0:y0+50]>.1); print(y0,"dots %.2f -> %.2f"%(((T[y0:y0+50]>=.07)&m).sum()/m.sum(),((out[y0:y0+50]>=.07)&m).sum()/m.sum()),"light %.3f -> %.3f"%(T[y0:y0+50][m].mean(),out[y0:y0+50][m].mean()))
print("upper unchanged:", np.array_equal((T[:540]*255).round(), (out[:540]*255).round()))
