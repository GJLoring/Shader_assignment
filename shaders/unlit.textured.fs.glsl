precision mediump float;

uniform sampler2D uTexture;
uniform float uAlpha;

varying vec3 vColor; //Todo #2

void main(void) {
    gl_FragColor = vec4(vColor, uAlpha);
}
