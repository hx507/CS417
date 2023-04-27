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
		window.p = m4perspNegZ(0.1, 900, 0.9, gl.canvas.width, gl.canvas.height);
		// Draw();
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
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mult(v, m));
	gl.drawElements(geom.mode, geom.count, geom.type, 0);
}

function drawBalls() {
	gl.clearColor(...IlliniBlue); // F(...[1,2,3]) means f(1,2,3)
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(program);
	gl.bindVertexArray(geom.vao);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p);
	// Gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mult(v, m));

	for (let i = 0; i < n; i++) {
		// Console.log('draw 1 ball');
		const ball_size_scale = 1; // Make ball of size 1 have ~radius 1
		window.m = m4mult(m4translate(...balls.position[i]), m4scale(balls.size[i] / ball_size_scale));
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mult(v, m));
		gl.uniform4fv(gl.getUniformLocation(program, 'ball_color'), balls.color[i]);

		gl.drawElements(geom.mode, geom.count, geom.type, 0);
	}
	// Gl.drawElements(geom.mode, geom.count, geom.type, 0);
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

const average = array => array.reduce((a, b) => Number(a) + Number(b)) / array.length;

/**
 * Compute any time-varying or animated aspects of the scene
 */
function timeStep(milliseconds) {
	const seconds = milliseconds / 1000;
	const s2 = Math.cos(seconds / 2) - 1;
	const dt = 0.02;

	window.eye = [4, 4, 1, 1];
	const center = [0, 0, 0, 1];
	window.v = m4view(eye, center, [0, 0, 1]); // Eye, center, up
	gl.uniform3fv(gl.getUniformLocation(program, 'eyedir'), new Float32Array(m4normalized_(eye.slice(0, -1))));

	// Draw();
	drawBalls();

	const elapsed = performance.now() - window.last_render_time; // Keep moving average of fps
	window.last_render_time = performance.now();
	const fps = (1000 / elapsed).toFixed(0);
	if (window.fps_history.length > 100) {
		fps_history.shift();
	}

	fps_history.push(fps);

	document.querySelector('#fps').innerHTML = 'FPS: ' + average(fps_history).toFixed(0);

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
		genBalls(50 * 20);
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

function randInt(max) {
	return Math.floor(Math.random() * max);
}

/* Generate a terrain geometry. If do_color, also generate the accommodating color map as colored vertex data */
function genBalls(n) {
	console.log('genBalls!');

	window.n = n;
	window.bounds = [1.5, 1.5, 1.5];

	const randrange = x => Math.random() * x * 2 - x;
	const randbound = () => randrange(bounds[0] - 0.2);
	const randcolor = () => new Float32Array([Math.random(), Math.random(), Math.random(), 1]);

	window.balls
        = {position: [],
        	size: [],
			color: [],
			mass: [],
			velocity: [],
		};

	const base_size = 0.13;
	const viable_size = [base_size, base_size * 2, base_size * 3];

	for (let i = 0; i < n; i++) {
		balls.position.push([randbound(), randbound(), randbound()]);
		// Balls.size.push(viable_size[randInt(viable_size.length)]);
		if (i < 4) {
			balls.size.push(viable_size[2]);
		} else if (i < 25) {
			balls.size.push(viable_size[1]);
		} else {
			balls.size.push(viable_size[0]);
		}

		balls.mass.push(balls.size[i] ** 3);

		balls.color.push(randcolor());

		balls.velocity.push([randbound(), randbound(), randbound()]);
	}

	// Grid for efficient collision
	window.grid = [];
	window.cell_size = viable_size[2];
	window.cell_row_count = window.bounds.map(x => Math.ceil(x * 2 / cell_size) + 2);
	for (let i = 0; i < cell_row_count[0]; i++) {
		grid.push([]);
		for (let j = 0; j < cell_row_count[1]; j++) {
			grid[i].push([]);
			for (let k = 0; k < cell_row_count[2]; k++) {
				grid[i][j].push(new Set());
			}
		}
	}
}

// x -> i
function g_idx(x){
	let start = -bounds[0];
	let diff = x-start;
	return Math.ceil(diff/cell_size);
}

function clear_grid() {
	window.grid = grid.map(x => x.map(y => y.map(z => z.clear())));
}

function clip(x, u) {
	return Math.min(Math.max(x, -u), u);
}

function stepBalls() {
	const dt = 0.01;

	// Gravity
	const gravity_strength = 0.8;
	for (let i = 0; i < n; i++) {
		balls.velocity[i][2] -= gravity_strength * dt;
	}

	// Drag
	const drag_factor = 0.9;
	for (let i = 0; i < n; i++) {
		balls.velocity[i] = v4multscalar(balls.velocity[i], drag_factor ** dt);
	}

	// Ball-ball collision
	const collide = (i, j) => {
		const v1 = balls.velocity[i];
		const m1 = balls.mass[i];
		const x1 = balls.position[i];
		const v2 = balls.velocity[j];
		const m2 = balls.mass[j];
		const x2 = balls.position[j];

		const f1 = 2 * m2 / (m1 + m2);
		const f2 = v4inner(v4subv4(v1, v2), v4subv4(x1, x2)) / (norm(v4subv4(x1, x2)) ** 2);
		const fv3 = v4subv4(x1, x2);
		const vp = v4subv4(v1, v4multscalar(fv3, f1 * f2));
		return vp;
	};

	// Efficient implimentation
	
	if(true){
		// Linear scan
		for (let i = 0; i < n; i++) {
			const gi = balls.position[i].map(g_idx);
			grid[gi[0]][gi[1]][gi[2]].add(i);
		}
		// Find balls in neibhoring cells
		for (let i = 0; i < n; i++) {
			const gi = balls.position[i].map(g_idx);
			let nbh = new Set()
			for (let a = -1; a < 2; a++) 
			for (let b = -1; b < 2; b++) 
			for (let c = -1; c < 2; c++){
				let nbh_set = grid[gi[0]+a][gi[1]+b][gi[2]+c];
				if(nbh_set){
					for (const elem of nbh_set)
						nbh.add(elem);
				}
			}
			for (const j of nbh){
				if(j==i)continue;
				const x1 = balls.position[i];
				const x2 = balls.position[j];
				const v1 = balls.velocity[i];
				const v2 = balls.velocity[j];
				if (norm(v4subv4(x1, x2)) <= (balls.size[i] + balls.size[j]) * 1.3 && v4inner(v4subv4(v1, v2), v4subv4(x1, x2)) < 0) {
					const v1p = collide(i, j);
					const v2p = collide(j, i);
					balls.velocity[i] = v1p;
					balls.velocity[j] = v2p;
				}
			}
		}


	}

	// Naive implimentation
	if(false)
	for (let i = 0; i < n; i++) {
		for (let j = 0; j < n; j++) {
			if (i == j) {
				continue;
			}

			const x1 = balls.position[i];
			const x2 = balls.position[j];
			const v1 = balls.velocity[i];
			const v2 = balls.velocity[j];
			if (norm(v4subv4(x1, x2)) <= (balls.size[i] + balls.size[j]) * 1.3 && v4inner(v4subv4(v1, v2), v4subv4(x1, x2)) < 0) {
				const v1p = collide(i, j);
				const v2p = collide(j, i);
				balls.velocity[i] = v1p;
				balls.velocity[j] = v2p;
			}
		}
	}


	// Wall collision with non-zero non-one elasticity
	const elasticity = 0.9;
	for (let i = 0; i < n; i++) {
		for (let d = 0; d < 3; d++) {
			if (Math.abs(balls.position[i][d]) + balls.size[i] > window.bounds[d]) {
				balls.velocity[i][d] *= -Math.sign(Math.abs(balls.position[i][d])) * elasticity;
			}
		}
	}

	// Clip into box
	for (let i = 0; i < n; i++) {
		balls.position[i] = balls.position[i].map((x, j) => clip(x, bounds[j] - (balls.size[i])));
	}

	// Step positions based on new velocity
	for (let i = 0; i < n; i++) {
		// Balls.position[i] += v4multscalar(balls.velocity[i], dt);
		balls.position[i] = v4addv4(balls.position[i], v4multscalar(balls.velocity[i], dt));
	}
}

window.fps_history = [];
window.last_render_time = performance.now();
window.addEventListener('load', setup);
window.addEventListener('resize', fillScreen);
setInterval(() => location.reload(), 10_000); // Periodic reset 10 sec
setInterval(stepBalls, 1); // Step every 1ms
