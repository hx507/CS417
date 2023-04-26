/*
 * A set of helpful matrix functions for WebGL.
 * There are other more featureful libraries out there;
 * this is designed to be readable and not use any fancy Javascript.
 * It only supports 4x4 matrices.
 * It puts all its functions (even the helpers) in the global scope.
 * 
 * WebGL wants all matrices to be provided flattened in a Float32Array
 * and presented in column-major order, which makes them look transposed
 * when viewed in the Javascript code.
 * 
 * This file is released into the public domain. It may contain errors,
 * as I wrote it in one sitting with very little testing.
 * 
 * Public Contents:
 * 
 * - m4mult(any, number, of, matrices)
 * - m4transpose(m)
 * - m4ident()
 * - m4translate(x,y,z)
 * - m4scale(scale) and m4scale(x,y,z)
 * - m4perspPosZ(near, far, fovy, width, height)
 * - m4perspNegZ(near, far, fovy, width, height)
 * - m4rotX(ang), m4rotY(ang), m4rotZ(ang)
 * - m4rotAxis(axis, ang)
 * - m4rotAtoB(a,b)
 * - m4view(eye, center, up)
 * 
 * There are also various private helper functions you may use at your own risk.
 */

/** Helper function to normalize a (prefix of a) vector */
function m4scale_(vec, scale, len) {
    vec = Array.from(vec)
    if (len && len < vec.length) vec = vec.slice(0,len)
    return vec.map(x=>x*scale)
}
function m4normalized_(vec, len) {
    vec = Array.from(vec)
    if (len && len < vec.length) vec = vec.slice(0,len)
    let mag = Math.sqrt(vec.map(x=>x*x).reduce((x,y)=>x+y))
    return vec.map(x=>x/mag)
}
/** Helper function to normalize a (prefix of a) vector and return the old lenth */
function m4normalized2_(vec, len) {
    vec = Array.from(vec)
    if (len && len < vec.length) vec = vec.slice(0,len)
    let mag = Math.sqrt(vec.map(x=>x*x).reduce((x,y)=>x+y))
    return [vec.map(x=>x/mag), mag]
}
/** Helper function to find the cross product of two 3-vectors */
function m4cross_(x,y) {
    return [x[1]*y[2]-x[2]*y[1], x[2]*y[0]-x[0]*y[2], x[0]*y[1]-x[1]*y[0]]
}
/** Helper function to dot product (a prefix of) two vectors */
function m4dot_(x,y,len) {
    len = len ? Math.min(x.length, y.length, len) : Math.min(x.length, y.length)
    return Array.from(x).slice(0,len).map((v,i)=>v*y[i]).reduce((a,b)=>a+b)
}
/** Helper function to find the difference of (a prefix of) two vectors */
function m4sub_(x,y,len) {
    len = len ? Math.min(x.length, y.length, len) : Math.min(x.length, y.length)
    return Array.from(x).slice(0,len).map((v,i)=>v-y[i])
}
function m4add_(x,y,len) {
    len = len ? Math.min(x.length, y.length, len) : Math.min(x.length, y.length)
    return Array.from(x).slice(0,len).map((v,i)=>v+y[i])
}

/**
 * Multiply two matrices. Helper function; generally call m4mult instead.
 */
function m4mult_(m1,m2) {
    let ans = new Float32Array(16)
    for(let outRow = 0; outRow < 4; outRow += 1) {
        for(let outCol = 0; outCol < 4; outCol += 1) {
            for(let i = 0; i < 4; i += 1) {
                ans[outRow+outCol*4] += m1[outRow+i*4] * m2[i+outCol*4]
            }
        }
    }
    return ans
}

function m4multvec_(m1,v) {
    let ans = new Float32Array(4)
    for(let outRow = 0; outRow < 4; outRow += 1) {
            ans[outRow] = 0
            for(let i = 0; i < 4; i += 1) {
                ans[outRow] += m1[outRow+i*4] * v[i]
            }
    }
    return ans
}

function v4multscalar(v, a) {
    return v.map(x=>x*a)
}
function v4addv4(v1, v2) {
    return v1.map((x,i)=>x+v2[i])
}

/**
 * Multiplies any number of matrices and returns the result.
 * Call as m4mult(A, B, C, D) to evaluate $A B C D$.
 */
function m4mult() {
    if (arguments.length == 1) return arguments[0]
    return Array.prototype.reduce.apply(arguments, [m4mult_])
}

/**
 * Returns the transpose of the given matrix
 */
function m4transpose(m) {
    return new Float32Array([m[0],m[4],m[8],m[12], m[1],m[5],m[9],m[13], m[2],m[6],m[10],m[14], m[3],m[7],m[11],m[15]]);
}

/**
 * Creates and returns a new identity matrix
 */
function m4ident() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}

/**
 * Creates and returns a new translation matrix
 * 
 * See <https://cs418.cs.illinois.edu/website/text/math2.html#translation>
 */
function m4translate(x,y,z) {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);
}

