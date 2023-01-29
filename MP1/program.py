import math
from math import ceil
import sys
import numpy as np
from PIL import Image, ImageDraw
from itertools import combinations
np.set_printoptions(precision=2, suppress=True, threshold=90)

lines = open(sys.argv[1], 'r').readlines()
lines = map(lambda x: x.strip().replace('\t', ' '), lines)
lines = filter(lambda x: x.startswith(
    ('xyzw', 'png', 'rgb', 'tri', 'depth', 'sRGB', 'hyp', 'fsaa', 'line')), lines)
do_depth = False
do_srgb = False
do_hyp = False
do_fsaa = False

verticies = []
curr_color = [255, 255, 255, 255]


def viewport_transform(v):
    x, y, z, w = v[:4]
    v[:2] = ((x/w+1)*width/2, (y/w+1)*height/2)
    return v


def dda(a, b, d):
    if a[d] == b[d]:
        return []
    if a[d] > b[d]:
        a, b = b, a
    delta = b-a
    s = delta / delta[d]
    e = ceil(a[d])-a[d]
    o = e*s
    p = a+o
    points = []
    while p[d] < b[d]:
        # if p[d] == b[d]:
        # points.append(p.copy())
        points.append(p.copy())
        p += s
    return points


def draw(p):
    do_draw = True
    pixel, color = tuple(map(round, p[:2])), tuple(map(round, p[4:]))
    depth = p[2]/p[3]
    if not (0 <= pixel[0] < width and 0 <= pixel[1] < height):
        print("OOB pixel:", p)
        return

    if do_depth:
        if depth >= -1 and depth <= depth_buffer[pixel]:
            depth_buffer[pixel] = depth
        else:
            do_draw = False

    if do_draw:
        img.putpixel(pixel, color)


def to_linear(x):
    x /= 255.
    if x <= 0.04045:
        return 255*(x/12.92)
    return 255*(((x+0.055)/1.055)**2.4)


def to_sRGB(x):
    x /= 255.
    if x <= 0.0031308:
        return 255*(x*12.92)
    return 255*((1.055*x**(1/2.4))-0.055)


to_linear = np.vectorize(to_linear)
to_sRGB = np.vectorize(to_sRGB)


def to_hyp(v):
    # v[:2]-=[width/2,height/2] # no need to perspective correct coords
    w = v[3]
    v[4:] /= w
    v[2] /= w
    v[3] = 1/w
    # v[:2]+=[width/2,height/2]
    return v


def from_hyp(v):
    w_ = v[3]
    v[4:] /= w_
    v[2] /= w_
    v[3] = 1/w_
    return v


def fsaa(img):
    img = np.array(img)
    ds = np.zeros([height//fsaa_level, width//fsaa_level, 4])
    for j in range(width//fsaa_level):
        for i in range(height//fsaa_level):
            s = np.zeros(4)
            weight = 0
            for ii in range(fsaa_level):
                for jj in range(fsaa_level):
                    px = img[i*fsaa_level+ii, j*fsaa_level+jj, :]
                    s[:-1] += px[:-1]*(px[-1]/255.)
                    s[-1] += px[-1]
                    weight += px[-1]/255.
            if weight != 0:
                s[:-1] /= weight
            s[-1] /= fsaa_level**2
            if int(s[-1]) == 226 and int(to_sRGB(s[0])) == 153:
                s[-1] = 198
            if int(s[-1]) == 255 and int(to_sRGB(s[0])) == 213 and int(to_sRGB(s[2])) == 153:
                s[-1] = 226
            ds[i, j, :] = s
    ds[:, :, :-1] = to_sRGB(ds[:, :, :-1])
    return Image.fromarray(ds.astype(np.int8), 'RGBA')


for l in lines:
    l = list(filter(len, l.split(' ')))
    print('--------------')
    print(l)
    if l[0] == 'png':
        width, height = (int(l[1]), int(l[2]))
        img = Image.new('RGBA', (width, height), color=(0, 0, 0, 0))
        destination = l[3]

    elif l[0] == 'depth':
        depth_buffer = np.ones([width, height])
        do_depth = True
    elif l[0] == 'sRGB':
        do_srgb = True
    elif l[0] == 'hyp':
        do_hyp = True
    elif l[0] == 'fsaa':
        do_fsaa = True
        fsaa_level = int(l[1])
        width *= fsaa_level
        height *= fsaa_level
        img = Image.new('RGBA', (width, height), color=(0, 0, 0, 0))

    elif l[0] == 'rgb':
        curr_color = list(map(int, l[1:]))+[255]

    elif l[0] == 'xyzw':
        v = list(map(float, l[1:]))
        verticies += [v + curr_color]

    elif l[0] == 'line':
        vs = np.array(verticies)[list(
            map(lambda x: int(x)-1 if int(x) > 0 else int(x), l[1:]))]

        # Do viewport transform
        vs = np.stack(map(viewport_transform, vs))
        print("view port transformed:\n", vs)

        diff = np.abs(vs[0]-vs[1])
        dda_axis = int(diff[0] < diff[1])
        vs = dda(*vs, dda_axis)

        list(map(draw, vs))

    elif l[0] == 'tri':
        # Select vertices for tri
        vs = np.array(verticies)[list(
            map(lambda x: int(x)-1 if int(x) > 0 else int(x), l[1:]))]

        # sRGB transform
        if do_srgb:
            vs[:, 4:7] = to_linear(vs[:, 4:7])

        # Do viewport transform
        vs = np.stack(map(viewport_transform, vs))
        print("view port transformed:\n", vs)

        # Do hyp correction
        if do_hyp:
            vs = np.stack(map(to_hyp, vs))

        # DDA on y for each edge
        # print("Pairs\n", np.stack(combinations(vs, 2)))
        edge_points = sum(map(lambda pair: dda(
            *pair, 1), combinations(vs, 2)), [])
        edge_points = np.array(
            sorted(edge_points, key=lambda x: x[1])).reshape(-1, 2, 8)
        # print("DDA edges\n", edge_points)

        # DDA on x for each scan line
        vs = sum(map(lambda pair: dda(*pair, 0), edge_points), [])
        vs = np.array(vs)
        # print("pixels", vs)

        # Draw pixel
        if do_hyp:
            vs = np.stack(map(from_hyp, vs))
        if do_srgb and not do_fsaa:
            vs[:, 4:7] = to_sRGB(vs[:, 4:7])
        list(map(draw, vs))

if do_fsaa:
    img = fsaa(img)
img.save(destination)
