#version 300 es

in vec4 position;
in vec4 color;

uniform float global_scale;
uniform float seconds;
uniform mat4 transform;

out vec4 vColor;

void main() {
    vColor = color;
    gl_Position = transform*vec4(position.xyz*global_scale,position.w);
    //gl_Position = vec4(
    //position.xy*cos(seconds*0.6180339887498949),
    //position.zw
    //);
}

