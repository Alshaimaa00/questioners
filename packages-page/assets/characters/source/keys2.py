import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
SRC = sys.argv[1]
def load(f): return np.asarray(Image.open(f"{SRC}/{f}").convert("RGB")).astype(np.float32)
LW = np.array([.3, .59, .11], np.float32)
def crop_save(name, V, d, tint, H=1000, pad=.03):
    ys, xs = np.nonzero(V > .05); h, w = V.shape; p = int(pad*h)
    y0, y1, x0, x1 = max(0, ys.min()-p), min(h, ys.max()+p), max(0, xs.min()-p), min(w, xs.max()+p)
    V = V[y0:y1, x0:x1]; d = d[y0:y1, x0:x1]
    t = np.array(tint, np.float32); rgb = t*(.62 + .38*d[..., None])
    im = Image.fromarray(np.dstack([rgb, V*255]).clip(0, 255).astype(np.uint8), "RGBA")
    im = im.resize((round(im.width*H/im.height), H), Image.LANCZOS); im.save(f"{name}.png"); return im
def men():
    a = load("16.webp"); h, w, _ = a.shape
    # the background is a smooth blue gradient: fit it (2nd order, per channel) on the image border
    yy, xx = np.mgrid[0:h, 0:w]; X = np.stack([np.ones_like(xx), xx/w, yy/h, (xx/w)**2, (yy/h)**2, xx*yy/(w*h)], -1).reshape(-1, 6).astype(np.float32)
    border = np.zeros((h, w), bool); b = 40; border[:b] = border[-b:] = border[:, :b] = border[:, -b:] = True
    border[-260:] = False  # the dots fade into the bottom: keep it out of the fit
    border[-b:, :] = False
    bg = np.zeros_like(a)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(X[border.reshape(-1)], a[..., c].reshape(-1)[border.reshape(-1)], rcond=None)
        bg[..., c] = (X @ coef).reshape(h, w)
    diff = a - bg; L = diff @ LW
    hp = L - nd.gaussian_filter(L, 3)
    dots = np.clip((hp - 6)/40, 0, 1)                 # the luminous dots (fine detail, not the soft halo)
    lit = np.clip((L - 38)/60, 0, 1)                  # lit skin and the bright rim
    light = np.maximum(dots, lit)
    dark = np.clip((-L - 8)/40, 0, 1)                 # the darker shirt / hair (the figure's volume)
    m = np.maximum(nd.gaussian_filter(dots, 4)*3, np.maximum(lit, dark))
    core = nd.gaussian_filter(m, 3) > .3
    lab, n = nd.label(core); sizes = nd.sum(core, lab, range(1, n + 1)); core = lab == (1 + np.argmax(sizes))
    body = nd.binary_fill_holes(nd.binary_closing(core, iterations=6))
    body = nd.gaussian_filter(body.astype(np.float32), 2)
    d = np.clip(.15 + light*1.0, 0, 1)
    V = np.clip(np.maximum(light, body*.42*(1 - .4*dark)), 0, 1)
    V[V < .04] = 0
    return crop_save("men", V, d, (165, 216, 255))
def women():
    a = load("15.webp"); h, w, _ = a.shape
    dist = np.sqrt(((255 - a)**2).sum(2))/np.sqrt(3)
    fg = nd.gaussian_filter(dist, 1.5) > 22
    fg = nd.binary_opening(fg, iterations=2)
    lab, n = nd.label(fg); sizes = nd.sum(fg, lab, range(1, n + 1)); fg = lab == (1 + np.argmax(sizes))
    fg = nd.binary_fill_holes(nd.binary_closing(fg, iterations=5))
    soft = nd.gaussian_filter(fg.astype(np.float32), 1.2)
    # stray hairs at the edge: thin dark strands outside the solid shape
    strands = np.clip((dist - 30)/90, 0, 1)*(1 - fg)
    L = a @ LW
    inside = fg & (L < 250)
    lo, hi = np.percentile(L[inside], [3, 99.7]); d = np.clip((L - lo)/(hi - lo), 0, 1)
    # the hair's sheen: local contrast lifts the strands' highlights
    hp = np.clip((L - nd.gaussian_filter(L, 6))/18, 0, 1)
    det = np.clip(.5*d + .9*hp, 0, 1)
    V = np.clip(soft*(.3 + .7*det) + strands*.5, 0, 1); V[V < .04] = 0
    return crop_save("women", V, np.clip(d*.7 + hp*.6, 0, 1), (255, 214, 231))
men()
from PIL import Image as I
for n, c in (("men", "#2D6A94"), ("women", "#A3456E")):
    f = I.open(f"{n}.png"); f = f.resize((f.width//2, f.height//2)); bg = I.new("RGBA", f.size, c); bg.alpha_composite(f); bg.convert("RGB").save(f"prev-{n}.jpg")
