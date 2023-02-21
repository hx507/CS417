import numpy as np


def gen_from_seed(seed):
    points = []
    for ss in seed:
        points += [ss.copy()]
        points += [-ss.copy()]
        for i in range(2):
            s = ss.copy()
            s[i] *= -1
            points += [s]
    return points


seed = np.array([[1, 1], [1, .6], [0.5, 0.6]])
points = gen_from_seed(seed)
orange_seed = np.array([[.9, .9], [.9, .7], [0.4, 0.7]])
organge_points = gen_from_seed(orange_seed)

idxs = []

for i in range(len(points)):
    for j in range(len(points)):
        for k in range(len(points)):
            if len({i, j, k}) == 3:
                a = np.array([points[i], points[j], points[k]])
                if np.all(a[:, 1] > 0) or np.all(a[:, 1] < 0) or (np.all(np.abs(a[:, 0]) < 0.6)):
                    # if  np.all(a[:,1]<0):
                    idxs += [np.array([i, j, k], dtype=int)]

idxs_organge = list(np.array(idxs)+len(points))
# idxs_organge = []

print("Points:")
for p in points:
    print(f"[{p[0]}, {p[1]}, 0, 1],")
for p in organge_points:
    print(f"[{p[0]}, {p[1]}, 0.01, 1],")

print("Color:")
for p in points:
    print(f"[0.075, 0.16, 0.292, 1],")
for p in organge_points:
    print(f"[1, 0.373, 0.02, 1],")

print("Trigs:")
print(list(np.array(idxs+idxs_organge).flatten()))
