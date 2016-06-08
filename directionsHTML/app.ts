/// <reference path="../typings/browser.d.ts"/>

declare const Argon:any;

const app = Argon.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const userLocation = new THREE.Object3D;
scene.add(camera);
scene.add(userLocation);

const renderer = new (<any>THREE).CSS3DArgonRenderer();
app.view.element.appendChild(renderer.domElement);

app.context.setDefaultReferenceFrame(app.context.localOriginEastUpSouth);

// creating 6 divs to indicate the x y z positioning
var divXpos = document.createElement('div')
var divXneg = document.createElement('div')
var divYpos = document.createElement('div')
var divYneg = document.createElement('div')
var divZpos = document.createElement('div')
var divZneg = document.createElement('div')

// programatically create a stylesheet for our direction divs
// and add it to the document
const style = document.createElement("style");
style.type = 'text/css';
document.head.appendChild(style);
const sheet = <CSSStyleSheet>style.sheet;
sheet.insertRule(`
    .cssContent {
        opacity: 0.5;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        line-height: 100px;
        fontSize: 20px;
        text-align: center;
    }
`, 0);

// Put content in each one  (should do this as a couple of functions)
// for X
divXpos.className = "cssContent"
divXpos.style.backgroundColor = "red"
//divXpos.style.position = 'absolute'
divXpos.innerText = "Pos X = East"

divXneg.className = "cssContent"
divXneg.style.backgroundColor = "red"
//divXneg.style.position = 'absolute'
divXneg.innerText = "Neg X = West"

// for Y
divYpos.className = "cssContent"
divYpos.style.backgroundColor = "blue"
//divYpos.style.position = 'absolute'
divYpos.innerText = "Pos Y = Up"

divYneg.className = "cssContent"
divYneg.style.backgroundColor = "blue"
//divYneg.style.position = 'absolute'
divYneg.innerText = "Neg Y = Down"

//for Z
divZpos.className = "cssContent"
divZpos.style.backgroundColor = "green"
//divZpos.style.position = 'absolute'
divZpos.innerText = "Pos Z = South"

divZneg.className = "cssContent"
divZneg.style.backgroundColor = "green"
//divZneg.style.position = 'absolute'
divZneg.innerText = "Neg Z = North"

// create 6 CSS3DObjects in the scene graph
var cssObjectXpos = new (<any>THREE).CSS3DObject(divXpos)
var cssObjectXneg = new (<any>THREE).CSS3DObject(divXneg)
var cssObjectYpos = new (<any>THREE).CSS3DObject(divYpos)
var cssObjectYneg = new (<any>THREE).CSS3DObject(divYneg)
var cssObjectZpos = new (<any>THREE).CSS3DObject(divZpos)
var cssObjectZneg = new (<any>THREE).CSS3DObject(divZneg)

// the width and height is used to align things.
cssObjectXpos.position.x = 200.0
cssObjectXpos.position.y = 0.0
cssObjectXpos.position.z = 0.0
cssObjectXpos.rotation.y = - Math.PI / 2

cssObjectXneg.position.x = -200.0
cssObjectXneg.position.y = 0.0
cssObjectXneg.position.z = 0.0
cssObjectXneg.rotation.y =  Math.PI / 2

// for Y
cssObjectYpos.position.x = 0.0
cssObjectYpos.position.y = 200.0
cssObjectYpos.position.z = 0.0
cssObjectYpos.rotation.x = Math.PI / 2

cssObjectYneg.position.x = 0.0
cssObjectYneg.position.y = - 200.0
cssObjectYneg.position.z = 0.0
cssObjectYneg.rotation.x = - Math.PI / 2

// for Z
cssObjectZpos.position.x = 0.0
cssObjectZpos.position.y = 0.0
cssObjectZpos.position.z = 200.0
cssObjectZpos.rotation.y = Math.PI

cssObjectZneg.position.x = 0.0
cssObjectZneg.position.y = 0.0
cssObjectZneg.position.z = -200.0
//no rotation need for this one

userLocation.add(cssObjectXpos)
userLocation.add(cssObjectXneg)
userLocation.add(cssObjectYpos)
userLocation.add(cssObjectYneg)
userLocation.add(cssObjectZpos)
userLocation.add(cssObjectZneg)

app.updateEvent.addEventListener(() => {
    const userPose = app.context.getEntityPose(app.context.user);

    if (userPose.poseStatus & Argon.PoseStatus.KNOWN) {
        userLocation.position.copy(userPose.position);
    }
})
    
// for the CSS renderer, we really need to use rAF to 
// limit the number of repairs of the DOM
var viewport = null;
var subViews = null;
var rAFpending = false;

app.renderEvent.addEventListener(() => {
    if (!rAFpending) {
        rAFpending = true;
        viewport = app.view.getViewport();
        subViews = app.view.getSubviews();
        window.requestAnimationFrame(renderFunc);
    }
});

function renderFunc() {
    rAFpending = false;
    renderer.setSize(viewport.width, viewport.height);
    
    var i = 0;
    for (let subview of subViews) {
        camera.position.copy(subview.pose.position);
        camera.quaternion.copy(subview.pose.orientation);
        camera.projectionMatrix.fromArray(subview.projectionMatrix);
        renderer.updateCameraFOVFromProjection(camera);

        let {x,y,width,height} = subview.viewport;
        renderer.setViewport(x,y,width,height, i);
        renderer.render(scene, camera, i);
        i++;
    }
}
