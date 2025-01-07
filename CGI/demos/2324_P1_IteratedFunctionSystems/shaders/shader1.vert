#version 300 es

precision mediump float;

uniform float scale;
uniform float aspect;

uniform vec2 offset;

in vec2 position;
in float in_hue;

out float hue;

void main()
{
    gl_PointSize = 1.0;
    gl_Position = vec4((position + offset)/vec2(scale*aspect, scale), 0.0, 1.0);
    hue = in_hue;
}