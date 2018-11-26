precision mediump float;

uniform sampler2D uTexture;
uniform float uAlpha;

varying vec2 vTexCoords; //Todo #2 receive texture coordinates and verify

void main(void) {
    vec4 texColor = texture2D(uTexture, vTexCoords, uAlpha);
    //gl_FragColor = vec4(1,vTexCoords[0],vTexCoords[1],1.0); //Todo #2 receive texture coordinates and verify
    gl_FragColor = (texColor); //Todo #5 switch to texture
}
