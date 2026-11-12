# The tone map behind the round-dot rendering (o.dots, o.tone): for each package character, its shading from the
# ORIGINAL cut-out (not the dotted still image), with its features sharpened - eyes, nose, mouth, hair strands,
# muscle lines - so that when the engine makes one round dot per small cell, the dot's size and light follow the
# figure's real light and the face stays readable. Same size and place as the figure's still image.
# Usage: python3 tone.py <cutout.webp> <out.webp>
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
im = np.asarray(Image.open(sys.argv[1]).convert("RGBA")).astype(np.float32)/255
al = im[..., 3]; lum = im[..., :3] @ np.array([.3, .59, .11], np.float32)
lo, hi = np.percentile(lum[al > .1], [2, 98]); ln = np.clip((lum - lo)/(hi - lo + 1e-6), 0, 1)
L = nd.gaussian_filter(al*(.4 + .6*ln), 1.2)
T = L + 2.4*(L - nd.gaussian_filter(L, 4)) + 1.0*(L - nd.gaussian_filter(L, 10))   # features and volumes
T = np.clip(T/np.percentile(T[T > .03], 95), 0, 1)**.8
g = (T*255).astype(np.uint8)
Image.fromarray(np.dstack([g, g, g])).save(sys.argv[2], quality=90, method=6)
print(sys.argv[2], g.shape)
