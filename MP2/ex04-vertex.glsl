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
    vec4 pos = vec4(position.xyz*global_scale,position.w);

    if(do_gpu_move){
        gl_Position = vec4(
                pos.x+cos(seconds*2.+float(gl_VertexID))*.05,
                pos.y-cos(seconds*2.-float(gl_VertexID)-3.)*.05,
                //pos.y,
                pos.zw
                );
    }else
        gl_Position = transform*pos;

}

