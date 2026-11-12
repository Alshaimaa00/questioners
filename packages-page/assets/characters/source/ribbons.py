# Soft glowing ribbons (as on the other package characters) spiralling around a figure
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
def ribbons(name, tint, specs, seed=3):
    im = np.asarray(Image.open(f"{name}.png").convert("RGBA")).astype(np.float32)
    V = im[..., 3]/255; H, W = V.shape
    d = np.clip((im[..., 0]/tint[0] - .62)/.38, 0, 1) if tint[0] > 0 else np.zeros_like(V)
    body = nd.gaussian_filter((V > .3).astype(np.float32), 3)
    R = np.zeros_like(V); rng = np.random.default_rng(seed)
    for (cx, y0, y1, a, b, turns, ph, wid, bright) in specs:
        n = 4000; t = np.linspace(0, 1, n); th = ph + t*turns*2*np.pi
        xs = (cx + a*np.cos(th))*W; ys = (y0 + (y1 - y0)*t + b*np.sin(th))*H
        front = np.sin(th) > 0
        fade = np.sin(np.pi*t)**.8
        for x, y, f, fr in zip(xs, ys, fade, front):
            xi, yi = int(x), int(y)
            if not (2 <= xi < W - 2 and 2 <= yi < H - 2): continue
            hidden = (not fr) and body[yi, xi] > .5
            v = bright*f*(1 if fr else .45)*(0 if hidden else 1)
            R[yi, xi] = max(R[yi, xi], v)
        # sparkles along the ribbon
        for k in rng.choice(n, 60):
            xi, yi = int(xs[k] + rng.normal(0, 6)), int(ys[k] + rng.normal(0, 6))
            if 1 <= xi < W - 1 and 1 <= yi < H - 1: R[yi, xi] = max(R[yi, xi], rng.uniform(.4, 1)*fade[k])
    core = nd.gaussian_filter(nd.grey_dilation(R, size=3), 1.3)*3.2; halo = nd.gaussian_filter(R, 7)*26
    Rv = np.clip(np.maximum(core, halo*.5), 0, 1)
    V2 = np.clip(np.maximum(V, Rv), 0, 1); d2 = np.maximum(d, np.clip(core, 0, 1))
    t = np.array(tint, np.float32); rgb = t*(.62 + .38*d2[..., None])
    Image.fromarray(np.dstack([rgb, V2*255]).clip(0, 255).astype(np.uint8), "RGBA").save(f"{name}-rib.png")
# (cx, y0, y1, ellipse a, b, turns, phase, width, brightness) - fractions of the artwork
ribbons("men", (165, 216, 255), [(.47, .42, .99, .38, .06, 1.4, 2.6, 1, 1.), (.5, .6, .96, .32, .045, .8, .4, 1, .75)])
ribbons("women", (255, 214, 231), [(.52, .4, .99, .36, .06, 1.45, 2.2, 1, 1.), (.5, .62, .97, .3, .045, .8, 4.0, 1, .75)])
for n, c in (("men", "#2D6A94"), ("women", "#A3456E")):
    f = Image.open(f"{n}-rib.png"); f = f.resize((f.width//2, f.height//2)); bg = Image.new("RGBA", f.size, c); bg.alpha_composite(f); bg.convert("RGB").save(f"prev-{n}-rib.jpg")
