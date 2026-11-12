# Women hair map (Nov 2026, hair-only motion): green = how far each place of her approved artwork may move with the hair - 0 at the
# roots (the scalp) rising smoothly toward the tips, and 0 everywhere that is not hair (face, the strands framing it, neck, shoulders,
# body). Drawn on the approved women-tone.webp (568 x 1000); the polygon follows her hair mass (percent of the artwork)
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
t = np.asarray(Image.open("women-tone.webp").convert("L")).astype(np.float32)/255; H, W = t.shape
HAIR = [(40,6),(47,3),(55,3),(63,6),(70,12),(74,19),(77,27),(82,33),(88,37),(93,42),(94,47),(91,51),(85,53),(77,52),(68,51),
        (61,50),(58,46),(59,41),(61,38),(63,35),(62,31),(57,26),(51,20),(45,14),(40,11)]
m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).polygon([(x/100*W, y/100*H) for x, y in HAIR], fill=255)
M = np.asarray(m) > 0
# the roots: the scalp line along the crown; weight grows with the distance from it (along the hair), full by the tips
roots = Image.new("L", (W, H), 0); ImageDraw.Draw(roots).line([(x/100*W, y/100*H) for x, y in [(40,9),(46,5),(55,5),(62,8),(66,12)]], fill=255, width=6)
dist = nd.distance_transform_edt(np.asarray(roots) == 0)/H
w = np.clip(dist/.38, 0, 1); w = w*w*(3 - 2*w)
w = w*nd.gaussian_filter(M.astype(np.float32), .008*W)         # soft edge, so the hair's border moves smoothly with its neighbours
w *= nd.gaussian_filter(M.astype(np.float32), .004*W) > .02
g = (np.clip(w, 0, 1)*255).astype(np.uint8)
Image.fromarray(np.dstack([np.zeros_like(g), g, np.zeros_like(g)])).save("women-hairflow.png", optimize=True)
v = np.stack([t*.6]*3, -1); v[..., 0] = np.maximum(v[..., 0], w*.9)
Image.fromarray((np.clip(v, 0, 1)*255).astype(np.uint8)).save("/private/tmp/claude-501/-Users-dunon-Desktop-dev/9d16f62c-6c73-44bc-b294-c2850201181c/scratchpad/hairflow-check.png")
print("ok", g.max())
