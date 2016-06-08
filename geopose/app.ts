/// <reference path="../typings/browser.d.ts"/>
declare const Argon:any;

// grab some handles on APIs we use
const Cesium = Argon.Cesium;
const Cartesian3 = Argon.Cesium.Cartesian3;
const ReferenceFrame = Argon.Cesium.ReferenceFrame;
const JulianDate = Argon.Cesium.JulianDate;
const CesiumMath = Argon.Cesium.CesiumMath;

const app = Argon.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const userLocation = new THREE.Object3D;
scene.add(camera);
scene.add(userLocation);

const cssRenderer = new (<any>THREE).CSS3DArgonRenderer();
const renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    logarithmicDepthBuffer: true
});
renderer.setPixelRatio(window.devicePixelRatio);
app.view.element.appendChild(renderer.domElement);
app.view.element.appendChild(cssRenderer.domElement);

// We put some elements in the index.html, for convenience. 
// So let's duplicate and move the information box to the hudElements 
// of the css renderer
let menu = document.getElementById('menu');
let menu2: HTMLElement = menu.cloneNode( true ) as HTMLElement;
menu2.id = "menu2";   // make the id unique

var menuchild = menu.getElementsByClassName('location');
let elem = menuchild.item(0) as HTMLElement;
menuchild = menu2.getElementsByClassName('location');
let elem2 = menuchild.item(0) as HTMLElement;

menu.remove();
menu2.remove();
cssRenderer.hudElements[0].appendChild(menu);
cssRenderer.hudElements[1].appendChild(menu2);

app.context.setDefaultReferenceFrame(app.context.localOriginEastUpSouth);

// All geospatial objects need to have an Object3D linked to a Cesium Entity.
// We need to do this because Argon needs a mapping between Entities and Object3Ds.
//
// Here we create two objects, showing two slightly different approaches.
//
// First, we position a cube near Georgia Tech using a known LLA.
//
// Second, we will position a cube near our starting location.  This geolocated object starts without a
// location, until our reality is set and we know the location.  Each time the reality changes, we update
// the cube position.

// create a 100m cube with a Buzz texture on it, that we will attach to a geospatial object at Georgia Tech
var buzz = new THREE.Object3D;
var loader = new THREE.TextureLoader();
loader.load( 'buzz.png', function ( texture ) {
    var geometry = new THREE.BoxGeometry(10, 10, 10)
    var material = new THREE.MeshBasicMaterial( { map: texture } )

    var mesh = new THREE.Mesh( geometry, material )
    mesh.scale.set(100,100,100)
    buzz.add( mesh )
});

// have our geolocated object start somewhere, in this case 
// near Georgia Tech in Atlanta.
// you should probably adjust this to a spot closer to you 
// (we found the lon/lat of Georgia Tech using Google Maps)
var gatechGeoEntity = new Cesium.Entity({
    name: "Georgia Tech",
    position: Cartesian3.fromDegrees(-84.398881, 33.778463)
});

var gatechGeoTarget = new THREE.Object3D;
gatechGeoTarget.add(buzz)
scene.add(gatechGeoTarget);

// create a 1m cube with a wooden box texture on it, that we will attach to the geospatial object when we create it
// Box texture from https://www.flickr.com/photos/photoshoproadmap/8640003215/sizes/l/in/photostream/
//, licensed under https://creativecommons.org/licenses/by/2.0/legalcode
var boxGeoObject = new THREE.Object3D;

var box = new THREE.Object3D
var loader = new THREE.TextureLoader()
loader.load( 'box.png', function ( texture ) {
    var geometry = new THREE.BoxGeometry(1, 1, 1)
    var material = new THREE.MeshBasicMaterial( { map: texture } )
    var mesh = new THREE.Mesh( geometry, material )
    box.add( mesh )
})

var boxGeoEntity = new Argon.Cesium.Entity({
    name: "I have a box"
});

boxGeoObject.add(box);

// create a position property that we'll set later
const boxPosition = new Cesium.ConstantPositionProperty(Cartesian3.ZERO.clone(), ReferenceFrame.FIXED);
boxGeoEntity.position = boxPosition;
const boxOrientation = new Cesium.ConstantProperty(Cesium.Quaternion);
boxOrientation.setValue(Cesium.Quaternion.IDENTITY);

var realityInit = false;
var boxCartographicDeg = [0,0,0];
var lastInfoText = "";
var lastTime = null;

// make floating point output a little less ugly
function toFixed(value, precision) {
    var power = Math.pow(10, precision || 0);
    return String(Math.round(value * power) / power);
}

