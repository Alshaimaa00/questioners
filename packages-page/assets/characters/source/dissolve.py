# An organic particle dissolve for the lower part of a cut-out figure (Men, Women): the solid figure fades
# out first and gives way to sparse, softly glowing dots that thin out along a wavy (noise-shaped) line -
# no straight cut, no flat blocks. Also: smooth photo areas turned to dots, holes in the figure filled.
import numpy as np
from PIL import Image
from scipy import ndimage as nd
MINT = np.array([220, 253, 237], np.float32)
def load(p):
    a = np.asarray(Image.open(p).convert("RGBA")).astype(np.float32)
    return a[..., 3]/255, np.clip((a[..., :3].max(2)/254 - .62)/.38, 0, 1)
def save(p, V, d):
    Image.fromarray(np.dstack([MINT*(.62 + .38*d[..., None]), V*255]).clip(0, 255).astype(np.uint8), "RGBA").save(p)
def dots(shape, p, sigma, rng):
    imp = (rng.random(shape) < p).astype(np.float32)*rng.uniform(.55, 1, shape)
    D = nd.gaussian_filter(imp, sigma); return np.clip(D/D.max()*2.2, 0, 1) if D.max() > 0 else D
def noise(shape, s, rng):
    n = nd.gaussian_filter(rng.standard_normal(shape), s); return n/np.abs(n).max()
def dissolve(V, d, y0, y1, rng, keep=None):
    H, W = V.shape; yy = np.arange(H)[:, None]/H + noise(V.shape, 22, rng)*.045
    t = np.clip((yy - y0)/(y1 - y0), 0, 1)
    solid = (1 - t)**2.2                                                     # the solid figure fades first
    hull = nd.gaussian_filter(nd.binary_dilation(V > .05, iterations=6).astype(np.float32), 4)
    D = dots(V.shape, .006, 1.9, rng)                                        # small glowing particles
    thin = (rng.random(V.shape) < 1)                                         # (dots thin out through t below)
    Dk = D*np.clip(1.15 - t*1.1, 0, 1)**1.4                                   # fewer and dimmer towards the bottom
    V2 = V*solid + Dk*hull*(1 - solid)*.9
    d2 = d*solid + (.55 + .45*Dk)*(1 - solid)
    if keep is not None: V2 = np.maximum(V2, keep*V*solid**.3); d2 = np.maximum(d2, keep*d)
    return np.clip(V2, 0, 1), np.clip(d2, 0, 1)
rng = np.random.default_rng(11)
# ---- Men: fill the hole in the arm (the bicep's shadow, keyed out with the background), then dissolve
V, d = load("men-cur.webp"); H, W = V.shape
hull = nd.binary_fill_holes(nd.binary_closing(V > .06, iterations=10))
hole = hull & (nd.gaussian_filter(V, 2) < .17) & (np.arange(H)[:, None] < H*.86)
hole = nd.binary_dilation(hole, iterations=4) & hull; fill = nd.gaussian_filter(hole.astype(np.float32), 3.5)
Df = dots(V.shape, .02, 1.4, rng)
out = (~hole).astype(np.float32)
around = nd.gaussian_filter(V*out, 14)/np.maximum(nd.gaussian_filter(out, 14), .05)          # the arm's own brightness around the hole
darnd = nd.gaussian_filter(d*out, 14)/np.maximum(nd.gaussian_filter(out, 14), .05)
V = np.maximum(V, fill*around*(.75 + .5*Df)); d = d*(1 - fill) + np.maximum(d, darnd*(.85 + .3*Df))*fill
ribbon = ((d > .85) & (V > .55)).astype(np.float32)
V, d = dissolve(V, d, .64, .97, rng, keep=nd.gaussian_filter(ribbon, 1))
save("men-fixed.png", V, d)
# ---- Women: the waist and hips (from the photo) become dots like the rest of her, then dissolve
V, d = load("women-cur.webp"); H, W = V.shape
y = np.arange(H)[:, None]/H
tz = np.clip((y - .6)/.1, 0, 1); tz = tz*tz*(3 - 2*tz)                       # where the photo part begins
ribbon = ((d > .85) & (V > .55)).astype(np.float32)
smooth = nd.gaussian_filter(V, 1.6)                                          # no ribbed bands
Dd = dots(V.shape, .05, 1.1, rng)                                            # dense fine particles
edge = np.clip(nd.gaussian_gradient_magnitude(nd.gaussian_filter((V > .12).astype(np.float32), 1.5), 1.2)*2.6, 0, 1)
stip = np.clip(smooth*(.3 + .95*Dd) + edge*.45, 0, 1)
V = V*(1 - tz) + np.maximum(stip, ribbon*V)*tz
d = d*(1 - tz) + np.maximum(np.clip(.35 + .5*Dd + edge*.3, 0, 1), ribbon)*tz
# the bright strokes of the waistband and the hands at the bottom are not ribbon: only the ribbon above them is kept
keep = nd.gaussian_filter(ribbon, 1)*np.clip((.84 - y)/.05, 0, 1)
V, d = dissolve(V, d, .75, .99, rng, keep=keep)
save("women-fixed.png", V, d)
for n, c in (("men", "#2D6A94"), ("women", "#A3456E")):
    f = Image.open(f"{n}-fixed.png"); g = Image.new("RGBA", f.size, c); g.alpha_composite(f); g.convert("RGB").crop((0, 450, f.width, 1000)).save(f"prev-{n}-fix.jpg")
a = Image.open("prev-men-fix.jpg"); b = Image.open("prev-women-fix.jpg"); s = Image.new("RGB", (a.width + b.width, 550)); s.paste(a, (0, 0)); s.paste(b, (a.width, 0)); s.save("prev-fix.jpg")
