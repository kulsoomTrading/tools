/// <reference types="@argonjs/argon"/>
/// <reference types="three"/>
/// <reference types="stats" />

// any time we use an INERTIAL frame in Cesium, it needs to know where to find it's
// ASSET folder on the web.  The SunMoonLights computation uses INERTIAL frames, so
// so we need to put the assets on the web and point Cesium at them
var CESIUM_BASE_URL='../resources/cesium/';

// set up Argon
const app = Argon.init();

// this app uses geoposed content, so subscribe to geolocation updates
app.context.subscribeGeolocation();

// set up THREE.  Create a scene, a perspective camera and an object
// for the user's location
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const userLocation = new THREE.Object3D;
scene.add(camera);
scene.add(userLocation);

// We use the standard WebGLRenderer when we only need WebGL-based content
const renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    logarithmicDepthBuffer: true,
    antialias: true
});

// account for the pixel density of the device
renderer.setPixelRatio(window.devicePixelRatio);
// renderer.domElement.style.position = 'absolute';
// renderer.domElement.style.bottom = '0';
// renderer.domElement.style.left = '0';
// renderer.domElement.style.width = '100%';
// renderer.domElement.style.height = '100%';
// app.view.element.appendChild(renderer.domElement);

const hud = new (<any>THREE).CSS3DArgonHUD();

//  We also move the description box to the left Argon HUD.  
// We don't duplicated it because we only use it in mono mode
var holder = document.createElement( 'div' );
var hudDescription = document.getElementById( 'description' );
holder.appendChild(hudDescription);
hud.hudElements[0].appendChild(holder);

// add a performance stats thing to the display
var stats = new Stats();
hud.hudElements[0].appendChild(stats.dom);
// app.view.element.appendChild(hud.domElement);

// set the layers of our view
app.view.setLayers([
    { source: renderer.domElement }, 
    { source: hud.domElement }
]);

// Tell argon what local coordinate system you want.  The default coordinate
// frame used by Argon is Cesium's FIXED frame, which is centered at the center
// of the earth and oriented with the earth's axes.  
// The FIXED frame is inconvenient for a number of reasons: the numbers used are
// large and cause issues with rendering, and the orientation of the user's "local
// view of the world" is different that the FIXED orientation (my perception of "up"
// does not correspond to one of the FIXED axes).  
// Therefore, Argon uses a local coordinate frame that sits on a plane tangent to 
// the earth near the user's current location.  This frame automatically changes if the
// user moves more than a few kilometers.
// The EUS frame cooresponds to the typical 3D computer graphics coordinate frame, so we use
// that here.  The other option Argon supports is localOriginEastNorthUp, which is
// more similar to what is used in the geospatial industry
app.context.setDefaultReferenceFrame(app.context.localOriginEastUpSouth);

// In this example, we are using the actual position of the sun and moon to create lights.
// The SunMoonLights functions are created by ArgonSunMoon.js, and turn on the sun or moon
// when they are above the horizon.  This package could be improved a lot (such as by 
// adjusting the color of light based on distance above horizon, taking the phase of the
// moon into account, etc) but it provides a simple starting point.
const sunMoonLights = new (<any>THREE).SunMoonLights();
// the SunMoonLights.update routine will add/remove the sun/moon lights depending on if
// the sun/moon are above the horizon
scene.add( sunMoonLights.lights );

// add some ambient so things aren't so harshly illuminated
var ambientlight = new THREE.AmbientLight( 0x404040 ); // soft white ambient light 
scene.add(ambientlight);

// install a reality that the user can select from
app.reality.install(Argon.resolveURL('../streetview-reality/index.html'));

