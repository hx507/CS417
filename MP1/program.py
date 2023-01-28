from math import ceil
import sys
import numpy as np
from PIL import Image, ImageDraw
from itertools import combinations
np.set_printoptions(precision=2, suppress=True)

lines = open(sys.argv[1], 'r').readlines()
lines = map(lambda x: x.strip().replace('\t', ' '), lines)
lines = filter(lambda x: x.startswith(('xyzw', 'png', 'rgb', 'tri')), lines)

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
        points.append(p.copy())
        p += s
    return points


for l in lines:
    l = list(filter(len, l.split(' ')))
    print(l)
    if l[0] == 'png':
        width, height = (int(l[1]), int(l[2]))
        img = Image.new('RGBA', (width, height), color=(0, 0, 0, 0))
        destination = l[3]

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

        edge_points = sum(map(lambda pair: dda(
            *pair, 1), combinations(vs, 2)), [])
        # edge_points = []
        # for pair in combinations(vs, 2):
        # print("pair:", pair)
        # edge_points += dda(*pair, 1)
        edge_points = np.array(
            sorted(edge_points, key=lambda x: x[1])).reshape(-1, 2, 8)
        # edge_points = np.unique(edge_points, axis=0)
        print(edge_points)

        # DDA in y along edges

    print('--------------')


img.save(destination)
