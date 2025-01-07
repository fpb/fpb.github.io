#version 300 es

precision mediump float;

#define MAX_FUNCS 7

uniform mat3 m[MAX_FUNCS];
uniform float p[MAX_FUNCS];
uniform int nfuncs;

// Inputs
in vec2 position;

// Outputs
out vec2 new_position;
out float new_hue;

float random(vec2 st)
{
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

vec2 apply_function(vec2 p, int f) {

    return (m[f] * vec3(p, 1.0)).xy;
}

int select_function(float r) 
{
    int f = 0;

    while(r > p[f]) {
        f++;
    }

    return f;
}
void main() {
    // Generate a pseudo random number
    float r = random(position);
    int f = select_function(r);
    new_position = apply_function(position, f);
    new_hue = float(f)/float(nfuncs);
}