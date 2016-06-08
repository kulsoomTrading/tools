/// <reference path="../typings/browser.d.ts"/>
declare const Argon:any;

const app = Argon.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const userLocation = new THREE.Object3D;
scene.add(camera);
scene.add(userLocation);

const renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    logarithmicDepthBuffer: true
});
renderer.setPixelRatio(window.devicePixelRatio);
app.view.element.appendChild(renderer.domElement);

app.context.setDefaultReferenceFrame(app.context.localOriginEastUpSouth);

const geometry = new THREE.SphereGeometry( 30, 32, 32 );

let mat = new THREE.MeshBasicMaterial( {color: 0xff0000, opacity: 0.6} );

const posXSphere = new THREE.Mesh( geometry, mat );
posXSphere.position.x = 200;
userLocation.add( posXSphere );
 
mat = new THREE.MeshBasicMaterial( {color: 0xffaaaa, opacity: 0.6} );

const negXSphere = new THREE.Mesh( geometry, mat );
negXSphere.position.x = -200;
userLocation.add( negXSphere );

mat = new THREE.MeshBasicMaterial( {color: 0x00ff00, opacity: 0.6} );

const posYSphere = new THREE.Mesh( geometry, mat );
posYSphere.position.y = 200;
userLocation.add( posYSphere );

mat = new THREE.MeshBasicMaterial( {color: 0xaaffaa, opacity: 0.6} );

const negYSphere = new THREE.Mesh( geometry, mat );
negYSphere.position.y = -200;
userLocation.add( negYSphere );

mat = new THREE.MeshBasicMaterial( {color: 0x0000ff, opacity: 0.6} );

const posZSphere = new THREE.Mesh( geometry, mat );
posZSphere.position.z = 200;
userLocation.add( posZSphere );

mat = new THREE.MeshBasicMaterial( {color: 0xaaaaff, opacity: 0.6} );

const negZSphere = new THREE.Mesh( geometry, mat );
negZSphere.position.z = -200;
userLocation.add( negZSphere );

var loader = new THREE.FontLoader();
loader.load( '../resources/fonts/helvetiker_regular.typeface.js', function ( font:THREE.Font ) {
    
    const textOptions = {
        font: font,
        size: 5,
        height: 5,
        curveSegments: 3,
        bevelThickness: 0,
        bevelSize: 0,
        bevelEnabled: false
    }
    
    var textMaterial = new THREE.MeshBasicMaterial({
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

app.updateEvent.addEventListener(() => {
    const userPose = app.context.getEntityPose(app.context.user);

    if (userPose.poseStatus & Argon.PoseStatus.KNOWN) {
        userLocation.position.copy(userPose.position);
    }
})
    
app.renderEvent.addEventListener(() => {
    const viewport = app.view.getViewport();
    renderer.setSize(viewport.width, viewport.height);
    
    for (let subview of app.view.getSubviews()) {
        camera.position.copy(subview.pose.position);
        camera.quaternion.copy(subview.pose.orientation);
        camera.projectionMatrix.fromArray(subview.projectionMatrix);
        let {x,y,width,height} = subview.viewport;
        renderer.setViewport(x,y,width,height);
        renderer.setScissor(x,y,width,height);
        renderer.setScissorTest(true);
        renderer.render(scene, camera);
    }
})