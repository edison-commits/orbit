#!/usr/bin/env python3
"""Generate Orbit app icons with the brand purple (#7C5CFC)."""
import os
from PIL import Image, ImageDraw

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'assets')
PURPLE = (124, 92, 252)   # #7C5CFC
WHITE = (255, 255, 255)

def draw_orbit_ring(img_size, ring_r, ring_w, offset=(0, 0)):
    img = Image.new('RGBA', (img_size, img_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = img_size // 2 + offset[0]
    cy = img_size // 2 + offset[1]
    bbox = [cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r]
    draw.ellipse(bbox, outline=WHITE, width=ring_w)
    return img

def solid(img_size, color=PURPLE):
    return Image.new('RGBA', (img_size, img_size), (*color, 255))

def save(img, rel_path):
    path = os.path.join(ASSETS, rel_path)
    img.save(path)
    print(f'  ✓ {rel_path}')

def generate():
    print('Generating Orbit icons…')

    # icon.png — 1024×1024 iOS App Store
    save(solid(1024), 'icon.png')

    # splash-icon.png — 600×600 splash
    save(solid(600, PURPLE), 'splash-icon.png')

    # android-icon-background.png — 1024×1024 solid purple
    save(solid(1024), 'android-icon-background.png')

    # android-icon-foreground.png — 1024×1024 white ring on transparent
    fg = draw_orbit_ring(1024, 360, 80)
    save(fg, 'android-icon-foreground.png')

    # android-icon-monochrome.png — 1024×1024 white ring on transparent
    mono = draw_orbit_ring(1024, 360, 80)
    save(mono, 'android-icon-monochrome.png')

    # favicon.png — 32×32
    fav = solid(32, PURPLE)
    save(fav, 'favicon.png')

    print('\nDone!')

if __name__ == '__main__':
    generate()
