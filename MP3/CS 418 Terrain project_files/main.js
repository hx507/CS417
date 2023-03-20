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
		window.p = m4perspNegZ(1, 9, 0.7, gl.canvas.width, gl.canvas.height);
		draw();
	}
}

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

	gl.uniform1i(gl.getUniformLocation(program, 'do_clif'), window.do_clif);
	gl.uniform4fv(gl.getUniformLocation(program, 'color'), IlliniOrange);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mult(v, m));
	gl.drawElements(geom.mode, geom.count, geom.type, 0);
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

	const eye = [3 * Math.cos(s2), 3 * Math.sin(s2), 1];
	window.v = m4view([3 * Math.cos(s2), 3 * Math.sin(s2), 1], [0, 0, 0], [0, 0, 1]);
	gl.uniform3fv(gl.getUniformLocation(program, 'eyedir'), new Float32Array(m4normalized_(eye)));

	draw();
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
	window.m = m4ident();
	window.v = m4ident();
	window.p = m4ident();

	// GenTerrain({resolution: 100, slices: 100});
	setupScene('terrain', {resolution: 100, slices: 100});
	// Const data = await fetch('monkey.json').then(r => r.json());
	// addNormals(data);
	// window.geom = setupGeomery(data, program);

	requestAnimationFrame(timeStep);
	fillScreen();
}

/**
 * Generate geometry, render the scene
 */
async function setupScene(scene, options) {
	console.log('To do: render', scene, 'with options', options);
	window.do_clif = 0; // Reset param

	let data;
	if (scene == 'debug') {
		// Const data = await fetch('monkey.json').then(r => r.json());
		data = await fetch('test.json').then(r => r.json());
	addNormals(data);
	} else if (scene == 'terrain') {
		data = genTerrain(options, false);
	addNormals(data);
	} else if (scene == 'color') {
		data = genTerrain(options, true);
	addNormals(data);
	} else if (scene == 'clif') {
		window.do_clif = 1;
		data = genTerrain(options, false);
	addNormals(data);
	} else if (scene == 'torus') {
		data = genTorus(options, false);
	}

	console.log(data);
	window.geom = setupGeomery(data, program);
}

/** Helper function to find the difference of (a prefix of) two vectors */
function norm(x, length) {
	length = length ? Math.min(x.length, length) : x.length;
	const norm = x.map(x => x * x).reduce((partialSum, a) => partialSum + a, 0);
	return norm ** (1 / length);
}

function genTorus(options) {
	console.log('genTorus!');
	const grid
        = {triangles: [],
        	attributes:
            {position: [], color: [], is_clif: [],normal:[]
            },
        };

	const minor_radius = options.ring_puf;
	const major_radius = 0.5;
    let coord = (u,v)=> [
        (major_radius+minor_radius*Math.cos(u))*Math.cos(v),
        (major_radius+minor_radius*Math.cos(u))*Math.sin(v),
        minor_radius*Math.sin(u)
    ]
    let normal = (u,v) => [Math.cos(u)*Math.cos(v),Math.sin(u)*Math.cos(v),Math.sin(v)];

    let curr=0;
	for (let i = 0; i < options.n_ring+2; i++) {
        const v = (Math.PI * 2 * (i / options.n_ring));

        let base=0;
		for (let j = 0; j < options.ring_res; j++) {
            const u = (Math.PI * 2 * ((j) / options.ring_res));
            
            vtx = coord(u,v);
            n = normal(v,u);
            grid.attributes.position.push(vtx);
            grid.attributes.normal.push(n);
            if(i!=0){
                grid.triangles.push([curr,curr-1,curr-options.ring_res])
                grid.triangles.push([curr,curr-options.ring_res+1,curr-options.ring_res])
            }
            curr++;
		}

        //for(let j=base;j<grid.attributes.position.length;j++)
        //for(let k=base;k<grid.attributes.position.length;k++)
        //for(let l=base;l<grid.attributes.position.length;l++)
            //grid.triangles.push([j,k,l])
        if(i!=0)
        base+=options.ring_res;
	}
    //grid.attributes.normal = grid.attributes.normal.map(m4normalized_)
    console.log(grid.attributes.normal)
    console.log(grid.attributes.position)

	for (const i in grid.attributes.position) {
		grid.attributes.color.push([1, 0.373, 0.02, 1]);
		grid.attributes.is_clif.push([0]);
		for (let i = 0; i < grid.attributes.position.length; i++) {
		}
	}

	return grid;
}

