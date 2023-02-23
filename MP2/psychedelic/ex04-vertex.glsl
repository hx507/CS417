#version 300 es

in vec4 position;
in vec4 color;

uniform float global_scale;
uniform float seconds;
uniform mat4 transform;
uniform bool do_gpu_move; // If doing gpu based vertex movement

out vec4 vColor;

void main() {
    vColor = color;
    gl_Position = position;

}

