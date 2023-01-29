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
    ('xyzw', 'png', 'rgb', 'tri', 'depth')), lines)
do_depth = False

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
    if do_depth:
        if depth >= -1 and depth <= depth_buffer[pixel]:
            depth_buffer[pixel] = depth
        else:
            do_draw = False

    if not (0 <= pixel[0] < width and 0 <= pixel[1] < height):
        do_draw = False
    if do_draw:
        img.putpixel(pixel, color)


for l in lines:
    l = list(filter(len, l.split(' ')))
    print(l)
    if l[0] == 'png':
        width, height = (int(l[1]), int(l[2]))
        img = Image.new('RGBA', (width, height), color=(0, 0, 0, 0))
        destination = l[3]

    elif l[0] == 'depth':
        depth_buffer = np.ones([width, height])
        do_depth = True

    elif l[0] == 'rgb':
        curr_color = list(map(int, l[1:]))+[255]

    elif l[0] == 'xyzw':
        v = list(map(float, l[1:]))
        verticies += [v + curr_color]

    elif l[0] == 'tri':
        # Select vertices for tri
        vs = np.array(verticies)[list(
            map(lambda x: int(x)-1 if int(x) > 0 else int(x), l[1:]))]

        # Do viewport transform
        vs = np.stack(map(viewport_transform, vs))
        print("view port transformed:\n", vs)

        # DDA on y for each edge
        # print("Pairs\n", np.stack(combinations(vs, 2)))
        edge_points = sum(map(lambda pair: dda(
            *pair, 1), combinations(vs, 2)), [])
        edge_points = np.array(
            sorted(edge_points, key=lambda x: x[1])).reshape(-1, 2, 8)
        # edge_points = np.unique(edge_points, axis=0)
        # print("DDA edges\n", edge_points)

        # DDA on x for each scan line
        vs = sum(map(lambda pair: dda(*pair, 0), edge_points), [])
        vs = np.array(vs)
        # print("pixels", vs)

        # Draw pixel
        list(map(draw, vs))

        # mx = min(vs, key = lambda x:x[0])
        # my = min(vs, key = lambda x:x[1])
        # print(f"{mx=},{my=}")
        # mx[:2]-=10
        # my[:2]-=10
        # my[:2]=[10,10]
        # draw(mx)
        # draw(my)
        # data = np.array([[24., 12., 1., 1., 255., 0., 0., 255.],
                         # [6., 42.,  1., 1., 255., 0.,  0., 255.]])
        # print(f"{data=}")
        # line1 = dda(*data, 1)
        # print("DDAed\n", np.array(line1))
        # line2 = dda(line1[-1],line1[-1], 0)
        # print("DDAed\n", np.array(line2))
        # break

    print('--------------')


img.save(destination)