// create 6 3D words for the 6 directions.  
var loader = new THREE.FontLoader();
loader.load( '../resources/fonts/helvetiker_regular.typeface.json', function ( font ) {    
    const textOptions = {
        font:<any>font,
        size: 15,
        height: 10,
        curveSegments: 10,
        bevelThickness: 1,
        bevelSize: 1,
        bevelEnabled: true
    }
    
    var textMaterial = new THREE.MeshStandardMaterial({
        color: 0x5588ff
    })
    
    function createDirectionLabel(text, position, rotation) {
        var textGeometry = new THREE.TextGeometry(text, textOptions);
        textGeometry.center();
        var textMesh = new THREE.Mesh(textGeometry, textMaterial);
        if (position.x) textMesh.position.x = position.x;
        if (position.y) textMesh.position.y = position.y;
        if (position.z) textMesh.position.z = position.z;
        if (rotation.x) textMesh.rotation.x = rotation.x;
        if (rotation.y) textMesh.rotation.y = rotation.y;
        if (rotation.z) textMesh.rotation.z = rotation.z;
        userLocation.add(textMesh);
    }
    
    createDirectionLabel("North", {z:-100}, {});
    createDirectionLabel("South", {z:100}, {y:Math.PI});
    createDirectionLabel("East", {x:100}, {y:-Math.PI/2});
    createDirectionLabel("West", {x:-100}, {y:Math.PI/2});
    createDirectionLabel("Up", {y:100}, {x:Math.PI/2});
    createDirectionLabel("Down", {y:-100}, {x:-Math.PI/2});
})


// the updateEvent is called each time the 3D world should be
// rendered, before the renderEvent.  The state of your application
// should be updated here.
app.updateEvent.addEventListener(() => {
    // get the position and orientation (the "pose") of the user
    // in the local coordinate frame.
    const userPose = app.context.getEntityPose(app.context.user);

    // assuming we know the user's pose, set the position of our 
    // THREE user object to match it
    if (userPose.poseStatus & Argon.PoseStatus.KNOWN) {
        userLocation.position.copy(<any>userPose.position);
    }

    // get sun and moon positions, add/remove lights as necessary
    var date = app.context.time;
	sunMoonLights.update(date,app.context.defaultReferenceFrame);
})

// renderEvent is fired whenever argon wants the app to update its display
app.renderEvent.addEventListener(() => {
    // set the renderer to know the current size of the viewport.
    // This is the full size of the viewport, which would include
    // both views if we are in stereo viewing mode
    const view = app.view;
    renderer.setSize(view.renderWidth, view.renderHeight, false);    

    const viewport = view.viewport;
    hud.setSize(viewport.width, viewport.height);

    // There is 1 subview in monocular mode, 2 in stereo mode.
    // If we are in mono view, show the description.  If not, hide it, 
    if (app.view.subviews.length > 1) {
      holder.style.display = 'none';
    } else {
      holder.style.display = 'block';
    }

    // if the viewport width and the renderwidth are different
    // we assume we are rendering on a different surface than
    // the main display, so we reset the pixel ratio to 1
    if (viewport.width != view.renderWidth) {
        renderer.setPixelRatio(1);
    } else {
        renderer.setPixelRatio(window.devicePixelRatio);
    }

    // there is 1 subview in monocular mode, 2 in stereo mode    
    for (let subview of app.view.subviews) {
        // set the position and orientation of the camera for 
        // this subview
        camera.position.copy(<any>subview.pose.position);
        camera.quaternion.copy(<any>subview.pose.orientation);
        // the underlying system provide a full projection matrix
        // for the camera. 
        camera.projectionMatrix.fromArray(<any>subview.frustum.projectionMatrix);

        // set the viewport for this view
        var {x,y,width,height} = subview.renderViewport;
        renderer.setViewport(x,y,width,height);

        // set the webGL rendering parameters and render this view
        renderer.setScissor(x,y,width,height);
        renderer.setScissorTest(true);
        renderer.render(scene, camera);

        // adjust the hud
        var {x,y,width,height} = subview.viewport;
        hud.setViewport(x,y,width,height, subview.index);
        hud.render(subview.index);
    }
    stats.update();
})