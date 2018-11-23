precision mediump float;

attribute vec3 aVertexPosition;
attribute vec2 aTexcoords;

uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

varying vec3 vColor; // todo make sure to pass texture coordinates for interpolation to fragment shader

void main(void) {
    gl_Position = uProjectionMatrix * uViewMatrix * uWorldMatrix * vec4(aVertexPosition, 1.0);
    vColor = aVertexColor; //Todo #2
}