/**
 * Creates and returns a new scaling matrix
 * 
 * See <https://cs418.cs.illinois.edu/website/text/math2.html#scaling>
 */
function m4scale(x,y,z) {
    if (y == undefined && z == undefined) z = y = x
    return new Float32Array([x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]);
}

/**
 * Creates and returns a new perspective projection matrix
 * where "forward" is the +z axis.
 * 
 * - `m4perspPosZ(near, far)` assumes 90° FoV in X and Y
 * - `m4perspPosZ(near, far, PI/4, 16/9)` has FoV in Y and 16:9 aspect ratio
 * - `m4perspPosZ(near, far, PI/3, 16, 9)` has FoV in Y and 16:9 aspect ratio
 * 
 * See <https://cs418.cs.illinois.edu/website/text/math2.html#division>
 */
function m4perspPosZ(near, far, fovy, width, height) {
    if (fovy === undefined) {
        var sx = 1, sy = 1;
    } else {
        let aspect = (height === undefined) ? width : width / height
        var sy = 1/Math.tan(fovy/2);
        var sx = sy/aspect;
    }
    return new Float32Array([sx,0,0,0, 0,sy,0,0, 0,0,1, 0,0,(far+near)/(far-near),(2*far*near)/(near-far),0]);
}
/// Like {m4perspPosZ} but -z, not +z, is in front of camera.
function m4perspNegZ(near, far, fovy, width, height) {
    if (fovy === undefined) {
        var sx = 1, sy = 1;
    } else {
        let aspect = (height === undefined) ? width : width / height
        var sy = 1/Math.tan(fovy/2);
        var sx = sy/aspect;
    }
    return new Float32Array([sx,0,0,0, 0,sy,0,0, 0,0,-(far+near)/(far-near),-1, 0,0,(2*far*near)/(near-far),0]);
}


/**
 * Creates and returns a new yz-plane rotation.
 * 
 * See <https://cs418.cs.illinois.edu/website/text/math2.html#rotation>
 */
function m4rotX(ang) {
    let c = Math.cos(ang), s = Math.sin(ang);
    return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);
}
/**
 * Creates and returns a new zx-plane rotation.
 * 
 * See <https://cs418.cs.illinois.edu/website/text/math2.html#rotation>
 */
function m4rotY(ang) {
    let c = Math.cos(ang), s = Math.sin(ang);
    return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
}
/**
 * Creates and returns a new xy-plane rotation.
 * 
 * See <https://cs418.cs.illinois.edu/website/text/math2.html#rotation>
 */
function m4rotZ(ang) {
    let c = Math.cos(ang), s = Math.sin(ang);
    return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]);
}

/** Helper function for rotations */
function m4rotAxis_(r,c,s) {
    omc = 1-c
    let xy = r[0]*r[1]*omc, yz = r[1]*r[2]*omc, zx = r[2]*r[0]*omc
    return new Float32Array([
        r[0]*r[0]*omc + c, xy + r[2]*s, zx - r[1]*s, 0,
        xy - r[2]*s, r[1]*r[1]*omc + c, yz + r[0]*s, 0,
        zx + r[1]*s, yz - r[0]*s, r[2]*r[2]*omc + c, 0,
        0,0,0,1]);
}

/**
 * Creates and returns a new axis + angle rotation.
 * 
 * See <https://cs418.cs.illinois.edu/website/text/math2.html#rotation>
 */
function m4rotAxis(axis, ang) {
    let r = m4normalized_(axis, 3)
    let c = Math.cos(ang), s = Math.sin(ang);
    return m4rotAxis_(r,c,s)
}
/**
 * Creates and returns a rotation that results in a pointing towards b
 * 
 * See <https://cs418.cs.illinois.edu/website/text/math2.html#rotation>
 */
function m4rotAtoB(a,b) {
    a = m4normalized_(a,3)
    b = m4normalized_(b,3)
    let [r, s] = m4normalized2_(m4cross_(a,b))
    let c = m4dot_(a,b)
    return m4rotAxis_(r,c,s)
}

/**
 * Creates and returns a rotation that puts (center-eye) on -z and up near +y,
 * combined with a translation that puts eye at 0,0,0
 * 
 * See <https://cs418.cs.illinois.edu/website/text/math2.html#rotation>
 */
function m4view(eye, center, up) {
    let f = m4normalized_(m4sub_(center,eye,3))
    let r = m4normalized_(m4cross_(f,up))
    let u = m4cross_(r,f)
    return m4mult(new Float32Array([
        r[0],u[0],-f[0],0,
        r[1],u[1],-f[1],0,
        r[2],u[2],-f[2],0,
        0,0,0,1
    ]), m4translate(-eye[0],-eye[1],-eye[2]))
}

/**
 * A helper to display a matrix as four rows of values
 */
function m4pretty_(m) {
    for(let i=0; i<4; i+=1) {
        console.log(m[0+i],m[4+i],m[8+i],m[12+i])
    }
}