app.updateEvent.addEventListener(() => {
    const userPose = app.context.getEntityPose(app.context.user);
    if (userPose.poseStatus & Argon.PoseStatus.KNOWN) {
        userLocation.position.copy(userPose.position);
    } else {
        // if we don't know the user pose we can't do anything
        return;
    }

    if (!realityInit) {
        const frame = app.context.getDefaultReferenceFrame();

        // set the box's position to 10 meters away from the user.
        const boxPos = userPose.position.clone();
        boxPos.x += 10;
        boxPosition.setValue(boxPos, frame);        
        boxOrientation.setValue(Cesium.Quaternion.IDENTITY);

        // get box position in global coordinates and reset it's
        // position to be independent of the user location, in the 
        // global frame of reference
        const boxPoseFIXED = app.context.getEntityPose(boxGeoEntity, ReferenceFrame.FIXED);

        if (boxPoseFIXED.poseStatus & Argon.PoseStatus.KNOWN) {
            realityInit = true;
            boxPosition.setValue(boxPoseFIXED.position, ReferenceFrame.FIXED);
            boxOrientation.setValue(boxPoseFIXED.orientation);
            scene.add(boxGeoObject);
        }
    }

    var boxPose = app.context.getEntityPose(boxGeoEntity);
    boxGeoObject.position.copy(boxPose.position);        
    boxGeoObject.quaternion.copy(boxPose.orientation);

    var geoPose = app.context.getEntityPose(gatechGeoEntity);
    gatechGeoTarget.position.copy(geoPose.position);        

    var deltaTime = 0;
    if (lastTime) {
        deltaTime = JulianDate.secondsDifference(app.context.getTime(), lastTime);
    } else {
        lastTime = new JulianDate();
    }
    lastTime = app.context.getTime().clone(lastTime);
     
    // make it a little less boring
    buzz.rotateY(2 * deltaTime);
    box.rotateY( 3 * deltaTime);

    //
    // stuff to print out the status message
    //

    // cartographicDegrees is a 3 element array containing [longitude, latitude, height]
    var gpsCartographicDeg = [0,0,0];

    // get user position in global coordinates
    const userPoseFIXED = app.context.getEntityPose(app.context.user, ReferenceFrame.FIXED);
    const userLLA = Cesium.Ellipsoid.WGS84.cartesianToCartographic(userPoseFIXED.position);
    if (userLLA) {
        gpsCartographicDeg = [
            CesiumMath.toDegrees(userLLA.longitude),
            CesiumMath.toDegrees(userLLA.latitude),
            userLLA.height
        ];
    }

    const boxPoseFIXED = app.context.getEntityPose(boxGeoEntity, ReferenceFrame.FIXED);
    const boxLLA = Cesium.Ellipsoid.WGS84.cartesianToCartographic(boxPoseFIXED.position);
    if (boxLLA) {
        boxCartographicDeg = [
            CesiumMath.toDegrees(boxLLA.longitude),
            CesiumMath.toDegrees(boxLLA.latitude),
            boxLLA.height
        ];
    }

    // we'll compute the distance to the cube, just for fun. If the cube could be further away,
    // we'd want to use Cesium.EllipsoidGeodesic, rather than Euclidean distance, but this is fine here.
	var cameraPos = camera.getWorldPosition();
    var buzzPos = buzz.getWorldPosition();
    var boxPos = box.getWorldPosition();
    var distanceToGT = cameraPos.distanceTo( boxPos );
    var distanceToBuzz = cameraPos.distanceTo( buzzPos );

    // create some feedback text
    var infoText = "Geospatial Argon example:\n"
    // infoText = "frame: " + state.frameNumber;
    // infoText += " argon time (" + toFixed(three.argon.time.secondsOfDay, 1) + ")";
    // infoText += " three time (" + toFixed(three.Time.now, 1) + ")\n";
    infoText += "eye (" + toFixed(gpsCartographicDeg[0],6) + ", ";
    infoText += toFixed(gpsCartographicDeg[1], 6) + ", " + toFixed(gpsCartographicDeg[2], 2) + ")\n";
    infoText += "cube(" + toFixed(boxCartographicDeg[0], 6) + ", ";
    infoText += toFixed(boxCartographicDeg[1], 6) + ", " + toFixed(boxCartographicDeg[2], 2) + ")\n";
    infoText += "distance to GT (" + toFixed(distanceToGT,2) + ")";
    infoText += " distance to box (" + toFixed(distanceToBuzz,2) + ")";

    if (lastInfoText !== infoText) { // prevent unecessary DOM invalidations
        elem.innerText = infoText;
        elem2.innerText = infoText;
        lastInfoText = infoText;
    }
})
    
app.renderEvent.addEventListener(() => {
    const viewport = app.view.getViewport();
    renderer.setSize(viewport.width, viewport.height);
    cssRenderer.setSize(viewport.width, viewport.height);

    var i = 0;
    for (let subview of app.view.getSubviews()) {
        camera.position.copy(subview.pose.position);
        camera.quaternion.copy(subview.pose.orientation);
        camera.projectionMatrix.fromArray(subview.projectionMatrix);
        let {x,y,width,height} = subview.viewport;

        var fov = camera.fov;
        cssRenderer.updateCameraFOVFromProjection(camera);
        cssRenderer.setViewport(x,y,width,height, i);
        cssRenderer.render(scene, camera, i);

        renderer.setViewport(x,y,width,height);
        renderer.setScissor(x,y,width,height);
        renderer.setScissorTest(true);
        renderer.render(scene, camera);
    }
})

