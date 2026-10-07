# Generates the app icons (a simple barbell on a dark background). Run: python3 scripts/make-icons.py
from PIL import Image, ImageDraw

def make(size, path):
    img = Image.new("RGB", (size, size), "#111827")
    d = ImageDraw.Draw(img)
    s = size / 512
    c = "#34d399"
    d.rounded_rectangle([120*s, 238*s, 392*s, 274*s], radius=18*s, fill=c)      # bar
    for x0, x1, h in [(92, 128, 150), (60, 92, 110), (384, 420, 150), (420, 452, 110)]:  # plates
        d.rounded_rectangle([x0*s, (256-h/2)*s, x1*s, (256+h/2)*s], radius=10*s, fill=c)
    img.save(path)

make(192, "public/icon-192.png")
make(512, "public/icon-512.png")
