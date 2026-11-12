# Women (supplied "mulhim_women_animated_hair.html"): the exact embedded artwork, cut out of its pink backdrop.
# The backdrop is a smooth gradient with a soft glow around the figure; the figure is made of luminous dots
# over a slightly lighter body. Alpha = the dots (fine detail) + the body's soft fill + its bright rim; the
# glow and the backdrop go. Also writes the hair-weight mask (the supplied animation's own hair regions).
import numpy as np
from PIL import Image
from scipy import ndimage as nd
D = "/private/tmp/claude-501/-Users-dunon-Desktop-dev/9d16f62c-6c73-44bc-b294-c2850201181c/scratchpad/women3"
a = np.asarray(Image.open(f"{D}/source.png").convert("RGB")).astype(np.float32)
H, W, _ = a.shape
L = a @ np.array([.3, .59, .11], np.float32)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
# the backdrop: fitted on the image's outer band (away from the figure and its glow)
X = np.stack([np.ones_like(xx), xx/W, yy/H, (xx/W)**2, (yy/H)**2, xx*yy/(W*H)], -1).reshape(-1, 6)
band = np.zeros((H, W), bool); b = 70; band[:b] = band[:, :b] = band[:, -b:] = True; band[-b:] = True
coef, *_ = np.linalg.lstsq(X[band.reshape(-1)], L.reshape(-1)[band.reshape(-1)], rcond=None)
bg = (X @ coef).reshape(H, W)
diff = L - bg
hp = L - nd.gaussian_filter(L, 2.2)
dots = np.clip((hp - 4)/26, 0, 1)                                   # the luminous dots
tex = nd.gaussian_filter(np.abs(hp), 9)                              # dot texture: ~1.5 inside her, ~0.4 on the backdrop
core = tex > .62
lab, n = nd.label(core); core = lab == (1 + np.argmax(nd.sum(core, lab, range(1, n + 1))))
core = nd.binary_fill_holes(nd.binary_closing(core, iterations=4))
faint = np.clip((hp - 1.5)/14, 0, 1)                                # the faint interior dots, inside the figure only
dots = np.maximum(dots, faint*.75*nd.gaussian_filter(core.astype(np.float32), 4))
body = nd.gaussian_filter(core.astype(np.float32), 3)
lift = np.clip((diff - 26)/60, 0, 1)*np.clip(dots*3, 0, 1)            # her bright rim (not the backdrop's glow)
V = np.clip(np.maximum(dots*(.35 + .65*body) + body*.06, body*lift*.85), 0, 1)
V *= nd.gaussian_filter(core.astype(np.float32), 5)                   # nothing outside the figure
# where she fades out at the bottom: an organic dissolve (a wavy line, the dots thinning out), no ragged cut
ys_, xs_ = np.nonzero(core); fy0, fy1 = ys_.min(), ys_.max()
rng = np.random.default_rng(3)
nz = nd.gaussian_filter(rng.standard_normal((H, W)), 30); nz /= np.abs(nz).max()
t = np.clip(((yy - fy0)/(fy1 - fy0) + nz*.035 - .80)/.17, 0, 1)
V *= (1 - t)**1.7
V[V < .035] = 0
d = np.clip(.35*lift + .75*dots, 0, 1)                              # brightness for the dots' colour
# the supplied animation's hair regions (top-down normalized coordinates of the source image)
def ell(x, y, cx, cy, rx, ry):
    dd = np.hypot((x - cx)/rx, (y - cy)/ry); u = np.clip((dd - .68)/(1.04 - .68), 0, 1); return 1 - u*u*(3 - 2*u)
px, py = xx/W, yy/H
hair = np.maximum.reduce([ell(px,py,.535,.167,.215,.095)*.23, ell(px,py,.610,.295,.160,.150)*.68, ell(px,py,.670,.407,.135,.128), ell(px,py,.708,.433,.084,.084)])
hair *= 1 - ell(px, py, .414, .252, .090, .117)
# crop to the figure (a margin around it) and size to 1000px tall
ys, xs = np.nonzero(V > .05); m = 26
y0, y1, x0, x1 = max(0, ys.min()-m), min(H, ys.max()+m), max(0, xs.min()-m), min(W, xs.max()+m)
MINT = np.array([220, 253, 237], np.float32)
rgb = MINT*(.62 + .38*d[..., None])
img = Image.fromarray(np.dstack([rgb, V*255])[y0:y1, x0:x1].clip(0, 255).astype(np.uint8), "RGBA")
msk = Image.fromarray(np.dstack([np.zeros_like(hair), hair*255, np.zeros_like(hair)])[y0:y1, x0:x1].astype(np.uint8), "RGB")
k = 1000/img.height
img = img.resize((round(img.width*k), 1000), Image.LANCZOS); msk = msk.resize(img.size, Image.BILINEAR)
img.save(f"{D}/women.png"); msk.save(f"{D}/women-hair.png")
print("crop", (x0, y0, x1, y1), "size", img.size, "ar", round(img.width/img.height, 4))
for c, n in (("#A3456E", "prev-card"), ("#0B2F37", "prev-dark")):
    g = Image.new("RGBA", img.size, c); g.alpha_composite(img); g.convert("RGB").resize((img.width//2, 500)).save(f"{D}/{n}.jpg")
