'use strict'

var gl;

var appInput = new Input();
var time = new Time();
var camera = new OrbitCamera(appInput);

var sphereGeometryList = []; // this will be created after loading from a file
var groundGeometry = null;   // this will be procedurally created

var projectionMatrix = new Matrix4();

// the shader that will be used by each piece of geometry (they could each use their own shader but in this case it will be the same)
var textureShaderProgram;

// auto start the app when the html page is ready
window.onload = window['initializeAndStartRendering'];

// we need to asynchronously fetch files from the "server" (your local hard drive)
// all of this is stored in memory on the CPU side and must be fed to the GPU
var loadedAssets = {
    textureTextVS: null, textureTextFS: null,     // our textured shader code text
    sphereJSON: null,                         // the raw JSON for our sphere model
    uvGridImage: null                         // a basic test image
};

// -------------------------------------------------------------------------
function initializeAndStartRendering() {
    initGL();
    loadAssets(function() {
        createShaders(loadedAssets);
        createScene();

        updateAndRender();
    });
}

// -------------------------------------------------------------------------
function initGL(canvas) {
    var canvas = document.getElementById("webgl-canvas");

    try {
        gl = canvas.getContext("webgl", { alpha: false });
        gl.canvasWidth = canvas.width;
        gl.canvasHeight = canvas.height;

        // todo enable depth test (z-buffering)
        gl.enable(gl.DEPTH_TEST);
        // todo enable backface culling
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
    } catch (e) {}

    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

// -------------------------------------------------------------------------
function loadAssets(onLoadedCB) {
    // a list of data to fetch from the "server" (our hard drive)
    var filePromises = [
        fetch('./shaders/unlit.textured.vs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/unlit.textured.fs.glsl').then((response) => { return response.text(); }),
        fetch('./data/sphere.json').then((response) => { return response.json(); }),
        loadImage('./data/uvgrid.png')
    ];

    // once all files are downloaded, this promise function will execute
    Promise.all(filePromises).then(function(values) {
        // Assign loaded data to our named variables
        loadedAssets.textureTextVS = values[0]; // from 1st fetch
        loadedAssets.textureTextFS = values[1]; // from 2nd fetch
        loadedAssets.sphereJSON = values[2];    // from 3rd fetch
        loadedAssets.uvGridImage = values[3];   // from loadImage
    }).catch(function(error) {
        console.error(error.message);
    }).finally(function() {
        onLoadedCB();
    });
}

// -------------------------------------------------------------------------
function createShaders(loadedAssets) {
    textureShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.textureTextVS, loadedAssets.textureTextFS);

    textureShaderProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(textureShaderProgram, "aVertexPosition"),
        vertexTexcoordsAttribute: gl.getAttribLocation(textureShaderProgram, "aTexcoords")
    };

    textureShaderProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(textureShaderProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(textureShaderProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation(textureShaderProgram, "uProjectionMatrix"),
        textureUniform: gl.getUniformLocation(textureShaderProgram, "uTexture"),
        alphaUniform: gl.getUniformLocation(textureShaderProgram, "uAlpha"),
    };
}

// -------------------------------------------------------------------------
function createScene() {
    groundGeometry = new WebGLGeometryQuad(gl, textureShaderProgram);
    groundGeometry.create(loadedAssets.uvGridImage);

    // make it bigger
    var scale = new Matrix4().scale(10.0, 10.0, 10.0);

    // compensate for the model being flipped on its side
    var rotation = new Matrix4().setRotationX(-90);

    groundGeometry.worldMatrix.multiplyRightSide(rotation);
    groundGeometry.worldMatrix.multiplyRightSide(scale);

    for (var i = 0; i < 3; ++i) {
        var sphereGeometry = new WebGLGeometryJSON(gl, textureShaderProgram);
        sphereGeometry.create(loadedAssets.sphereJSON, loadedAssets.uvGridImage);

        // Scale it down so that the diameter is 3 (model is at 100x scale)
        var scale = new Matrix4().scale(0.03, 0.03, 0.03);

        sphereGeometry.worldMatrix.identity();
        sphereGeometry.worldMatrix.multiplyRightSide(scale);

        // raise it by the radius to make it sit on the ground
        sphereGeometry.worldMatrix.translate(0, 1.5, -5 + i * 5);
        sphereGeometry.alpha = 1.0 - 0.8 * (i / 2);

        sphereGeometryList.push(sphereGeometry);
    }
}

// -------------------------------------------------------------------------
function updateAndRender() {
    requestAnimationFrame(updateAndRender);

    var aspectRatio = gl.canvasWidth / gl.canvasHeight;

    time.update();
    camera.update(time.deltaTime, time.secondsElapsedSinceStart);

    // specify what portion of the canvas we want to draw to (all of it, full width and height)
    gl.viewport(0, 0, gl.canvasWidth, gl.canvasHeight);

    // this is a new frame so let's clear out whatever happened last frame
    gl.clearColor(0.707, 0.707, 1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    projectionMatrix.setPerspective(45, aspectRatio, 0.1, 1000);

    // For todo 9, painter algo, set camera psition to be obj variable in camera controller
    // Sort here back to front
    for (var bs = 0; bs < sphereGeometryList.length; ++bs) { // Bubble sort shperes by distance
        for (var i = 0; i < sphereGeometryList.length-1; ++i) { // Length minus one
            var x = camera.position.clone();
            x.subtract(sphereGeometryList[i].worldMatrix);
            var y = camera.position.clone();
            y.subtract(sphereGeometryList[i+1].worldMatrix);
            if(y.length < x.length){  // Second sphere is closer then first, so swap them so they draw back to front
                var tmpSphereGeometry = sphereGeometryList[i+1];
                sphereGeometryList[i+1] = sphereGeometryList[i];
                sphereGeometryList[i] = tmpSphereGeometry;
            }
        }
    }

    groundGeometry.render(camera, projectionMatrix, textureShaderProgram);

    gl.enable(gl.BLEND); // todo - enable blending
    gl.blendFunc(gl.SRC_ALPHA , gl.ONE_MINUS_SRC_ALPHA); // todo - set blend mode source to gl.SRC_ALPHA and destination to gl.ONE_MINUS_SRC_ALPHA
    gl.depthMask(false);// todo - disable writing of objects to the depth buffer (depthMask) (future renders will ignore previous ones)

    for (var i = 0; i < sphereGeometryList.length; ++i) {
         sphereGeometryList[i].render(camera, projectionMatrix, textureShaderProgram);
     }

    gl.disable(gl.BLEND);//blending disabled
    gl.depthMask(true);// todo - return to previous state (disable blending and turn depth writing back on)
}
