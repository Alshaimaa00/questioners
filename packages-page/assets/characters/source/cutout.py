# Cut each supplied character out of its screenshot (checkerboard / white background, the viewer's
# bottom shade and its Edit / share buttons are all neutral grey; the figures are coloured)
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, out = sys.argv[1], sys.argv[2]
JOBS = [("11","athletes",(220,253,237)), ("12","men",(165,216,255)), ("13","women",(255,214,231)), ("14","children",(255,236,170))]
for f, name, tint in JOBS:
    a = np.asarray(Image.open(f"{src}/{f}.webp").convert("RGB")).astype(np.float32)
    H, W, _ = a.shape
    ch = a.max(2) - a.min(2)
    # the viewer's shade over the bottom: per row, how much the neutral background was darkened
    neu = ch < 3
    ref = np.median(a[:200][neu[:200]].max(1)) if neu[:200].any() else 250
    f_row = np.ones(H, np.float32)
    for y in range(H):
        v = a[y][neu[y]].max(1) if neu[y].sum() > 20 else None
        if v is not None: f_row[y] = min(1, np.percentile(v, 75)/ref)
    f_row = nd.uniform_filter1d(np.minimum.accumulate(f_row[::-1])[::-1] if False else f_row, 15)
    a = np.clip(a / f_row[:, None, None], 0, 255)
    ch = a.max(2) - a.min(2)
    fig = ch[ch > 12]
    T = max(30, np.percentile(fig, 60))
    m = np.clip((ch - 7) / (T - 7), 0, 1)
    # bright highlights inside the figure (near-white swirl cores) are colourless: close them in
    core = nd.binary_closing(m > .45, iterations=4)
    holes, nh = nd.label(nd.binary_fill_holes(core) & ~core)
    sizes = nd.sum(np.ones_like(m), holes, range(1, nh + 1))
    small = np.isin(holes, 1 + np.nonzero(sizes < H*W*.0012)[0])
    solid = core | small
    m = np.maximum(m, nd.gaussian_filter(solid.astype(np.float32), 1.2) * (m > .02))
    m = np.maximum(m, solid*1.0)
    L = a @ np.array([.3, .59, .11], np.float32)
    inside = m > .6
    lo, hi = np.percentile(L[inside], [2, 99.5])
    d = np.clip((L - lo) / (hi - lo), 0, 1)
    V = m * (.36 + .64 * d**.9)
    V[V < .03] = 0
    ys, xs = np.nonzero(V > .05)
    pad = int(.035 * H)
    y0, y1, x0, x1 = max(0, ys.min()-pad), min(H, ys.max()+pad), max(0, xs.min()-pad), min(W, xs.max()+pad)
    V = V[y0:y1, x0:x1]; d = d[y0:y1, x0:x1]
    # baked in the package colour (the still fallback); brighter where the artwork is brighter
    t = np.array(tint, np.float32)
    rgb = t * (.62 + .38 * d[..., None])
    rgba = np.dstack([rgb, V * 255]).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(rgba, "RGBA")
    im = im.resize((round(im.width * 1000 / im.height), 1000), Image.LANCZOS)
    im.save(f"{out}/{name}.webp", quality=92, method=6)
    im.save(f"{out}/{name}.png")
    # preview on the card's deep colour
    print(name, im.size, round(im.width/im.height, 4))
