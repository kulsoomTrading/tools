/// <reference types="@argonjs/argon" />
/// <reference types="three" />
// any time we use an INERTIAL frame in Cesium, it needs to know where to find it's
// ASSET folder on the web.  The SunMoonLights computation uses INERTIAL frames, so
// so we need to put the assets on the web and point Cesium at them
var CESIUM_BASE_URL = '../resources/cesium/';
// grab some handles on APIs we use
var Cesium = Argon.Cesium;
var Cartesian3 = Argon.Cesium.Cartesian3;
var ReferenceFrame = Argon.Cesium.ReferenceFrame;
var JulianDate = Argon.Cesium.JulianDate;
var CesiumMath = Argon.Cesium.CesiumMath;
// set up Argon
var app = Argon.init();
// this app uses geoposed content, so subscribe to geolocation updates
app.context.subscribeGeolocation();
// set up THREE.  Create a scene, a perspective camera and an object
// for the user's location
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera();
var userLocation = new THREE.Object3D;
scene.add(camera);
scene.add(userLocation);
var boxScene = new THREE.Object3D;
scene.add(boxScene);
var boxEntity = new Argon.Cesium.Entity({
    name: "box scene",
    position: Cartesian3.ZERO,
    orientation: Cesium.Quaternion.IDENTITY
});
// We use the standard WebGLRenderer when we only need WebGL-based content
var renderer = new THREE.WebGLRenderer({
    alpha: true,
    logarithmicDepthBuffer: true
});
// account for the pixel density of the device
renderer.setPixelRatio(window.devicePixelRatio);
renderer.sortObjects = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
app.view.element.appendChild(renderer.domElement);
// to easily control stuff on the display
var hud = new THREE.CSS3DArgonHUD();
// We put some elements in the index.html, for convenience. 
// Here, we retrieve the description box and move it to the 
// the CSS3DArgonHUD hudElements[0].  We only put it in the left
// hud since we'll be hiding it in stereo
var description = document.getElementById('description');
hud.hudElements[0].appendChild(description);
app.view.element.appendChild(hud.domElement);
var stats = new Stats();
hud.hudElements[0].appendChild(stats.dom);
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
// get the user location, which we'll use for coordinate frame conversions
var deviceEntity = app.context.user;
// In this example, we are using the actual position of the sun and moon to create lights.
// The SunMoonLights functions are created by ArgonSunMoon.js, and turn on the sun or moon
// when they are above the horizon.  This package could be improved a lot (such as by 
// adjusting the color of light based on distance above horizon, taking the phase of the
// moon into account, etc) but it provides a simple starting point.
var sunMoonLights = new THREE.SunMoonLights();
// the SunMoonLights.update routine will add/remove the sun/moon lights depending on if
// the sun/moon are above the horizon
scene.add(sunMoonLights.lights);
// make the sun cast shadows
sunMoonLights.sun.castShadow = true;
sunMoonLights.sun.shadow = new THREE.LightShadow(new THREE.PerspectiveCamera(50, 1, 200, 10000));
sunMoonLights.sun.shadow.bias = -0.00022;
sunMoonLights.sun.shadow.mapSize.width = 2048;
sunMoonLights.sun.shadow.mapSize.height = 2048;
// add some ambient so things aren't so harshly illuminated
var ambientlight = new THREE.AmbientLight(0x404040); // soft white ambient light 
scene.add(ambientlight);
// install a reality that the user can select from
app.reality.install(Argon.resolveURL('../streetview-reality/index.html'));
// create 6 3D words for the 6 directions.
var loader = new THREE.FontLoader();
loader.load('../resources/fonts/helvetiker_regular.typeface.js', function (font) {
    var textOptions = {
        font: font,
        size: 15,
        height: 10,
        curveSegments: 10,
        bevelThickness: 1,
        bevelSize: 1,
        bevelEnabled: true
    };
    var textMaterial = new THREE.MeshStandardMaterial({
        color: 0x5588ff
    });
    function createDirectionLabel(text, position, rotation) {
        var textGeometry = new THREE.TextGeometry(text, textOptions);
        textGeometry.center();
        var textMesh = new THREE.Mesh(textGeometry, textMaterial);
        if (position.x)
            textMesh.position.x = position.x;
        if (position.y)
            textMesh.position.y = position.y;
        if (position.z)
            textMesh.position.z = position.z;
        if (rotation.x)
            textMesh.rotation.x = rotation.x;
        if (rotation.y)
            textMesh.rotation.y = rotation.y;
        if (rotation.z)
            textMesh.rotation.z = rotation.z;
        userLocation.add(textMesh);
    }
    createDirectionLabel("North", { z: -100 }, {});
    createDirectionLabel("South", { z: 100 }, { y: Math.PI });
    createDirectionLabel("East", { x: 100 }, { y: -Math.PI / 2 });
    createDirectionLabel("West", { x: -100 }, { y: Math.PI / 2 });
    createDirectionLabel("Up", { y: 100 }, { x: Math.PI / 2 });
    createDirectionLabel("Down", { y: -100 }, { x: -Math.PI / 2 });
});
var objects = [];
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var offset = new THREE.Vector3();
var intersection = new THREE.Vector3();
var INTERSECTED, SELECTED;
var geometry = new THREE.BoxGeometry(1, 1, 1);
for (var i = 0; i < 50; i++) {
    var object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff }));
    object.position.x = Math.random() * 50 - 25;
    object.position.y = Math.random() * 10 + 1;
    object.position.z = Math.random() * 50 - 25;
    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;
    object.scale.x = Math.random() * 3 + 1;
    object.scale.y = Math.random() * 3 + 1;
    object.scale.z = Math.random() * 3 + 1;
    object.castShadow = true;
    object.receiveShadow = true;
    boxScene.add(object);
    object.entity = new Argon.Cesium.Entity({
        name: "box " + i,
        position: Cartesian3.ZERO,
        orientation: Cesium.Quaternion.IDENTITY
    });
    // set the value of the box Entity to this local position, by
    // specifying the frame of reference to our local frame
    object.entity.position.setValue(object.position, boxEntity);
    // orient the box according to the local world frame
    object.entity.orientation.setValue(object.quaternion);
    objects.push(object);
}
renderer.domElement.addEventListener('keydown', onDocumentTouchStart, false);
renderer.domElement.addEventListener('keyup', onDocumentTouchEnd, false);
renderer.domElement.addEventListener('touchstart', onDocumentTouchStart, false);
renderer.domElement.addEventListener('touchend', onDocumentTouchEnd, false);
function onDocumentTouchStart(event) {
    console.log("touch");
    if (event.defaultPrevented) {
        return; // Should do nothing if the key event was already consumed.
    }
    console.log("touch1");
    if (event instanceof TouchEvent) {
        // ok!
    }
    else if (event instanceof KeyboardEvent) {
        if (event.key !== " ") {
            return;
        }
    }
    else {
        return;
    }
    console.log("touch2");
    event.preventDefault();
    mouse.x = mouse.y = 0;
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(mouse, camera);
    console.log("touch3");
    var intersects = raycaster.intersectObjects(objects);
    if (intersects.length > 0) {
        console.log("touch intersect");
        var object = intersects[0].object;
        var date = app.context.getTime();
        var defaultFrame = app.context.getDefaultReferenceFrame();
        var oldpose = app.context.getEntityPose(object.entity);
        console.log("------");
        console.log("touch FIXED pos=" + oldpose.position);
        console.log("touch FIXED quat=" + oldpose.orientation);
        console.log("touch FIXED _value pos=" + object.entity.position._value);
        console.log("touch FIXED _value quat=" + object.entity.orientation._value);
        //Cartesian3.subtract(oldpose.position, accumulatedPositionValue, accumulatedPositionValue);
        if (!Argon.convertEntityReferenceFrame(object.entity, date, deviceEntity)) {
            console.log("touch convert fail");
            return;
        }
        var newpose = app.context.getEntityPose(object.entity);
        console.log("touch DEVICE pos=" + newpose.position);
        console.log("touch DEVICE quat=" + newpose.orientation);
        console.log("touch DEVICE _value pos=" + object.entity.position._value);
        console.log("touch DEVICE _value quat=" + object.entity.orientation._value);
        console.log("------");
        console.log("default ref frame to cube in ");
        // if (!Argon.convertEntityReferenceFrame(object.entity, date, ReferenceFrame.FIXED)) {
        //     console.log("touch convert fail")
        //     return;
        // }
        // newpose = app.context.getEntityPose(object.entity);
        // console.log("touch back to FIXED pos=" + newpose.position);
        // console.log("touch back to FIXED quat=" + newpose.orientation)
        // console.log("touch back to FIXED _value pos=" + object.entity.position._value);
        // console.log("touch back to FIXED _value quat=" + object.entity.orientation._value)
        // if (!Argon.convertEntityReferenceFrame(object.entity, date, deviceEntity)) {
        //     console.log("touch convert fail")
        //     return;
        // }
        // newpose = app.context.getEntityPose(object.entity);
        // console.log("touch back to DEVICE pos=" + newpose.position);
        // console.log("touch back to DEVICE quat=" + newpose.orientation)
        // console.log("touch back to DEVICE pos=" + object.entity.position._value);
        // console.log("touch back to DEVICE quat=" + object.entity.orientation._value)
        boxScene.remove(object);
        userLocation.add(object);
        SELECTED = object;
    }
}
function onDocumentTouchEnd(event) {
    console.log("release");
    if (event instanceof TouchEvent) {
        // ok!
    }
    else if (event instanceof KeyboardEvent) {
        if (event.key !== " ") {
            return;
        }
    }
    else {
        return;
    }
    event.preventDefault();
    if (SELECTED) {
        var date = app.context.getTime();
        // if (!Argon.convertEntityReferenceFrame(SELECTED.entity, date, ReferenceFrame.FIXED)) {
        //     return;
        // }
        if (!Argon.convertEntityReferenceFrame(SELECTED.entity, date, boxEntity)) {
            return;
        }
        var boxPose = app.context.getEntityPose(SELECTED.entity);
        console.log("------");
        console.log("touch released, pos=" + boxPose.position);
        console.log("touch released, quat=" + boxPose.orientation);
        console.log("touch released _value pos=" + SELECTED.entity.position._value);
        console.log("touch released _value quat=" + SELECTED.entity.orientation._value);
        console.log("------");
        var boxPose = app.context.getEntityPose(SELECTED.entity, boxEntity);
        SELECTED.position.copy(boxPose.position);
        SELECTED.quaternion.copy(boxPose.orientation);
        userLocation.remove(SELECTED);
        boxScene.add(SELECTED);
        SELECTED = null;
    }
}
function handleDeviceMove() {
    if (SELECTED) {
        return;
    }
    mouse.x = mouse.y = 0;
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(objects);
    if (intersects.length > 0) {
        if (INTERSECTED != intersects[0].object) {
            if (INTERSECTED)
                INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
            INTERSECTED = intersects[0].object;
            INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
            INTERSECTED.material.color.setHex(0xffff33);
        }
    }
    else {
        if (INTERSECTED)
            INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
        INTERSECTED = null;
    }
}
var boxInit = false;
// since these don't move, we only update them when the origin changes
app.context.localOriginChangeEvent.addEventListener(function () {
    if (boxInit) {
        // // get the local coordinates of the local boxes, and set the THREE objects
        // for (var i =0; i<objects.length; i++) {
        //     var object = objects[i];
        //     var boxPose = app.context.getEntityPose(object.entity);
        //     object.position.copy(boxPose.position);
        //     object.quaternion.copy(boxPose.orientation);
        // }
        var boxPose = app.context.getEntityPose(boxEntity);
        console.log("**** new frame of reference");
        console.log(boxEntity.name + " is at " + boxPose.position);
        boxScene.position.copy(boxPose.position);
        boxScene.quaternion.copy(boxPose.orientation);
    }
});
// the updateEvent is called each time the 3D world should be
// rendered, before the renderEvent.  The state of your application
// should be updated here.
app.updateEvent.addEventListener(function (frame) {
    // get the position and orientation (the "pose") of the user
    // in the local coordinate frame.
    var userPose = app.context.getEntityPose(app.context.user);
    // assuming we know the user's pose, set the position of our 
    // THREE user object to match it
    if (userPose.poseStatus & Argon.PoseStatus.KNOWN) {
        userLocation.position.copy(userPose.position);
    }
    else {
        return;
    }
    // get sun and moon positions, add/remove lights as necessary
    sunMoonLights.update(frame.time, app.context.getDefaultReferenceFrame());
    // the first time through, we create a geospatial position for
    // the box somewhere near us
    if (!boxInit) {
        var defaultFrame = app.context.getDefaultReferenceFrame();
        // for (var i =0; i<objects.length; i++) {
        //     var object = objects[i];
        //     // initial position is relative to user
        //     object.position.add(userPose.position);
        //     // set the value of the box Entity to this local position, by
        //     // specifying the frame of reference to our local frame
        //     object.entity.position.setValue(object.position, defaultFrame);
        //     // orient the box according to the local world frame
        //     object.entity.orientation.setValue(object.quaternion);
        //     // now, we want to move the box's coordinates to the FIXED frame, so
        //     // the box doesn't move if the local coordinate system origin changes.
        //     if (!Argon.convertEntityReferenceFrame(object.entity, frame.time,
        //                                         ReferenceFrame.FIXED)) {
        //         break;
        //     }
        //     var boxPose = app.context.getEntityPose(object.entity);
        //     console.log(object.entity.name + " is at " + boxPose.position);
        //     object.position.copy(boxPose.position);
        //     object.quaternion.copy(boxPose.orientation);
        //     // The above should work for all boxes, no none of them.
        //     boxInit = true;
        // }
        boxScene.position.add(userPose.position);
        boxEntity.position.setValue(boxScene.position, defaultFrame);
        boxEntity.orientation.setValue(boxScene.quaternion);
        if (Argon.convertEntityReferenceFrame(boxEntity, frame.time, ReferenceFrame.FIXED)) {
            var boxPose = app.context.getEntityPose(boxEntity);
            console.log(boxEntity.name + " is at " + boxPose.position);
            boxScene.position.copy(boxPose.position);
            boxScene.quaternion.copy(boxPose.orientation);
            // The above should work for all boxes, no none of them.
            boxInit = true;
        }
    }
    else {
        var boxPose = app.context.getEntityPose(boxEntity);
        if (boxPose.position.x != boxScene.position.x || boxPose.position.y != boxScene.position.y || boxPose.position.z != boxScene.position.z) {
            console.log(boxEntity.name + " is at " + boxPose.position);
        }
        boxScene.position.copy(boxPose.position);
        boxScene.quaternion.copy(boxPose.orientation);
    }
    handleDeviceMove();
    // if one is selected, update it's pose since it's attached to the camera
    if (SELECTED) {
        var boxPose = app.context.getEntityPose(SELECTED.entity);
        SELECTED.position.copy(boxPose.position);
        SELECTED.quaternion.copy(boxPose.orientation);
        var newpose = boxPose;
        //  console.log("touch back to DEVICE pos=" + newpose.position);
        //  console.log("touch back to DEVICE quat=" + newpose.orientation)
    }
});
// renderEvent is fired whenever argon wants the app to update its display
app.renderEvent.addEventListener(function (frame) {
    // if we have 1 subView, we're in mono mode.  If more, stereo.
    var monoMode = (app.view.subviews).length == 1;
    // set the renderer to know the current size of the viewport.
    // This is the full size of the viewport, which would include
    // both views if we are in stereo viewing mode
    var viewport = app.view.viewport;
    renderer.setSize(viewport.width, viewport.height);
    hud.setSize(viewport.width, viewport.height);
    // there is 1 subview in monocular mode, 2 in stereo mode
    for (var _i = 0, _a = app.view.subviews; _i < _a.length; _i++) {
        var subview = _a[_i];
        // set the position and orientation of the camera for
        // this subview
        camera.position.copy(subview.pose.position);
        camera.quaternion.copy(subview.pose.orientation);
        // the underlying system provide a full projection matrix
        // for the camera.
        camera.projectionMatrix.fromArray(subview.frustum.projectionMatrix);
        // set the viewport for this view
        var _b = subview.viewport, x = _b.x, y = _b.y, width = _b.width, height = _b.height;
        renderer.setViewport(x, y, width, height);
        // set the webGL rendering parameters and render this view
        renderer.setScissor(x, y, width, height);
        renderer.setScissorTest(true);
        renderer.render(scene, camera);
        // adjust the hud, but only in mono
        if (monoMode) {
            hud.setViewport(x, y, width, height, subview.index);
            hud.render(subview.index);
        }
    }
    stats.update();
});
