/// <reference path="../typings/browser.d.ts"/>
declare const Argon:any;

const app = Argon.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const userLocation = new THREE.Object3D();
scene.add(camera);
scene.add(userLocation);

const renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    logarithmicDepthBuffer: true
});
renderer.setPixelRatio(window.devicePixelRatio);
app.view.element.appendChild(renderer.domElement);

app.context.setDefaultReferenceFrame(app.context.localOriginEastUpSouth);

var uniforms = {
    amplitude: { type: "f", value: 0.0 }
}

var argonTextObject = new THREE.Object3D();
argonTextObject.position.z = -250;
userLocation.add(argonTextObject);

var loader = new THREE.FontLoader();
loader.load( '../resources/fonts/helvetiker_bold.typeface.js', function ( font:THREE.Font ) {
    var textGeometry = new THREE.TextGeometry( "argon.js", {
        font: font,
        size: 40,
        height: 5,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeometry.center();
    var tessellateModifier = new THREE.TessellateModifier( 8 );
    for ( var i = 0; i < 6; i ++ ) {
        tessellateModifier.modify( textGeometry );
    }
    var explodeModifier = new THREE.ExplodeModifier();
    explodeModifier.modify( textGeometry );
    var numFaces = textGeometry.faces.length;
    
    var bufferGeometry = new THREE.BufferGeometry().fromGeometry( textGeometry );
    var colors = new Float32Array( numFaces * 3 * 3 );
    var displacement = new Float32Array( numFaces * 3 * 3 );
    var color = new THREE.Color();
    for ( var f = 0; f < numFaces; f ++ ) {
        var index = 9 * f;
        var h = 0.07 + 0.1 * Math.random();
        var s = 0.5 + 0.5 * Math.random();
        var l = 0.6 + 0.4 * Math.random();
        color.setHSL( h, s, l );
        var d = 5 + 20 * ( 0.5 - Math.random() );
        for ( var i = 0; i < 3; i ++ ) {
            colors[ index + ( 3 * i )     ] = color.r;
            colors[ index + ( 3 * i ) + 1 ] = color.g;
            colors[ index + ( 3 * i ) + 2 ] = color.b;
            displacement[ index + ( 3 * i )     ] = d;
            displacement[ index + ( 3 * i ) + 1 ] = d;
            displacement[ index + ( 3 * i ) + 2 ] = d;
        }
    }
    bufferGeometry.addAttribute( 'customColor', new THREE.BufferAttribute( colors, 3 ) );
    bufferGeometry.addAttribute( 'displacement', new THREE.BufferAttribute( displacement, 3 ) );
    
    var shaderMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: `
            uniform float amplitude;
            attribute vec3 customColor;
            attribute vec3 displacement;
            varying vec3 vNormal;
            varying vec3 vColor;
            void main() {
                vNormal = normal;
                vColor = customColor;
                vec3 newPosition = position + normal * amplitude * displacement;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vColor;
            void main() {
                const float ambient = 0.4;
                vec3 light = vec3( 1.0 );
                light = normalize( light );
                float directional = max( dot( vNormal, light ), 0.0 );
                gl_FragColor = vec4( ( directional + ambient ) * vColor, 1.0 );
            }
        `
    });
    
    var textMesh = new THREE.Mesh( bufferGeometry, shaderMaterial );
    argonTextObject.add( textMesh );
    
    app.context.updateEvent.addEventListener(() => {
        uniforms.amplitude.value = 1.0 + Math.sin( Date.now() * 0.001 * 0.5 );
    });
});

app.vuforia.init({
	licenseKey: "AXRIsu7/////AAAAAaYn+sFgpkAomH+Z+tK/Wsc8D+x60P90Nz8Oh0J8onzjVUIP5RbYjdDfyatmpnNgib3xGo1v8iWhkU1swiCaOM9V2jmpC4RZommwQzlgFbBRfZjV8DY3ggx9qAq8mijhN7nMzFDMgUhOlRWeN04VOcJGVUxnKn+R+oot1XTF5OlJZk3oXK2UfGkZo5DzSYafIVA0QS3Qgcx6j2qYAa/SZcPqiReiDM9FpaiObwxV3/xYJhXPUGVxI4wMcDI0XBWtiPR2yO9jAnv+x8+p88xqlMH8GHDSUecG97NbcTlPB0RayGGg1F6Y7v0/nQyk1OIp7J8VQ2YrTK25kKHST0Ny2s3M234SgvNCvnUHfAKFQ5KV"
}).then((api)=>{
    api.objectTracker.createDataSet('../resources/datasets/StonesAndChips.xml').then( (dataSet)=>{

        dataSet.load().then(()=>{
            const trackables = dataSet.getTrackables();
            
            const stonesEntity = app.context.subscribeToEntityById(trackables['stones'].id)
            const stonesObject = new THREE.Object3D;
            scene.add(stonesObject);
            
            app.context.updateEvent.addEventListener(() => {
                const stonesPose = app.context.getEntityPose(stonesEntity);

                if (stonesPose.poseStatus & Argon.PoseStatus.KNOWN) {
                    stonesObject.position.copy(stonesPose.position);
                    stonesObject.quaternion.copy(stonesPose.orientation);
                }
                
                if (stonesPose.poseStatus & Argon.PoseStatus.FOUND) {
                    stonesObject.add(argonTextObject);
                    argonTextObject.position.z = 0;
                } else if (stonesPose.poseStatus & Argon.PoseStatus.LOST) {
                    argonTextObject.position.z = -250;
                    userLocation.add(argonTextObject);
                }
                
            })
        });
        
        api.objectTracker.activateDataSet(dataSet);
    });
})

app.context.updateEvent.addEventListener(() => {
    const userPose = app.context.getEntityPose(app.context.user);
    if (userPose.poseStatus & Argon.PoseStatus.KNOWN) {
        userLocation.position.copy(userPose.position);
    }
});
    
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