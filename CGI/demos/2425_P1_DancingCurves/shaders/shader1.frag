#version 300 es

precision mediump float;

uniform vec4 u_color;

uniform uint u_point;

out vec4 frag_color;

void main() {
    if(u_point == 1u) {
        float l = length(gl_PointCoord - vec2(0.5f, 0.5f));
        if(l < 0.5f) {
            frag_color = vec4(u_color.xyz, 1.0f) * vec4(1.0f, 1.0f, 1.0f, 0.5f - l);
        } else
            discard;
    } else {
        frag_color = u_color;
        frag_color.w = 1.0f;
    }
}