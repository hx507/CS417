const IlliniBlue = new Float32Array([0.075, 0.16, 0.292, 1]);
const IlliniOrange = new Float32Array([1, 0.373, 0.02, 1]);

/**
 * Resizes the canvas to completely fill the screen
 */
function fillScreen() {
	const canvas = document.querySelector('canvas');
	document.body.style.margin = '0';
	canvas.style.width = '100%';
	canvas.style.height = '100%';
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	canvas.style.width = '';
	canvas.style.height = '';
	window.p = m4perspNegZ(1, 9, 0.7, canvas.width, canvas.height);
	if (window.gl) {
		gl.viewport(0, 0, canvas.width, canvas.height);
		window.p = m4perspNegZ(0.1, 900, 1.5, gl.canvas.width, gl.canvas.height);
		//draw();
		drawBalls();
	}
}

/**
 * Automatically calculate normal by looking at triangles
 * */
function addNormals(data) {
	const normals = Array.from({length: data.attributes.position.length});
	for (let i = 0; i < normals.length; i += 1) {
		normals[i] = Array.from({length: 3}).fill(0);
	}

	for ([i0, i1, i2] of data.triangles) {
		// Find the vertex positions

		const p0 = data.attributes.position[i0];
		const p1 = data.attributes.position[i1];
		const p2 = data.attributes.position[i2];

		// Find the edge vectors and normal
		const e0 = m4sub_(p0, p2);
		const e1 = m4sub_(p1, p2);
		const n = m4cross_(e0, e1);
		// Loop over x, y and z
		for (let j = 0; j < 3; j += 1) {
			// Add a coordinate of a normal to each of the three normals
			normals[i0][j] += n[j];
			normals[i1][j] += n[j];
			normals[i2][j] += n[j];
		}
	}

	for (let i = 0; i < normals.length; i += 1) {
		normals[i] = m4normalized_(normals[i]);
	}

	data.attributes.normal = normals;
}

//---------------------------------------------------------------
/*
**
 * Sends per-vertex data to the GPU and connects it to a VS input
 *
 * @param data    a 2D array of per-vertex data (e.g. [[x,y,z,w],[x,y,z,w],...])
 * @param program a compiled and linked GLSL program
 * @param vsIn    the name of the vertex shader's `in` attribute
 * @param mode    (optional) gl.STATIC_DRAW, gl.DYNAMIC_DRAW, etc
 *
 * @returns the ID of the buffer in GPU memory; useful for changing data later
 */
function supplyDataBuffer(data, program, vsIn, mode) {
	if (mode === undefined) {
		mode = gl.STATIC_DRAW;
	}

	const buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	const f32 = new Float32Array(data.flat());
	gl.bufferData(gl.ARRAY_BUFFER, f32, mode);

	const loc = gl.getAttribLocation(program, vsIn);
	gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(loc);

	return buf;
}

/**
 * Draw one frame
 */
function draw() {
	gl.clearColor(...IlliniBlue); // F(...[1,2,3]) means f(1,2,3)
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(program);
	gl.bindVertexArray(geom.vao);
	gl.uniform1i(gl.getUniformLocation(program, 'texture'), gl.TEXTURE0);
	gl.uniform1i(gl.getUniformLocation(program, 'do_fog'), window.do_fog);
	gl.uniform4fv(gl.getUniformLocation(program, 'bg_color'), IlliniBlue);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mult(v, m));
	gl.drawElements(geom.mode, geom.count, geom.type, 0);
}

function drawBalls() {
	gl.clearColor(...IlliniBlue); // F(...[1,2,3]) means f(1,2,3)
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(program);
	gl.bindVertexArray(geom.vao);
	gl.uniform1i(gl.getUniformLocation(program, 'texture'), gl.TEXTURE0);
	gl.uniform1i(gl.getUniformLocation(program, 'do_fog'), window.do_fog);
	gl.uniform4fv(gl.getUniformLocation(program, 'bg_color'), IlliniBlue);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p);
	//gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mult(v, m));

    for (let i=0;i<50;i++) {
        console.log("draw 1 ball")
        window.m = m4mult( m4translate(...balls.position[i]),m4scale(balls.size[i]));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mult(v, m));
        gl.uniform4fv(gl.getUniformLocation(program, 'color'), balls.color[i]);

        gl.drawElements(geom.mode, geom.count, geom.type, 0);
    }
	//gl.drawElements(geom.mode, geom.count, geom.type, 0);
}

