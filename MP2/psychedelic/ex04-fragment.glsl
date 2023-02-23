#version 300 es
precision highp float;

in vec4 vColor;

uniform float seconds;

out vec4 fragColor;

void main() {
    fragColor = vec4(
            (sin(vColor.x*vColor.x*seconds*100.)+1.)/2.,
            (sin(vColor.y*vColor.y*seconds*100.)+1.)/2.,
            vColor.zw);
    //fragColor = vec4(0,0,0,0);
}

