import os
from os import system
import subprocess

lines = open("./implemented.txt", 'r').readlines()
ref_dir = "reference_files/"

err = []
for f in lines:
    print(f)
    name = f.split(".")[0]
    system(f"make run file=./{ref_dir}/{name}.txt")
    system(f"mv ./{name}.png ./test")

    ref_file = f"{ref_dir}/{name}.png"
    gen_file = f"test/{name}.png"
    ae_file = f"test/{name}_ae.png"
    rawdiff_file = f"test/{name}_rawdiff.png"
    diff_file = f"test/{name}_diff.png"
    look_file = f"test/{name}_look.png"
    cmp = subprocess.run(
        [f"compare", "-metric", "ae", "-fuzz", "1%",  ref_file, gen_file, ae_file], capture_output=True)
    if cmp.returncode:
        err += [[name, cmp.returncode]]
    system(
        f"composite {gen_file} {ref_file} -compose difference {rawdiff_file}")
    system(f"convert {rawdiff_file} -level 0%,8% {diff_file}")
    system(
        f"convert +append {ref_file} {gen_file} {ae_file} {rawdiff_file} {diff_file} {look_file}")

    print("===================================================")


print("Errors:\n", err)
