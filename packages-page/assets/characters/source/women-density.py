# Women (7 Nov 2026, density round): her tone map lifted so her whole silhouette reads as particles - the darker mid-tones
# (shoulders, torso, the hair's inner locks) get dots too, and the existing dots a little more light; the features keep their
# contrast (a gamma lift, not a flat fill). Source: the previous tone map (kept as women-tone-prev.webp); alpha from women.webp
import numpy as np
from PIL import Image
from scipy import ndimage as nd
T=np.asarray(Image.open("women-tone-prev.webp").convert("L")).astype(float)/255
A=np.asarray(Image.open("women.webp").convert("RGBA"))[...,3].astype(float)/255
sil=nd.gaussian_filter((nd.gaussian_filter(A,3)>.08).astype(float),2.5)
grain=nd.gaussian_filter(np.random.default_rng(5).random(T.shape),.8)
out=np.clip(T**.72*1.08 + sil*(.1+.06*grain),0,1)*np.clip(sil*1.2,0,1)
print("dots before",(T>=.07).mean().round(3),"after",(out>=.07).mean().round(3))
g=(out*255).astype(np.uint8); Image.fromarray(np.dstack([g,g,g])).save("women-tone.webp",quality=90,method=6)
