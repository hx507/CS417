import sys
import numpy as np
from PIL import Image, ImageDraw

lines = open(sys.argv[1], "r").readlines()
lines = map(lambda x: x.strip().replace("\t", " "), lines)
lines = filter(lambda x: x.startswith(("xyrgb", "xyc", "png")), lines)

for l in lines:
    l = list(filter(len, l.split(" ")))
    if l[0] == "png":
        img = Image.new('RGBA', (int(l[1]), int(l[2])), color=(0, 0, 0, 0))
        destination = l[3]
    elif l[0] == "xyrgb":
        img.putpixel((int(l[1]), int(l[2])), tuple(
            list(map(int, l[3:]))+[255]))
    elif l[0] == "xyc":
        l[3] = l[3][1:]
        r, g, b = int(l[3][0:2], 16), int(l[3][2:4], 16), int(l[3][4:6], 16)
        img.putpixel((int(l[1]), int(l[2])), (r, g, b, 255))


img.save(destination)