function genTerrain(options, do_color) {
	console.log('genTerrain!');
	const eps = 1e-3;
	const step = 2 / options.resolution;
	const grid
        = {triangles: [],
        	attributes:
            {position: [], color: [], is_clif: [],
            },
        };
	for (let i = 0; i < options.resolution; i++) {
		for (let j = 0; j < options.resolution; j++) {
			const x = -1 + i * step;
			const y = -1 + j * step;
		    grid.attributes.position.push([x, y, 0]);
		}
	}

	for (let i = 0; i < options.resolution - 1; i++) {
		for (let j = 0; j < options.resolution - 1; j++) {
			const idx = (x, y) => (x * options.resolution + y);
			const ks = [idx(i, j), idx(i + 1, j), idx(i, j + 1), idx(i + 1, j + 1)];
			grid.triangles.push([ks[0], ks[1], ks[2]], [ks[3], ks[2], ks[1]]);
		}
	}

	// Do cuts:
	const max_height = 2;
	for (let i = 0; i < options.slices; i++) {
		const p = [Math.random() * 2 - 1, Math.random() * 2 - 1, 0];
		const cut2 = [Math.random() * 2 - 1, Math.random() * 2 - 1, 0];
		const dir = m4normalized_(m4sub_(p, cut2));

		for (let j = 0; j < grid.attributes.position.length; j++) {
			const vtx = grid.attributes.position[j];
			const det = m4dot_(m4sub_(vtx, p), dir);

			const delta = max_height / options.slices;
			vtx[2] += det >= 0 ? delta : -delta;

			grid.attributes.position[j] = vtx;
		}
	}

	// Post process
	const zmax = 0;
	const zmin = -1;
	const c = 1 / 2;
	let xmax = Math.max(...grid.attributes.position.map(x => x[2]));
	let xmin = Math.min(...grid.attributes.position.map(x => x[2]));
	const h = (xmax - xmin) * c;
	if (h != 0) {
		for (let j = 0; j < grid.attributes.position.length; j++) {
			const vtx = grid.attributes.position[j];
			const newz = (vtx[2] - zmin) * h / (zmax - zmin) - h / 2;
			vtx[2] = newz;
			grid.attributes.position[j] = vtx;
		}
	}

	// Color map
	xmax = Math.max(...grid.attributes.position.map(x => x[2]));
	xmin = Math.min(...grid.attributes.position.map(x => x[2]));
	for (const i in grid.attributes.position) {
		let z = grid.attributes.position[i][2];
		z = (z - xmin) / (xmax - xmin);
		if (do_color) {
			// Grid.attributes.color.push([z, 0.5, 0.5, 1]);
			grid.attributes.color.push(RainBowColor(z, 1));
		} else {
			grid.attributes.color.push([1, 0.373, 0.02, 1]);
		}
	}

	// Cliff
	for (const i in grid.attributes.position) {
		grid.attributes.is_clif.push([0]);
	}

	for (const i in grid.triangles) {
		const ps = grid.triangles[i].map(x => grid.attributes.position[x]); // Index of points
		for (j in ps) {
			for (k in ps) {
				const v1 = ps[j];
				const v2 = ps[k];
				const slope = Math.abs(v1[2] - v2[2]) / step;
				if (slope >= 1.5) {
					grid.attributes.is_clif[grid.triangles[i][j]] = [1];
					grid.attributes.is_clif[grid.triangles[i][k]] = [1];
				}
			}
		}
	}

	return grid;
}

// https://stackoverflow.com/questions/5137831/map-a-range-of-values-e-g-0-255-to-a-range-of-colours-e-g-rainbow-red-b
function RainBowColor(length, maxLength) {
	const i = (length * 255 / maxLength);
	const r = Math.round(Math.sin(0.024 * i + 0) * 127 + 128);
	const g = Math.round(Math.sin(0.024 * i + 2) * 127 + 128);
	const b = Math.round(Math.sin(0.024 * i + 4) * 127 + 128);
	return [r / 255, g / 255, b / 255, 1];
}

window.addEventListener('load', setup);
window.addEventListener('resize', fillScreen);
