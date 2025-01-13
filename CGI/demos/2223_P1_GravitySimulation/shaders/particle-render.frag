//#version 300 es
precision mediump float;

varying float fLeft;

void main() {
  gl_FragColor = vec4(0.6*fLeft, 0.2*fLeft, 0.0, 0.1*fLeft);
}