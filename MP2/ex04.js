function compileAndLinkGLSL(vs_source, fs_source) {
    let vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    let fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }

    window.program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }
}

function setupGeomery(geom) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    Object.entries(geom.attributes).forEach(([name, data]) => {
        let buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        let f32 = new Float32Array(data.flat())
        gl.bufferData(gl.ARRAY_BUFFER, f32, gl.DYNAMIC_DRAW)

        eval("window.geom_" + name + "_buf = buf")
        eval("window.geom_" + name + "_f32 = f32")

        let loc = gl.getAttribLocation(program, name)
        gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(loc)
    })

    window.indices = new Uint16Array(geom.triangles.flat())
    window.indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW)

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray
    }
}

function normalize(x) { //[0,1] -> [-0.5, 0.5] + [0.5->-0.5]
    return 2 * (x < 0.5 ? x : 1 - x) - .5;
}

function cycle(x, p, speed) { // Map to a rational ring
    return ((x * speed) % p) / p;
}

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

function cancelAllAnimationFrames() {
    var id = window.requestAnimationFrame(function() {});
    while (id--) {
        window.cancelAnimationFrame(id);
    }
}

//https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
// my own seedable RNG
function RNG(seed) {
    var m = 2 ** 35 - 31
    var a = 185852
    var s = seed % m
    return function() {
        return (s = s * a % m) / m
    }
}

function randN(n, seed) { // create N randome numbers
    r = RNG(seed);
    let ret = [];
    while (n-- > 0)
        ret.push(r());
    return ret;
}

function cpuMoveVertices(vtx) {}

function draw(milliseconds) { // for the main dancing logo
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)

    var speed = 1 / 2;
    var seconds = cycle(milliseconds, 1000, speed)

    var offset = normalize(seconds);
    var scale = (Math.sin(normalize(cycle(milliseconds, 1000, speed * 0.23)) * 3.2) + 1) / 2;

    // values that do not vary between vertexes or fragments are called "uniforms"
    gl.uniform1f(gl.getUniformLocation(program, 'seconds'), seconds)
    gl.uniform1f(gl.getUniformLocation(program, 'global_scale'), 1. / 4)

    scale = clamp(scale, 0.1, 2);
    offset = clamp(offset, -1, 1);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'transform'), true, [
        scale, 0, 0, offset * 1,
        0, scale, 0, offset * 1,
        0, 0, scale, offset * 1,
        0, 0, 0, 1
    ])

    if (window.do_cpu_move) {
        pos = [...window.geom_position_f32]; // copy positions
        for (let i = 0; i < pos.length / 4; i++) {
            let ofs_vec = randN(4, i);
            for (let j = i * 4; j < i * 4 + 4; j++) {
                //pos[j] += ofs_vec[j % 4];
                pos[j] += 1;
            }
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, window.geom_position_buf)
        gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW)
    }

    gl.bindVertexArray(geom.vao)
    gl.drawElements(geom.mode, geom.count, geom.type, 0)

    requestAnimationFrame(draw)
}


async function setup(event) {
    cancelAllAnimationFrames();
    window.gl = document.querySelector('canvas').getContext('webgl2')
    let vs = await fetch('ex04-vertex.glsl').then(res => res.text())
    let fs = await fetch('ex04-fragment.glsl').then(res => res.text())
    compileAndLinkGLSL(vs, fs)
    let data = await fetch('ex04-geometry.json').then(r => r.json())
    window.geom = setupGeomery(data)

    window.do_cpu_move = false;
    requestAnimationFrame(draw)
}

function drawWarmUp(milliseconds) {
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.uniform1f(gl.getUniformLocation(program, 'seconds'), milliseconds / 1000)
    gl.uniform1f(gl.getUniformLocation(program, 'global_scale'), 10)

    const connection = gl.POINTS
    const count = 6 + (0 | milliseconds / 100) % 100 // number of vertices to draw

    gl.uniform1i(gl.getUniformLocation(program, 'count'), count)
    gl.drawArrays(connection, 0, count)
    requestAnimationFrame(drawWarmUp)
}
async function setupWarmUp(event) {
    cancelAllAnimationFrames();
    window.gl = document.querySelector('canvas').getContext('webgl2')
    let vs = await fetch('warmup/wu2-vertex.glsl').then(res => res.text())
    let fs = await fetch('warmup/wu2-fragment.glsl').then(res => res.text())
    compileAndLinkGLSL(vs, fs)
    requestAnimationFrame(drawWarmUp)
}

window.addEventListener('load', setup)