/**
 * Creates a Vertex Array Object and puts into it all of the data in the given
 * JSON structure, which should have the following form:
 *
 * ````
 * {"triangles": a list of of indices of vertices
 * ,"attributes":
 *  {name_of_vs_input_1: a list of 1-, 2-, 3-, or 4-vectors, one per vertex
 *  ,name_of_vs_input_2: a list of 1-, 2-, 3-, or 4-vectors, one per vertex
 *  }
 * }
 * ````
 *
 * @returns an object with four keys:
 *  - mode = the 1st argument for gl.drawElements
 *  - count = the 2nd argument for gl.drawElements
 *  - type = the 3rd argument for gl.drawElements
 *  - vao = the vertex array object for use with gl.bindVertexArray
 */
function setupGeomery(geom, program) {
	const triangleArray = gl.createVertexArray();
	gl.bindVertexArray(triangleArray);

	for (const name in geom.attributes) {
		const data = geom.attributes[name];
		supplyDataBuffer(data, program, name);
	}

	const indices = new Uint16Array(geom.triangles.flat());
	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

	return {
		mode: gl.TRIANGLES,
		count: indices.length,
		type: gl.UNSIGNED_SHORT,
		vao: triangleArray,
	};
}

/**
 * Compute any time-varying or animated aspects of the scene
 */
function timeStep(milliseconds) {
	const seconds = milliseconds / 1000;
	const s2 = Math.cos(seconds / 2) - 1;
	const dt = 0.02;

	window.eye = [2, 2, 1, 1];
	const center = [0, 0, 0, 1];
	window.v = m4view(eye, center, [0, 0, 1]); // Eye, center, up
	gl.uniform3fv(gl.getUniformLocation(program, 'eyedir'), new Float32Array(m4normalized_(eye.slice(0, -1))));

	//draw();
    drawBalls();
	requestAnimationFrame(timeStep);
}

/**
 * Compile, link, set up geometry
 */
async function setup(event) {
	window.gl = document.querySelector('canvas').getContext('webgl2',
		// Optional configuration object: see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
		{antialias: false, depth: true, preserveDrawingBuffer: true},
	);
	const vs = document.querySelector('#vert').textContent.trim();
	const fs = document.querySelector('#frag').textContent.trim();
	window.program = compileAndLinkGLSL(vs, fs);
	gl.enable(gl.DEPTH_TEST);
	// Window.m = m4ident();
	window.m = m4scale(0.5);
	window.v = m4ident();
	window.p = m4ident();

	await setupScene('terrain', {resolution: 100, slices: 100});

	requestAnimationFrame(timeStep);
	fillScreen();
}

/**
 * Generate geometry, render the scene
 */
async function setupScene(scene, options) {
	console.log('To do: render', scene, 'with options', options);
	window.do_fog = 0; // Reset param
	window.do_ground = 0;

	let data;
	if (scene == 'debug') {
		// Const data = await fetch('monkey.json').then(r => r.json());
		data = await fetch('test.json').then(r => r.json());
		addNormals(data);
	} else if (scene == 'terrain') {
		genBalls(50);
		data = await fetch('sphere80.json').then(r => r.json());
		addNormals(data);
	}

	window.geom = setupGeomery(data, program);
}

/** Helper function to find the difference of (a prefix of) two vectors */
function norm(x, length) {
	length = length ? Math.min(x.length, length) : x.length;
	const norm = x.map(x => x * x).reduce((partialSum, a) => partialSum + a, 0);
	return norm ** (1 / length);
}

/* Generate a terrain geometry. If do_color, also generate the accommodating color map as colored vertex data */
function genBalls(n) {
	console.log('genBalls!');

	window.xbound = 1;
	window.ybound = 1;
	window.zbound = 1;

    let randbound = ()=>Math.random()*2-1;
    let randcolor = ()=>new Float32Array([Math.random(),Math.random(),Math.random(), 1]);

	window.balls
        = {position: [],
        	size: [],
			color: [],
			mass: [],
            velocity: [],
		};

    for(let i=0;i<n;i++){
        balls.position.push([randbound(),randbound(),randbound()])
        balls.size.push([0.1])
        balls.color.push(randcolor())
    }

}

window.addEventListener('load', setup);
window.addEventListener('resize', fillScreen);