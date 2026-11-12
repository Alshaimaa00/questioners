# The Women figure's ONE set of particles (Nov 2026, smooth tracking): her rest pose (pose 1 of the 40-frame storyboard) with her
# whole silhouette - torso AND the hanging arm and hand - filled with fine dim dots, in her approved dot finish. The engine carries
# these same dots through all 40 poses along the measured motion (flow-next.png), so nothing is ever re-made between poses.
import numpy as np, sys
from PIL import Image
from scipy import ndimage as nd
O=sys.argv[1]; FILL=.09
a=np.asarray(Image.open(O+"/poses.webp").convert("L")).astype(float)/255; t=a[0:324,0:224].copy()
m=nd.binary_closing(nd.gaussian_filter(t,2)>.06,iterations=1)
for yb in range(m.shape[0]-18,m.shape[0]):
    q=np.nonzero(m[yb])[0]
    if len(q)>1: m[yb,q.min():q.max()+1]=True
f=nd.binary_erosion(nd.binary_fill_holes(m),iterations=1)
rng=np.random.default_rng(1); t=np.maximum(t,nd.gaussian_filter(f*(FILL*(.7+.6*rng.random(t.shape))),1.0))
Image.fromarray((np.clip(t,0,1)*255).astype(np.uint8)).save(O+"/rest.webp",quality=92,method=6); print("rest",t.shape)
