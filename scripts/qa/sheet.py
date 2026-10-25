import sys, glob
from PIL import Image
prefix, out = sys.argv[1], sys.argv[2]
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 0.4
files = sorted(glob.glob(prefix + '-*.png'))
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size; tw, th = int(w * scale), int(h * scale)
sheet = Image.new('RGB', (tw * len(ims), th))
for i, im in enumerate(ims): sheet.paste(im.resize((tw, th)), (i * tw, 0))
sheet.save(out); print(sheet.size, len(ims))
