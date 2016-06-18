/// <reference path="../../typings/index.d.ts"/>
var app = Argon.init();
app.context.setDefaultReferenceFrame(app.context.localOriginEastUpSouth);
// set up the world
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera();
var stonesObject = new THREE.Object3D();
scene.add(camera);
// for the dat.GUI() instance
var gui;
var headModel = new THREE.Object3D();
stonesObject.add(headModel);
var hud = new THREE.CSS3DArgonHUD();
var renderer = new THREE.WebGLRenderer({
    alpha: true,
    //logarithmicDepthBuffer: true,
    antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
app.view.element.appendChild(renderer.domElement);
app.view.element.appendChild(hud.domElement);
// variables for the application 
var mesh, decal;
var line;
var intersection = {
    intersects: false,
    point: new THREE.Vector3(),
    normal: new THREE.Vector3()
};
var mouse = new THREE.Vector2();
var textureLoader = new THREE.TextureLoader();
var decalDiffuse = textureLoader.load('../resources/textures/decal/decal-diffuse.png');
var decalNormal = textureLoader.load('../resources/textures/decal/decal-normal.jpg');
var decalMaterial = new THREE.MeshPhongMaterial({
    specular: 0x444444,
    map: decalDiffuse,
    normalMap: decalNormal,
    normalScale: new THREE.Vector2(1, 1),
    shininess: 30,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    wireframe: false
});
var decals = [];
var p = new THREE.Vector3(0, 0, 0);
var r = new THREE.Vector3(0, 0, 0);
var s = new THREE.Vector3(10, 10, 10);
var up = new THREE.Vector3(0, 1, 0);
var check = new THREE.Vector3(1, 1, 1);
var params = {
    projection: 'normal',
    minScale: 10,
    maxScale: 20,
    rotate: true,
    clear: function () {
        removeDecals();
    }
};
scene.add(new THREE.AmbientLight(0x443333));
var light = new THREE.DirectionalLight(0xffddcc, 1);
light.position.set(1, 0.75, 0.5);
scene.add(light);
var light = new THREE.DirectionalLight(0xccccff, 1);
light.position.set(-1, 0.75, -0.5);
scene.add(light);
var geometry = new THREE.Geometry();
geometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ linewidth: 4 }));
headModel.add(line);
var raycaster = new THREE.Raycaster();
var mouseHelper = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 10), new THREE.MeshNormalMaterial());
mouseHelper.visible = false;
scene.add(mouseHelper);
window.addEventListener('load', init);
function init() {
    loadLeePerrySmith();
    renderer.domElement.addEventListener('mouseup', function () {
        checkIntersection();
        shoot();
    });
    renderer.domElement.addEventListener('mousemove', onTouchMove);
    renderer.domElement.addEventListener('touchstart', function (event) {
        var x = event.changedTouches[0].pageX;
        var y = event.changedTouches[0].pageY;
        mouse.x = (x / window.innerWidth) * 2 - 1;
        mouse.y = -(y / window.innerHeight) * 2 + 1;
        // prevent touches from emiting mouse events 
        event.preventDefault();
    }, false);
    renderer.domElement.addEventListener('touchend', function (event) {
        var x = event.changedTouches[0].pageX;
        var y = event.changedTouches[0].pageY;
        mouse.x = (x / window.innerWidth) * 2 - 1;
        mouse.y = -(y / window.innerHeight) * 2 + 1;
        // only do touches in mono mode
        if (monoMode) {
            checkIntersection();
            if (intersection.intersects)
                requestAnimationFrame(shoot);
        }
        // prevent touches from emiting mouse events
        event.preventDefault();
    });
    renderer.domElement.addEventListener('touchmove', onTouchMove);
    function onTouchMove(event) {
        var x, y;
        if (event instanceof TouchEvent) {
            x = event.changedTouches[0].pageX;
            y = event.changedTouches[0].pageY;
        }
        else {
            x = event.clientX;
            y = event.clientY;
        }
        mouse.x = (x / window.innerWidth) * 2 - 1;
        mouse.y = -(y / window.innerHeight) * 2 + 1;
        // only do touches in mono mode
        if (monoMode) {
            checkIntersection();
        }
        event.preventDefault();
    }
    gui = new dat.GUI({ autoPlace: false });
    hud.hudElements[0].appendChild(gui.domElement);
    gui.add(params, 'projection', { 'From cam to mesh': 'camera', 'Normal to mesh': 'normal' });
    gui.add(params, 'minScale', 1, 30);
    gui.add(params, 'maxScale', 1, 30);
    gui.add(params, 'rotate');
    gui.add(params, 'clear');
    gui.open();
}
var invWorld = new THREE.Matrix4();
function checkIntersection() {
    if (!mesh)
        return;
    // make sure everything is updated
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects([mesh]);
    if (intersects.length > 0) {
        // get the transform from the world object back to the root of the scene
        invWorld.getInverse(headModel.matrixWorld);
        // need to move the point into "world" object instead of global scene coordinates
        var p = intersects[0].point;
        mouseHelper.position.copy(p);
        intersection.point.copy(p);
        var n = intersects[0].face.normal.clone();
        // the normal is in mesh coords, need it to be in world coords
        n.transformDirection(mesh.matrixWorld);
        intersection.normal.copy(intersects[0].face.normal);
        n.multiplyScalar(10);
        n.add(intersects[0].point);
        mouseHelper.lookAt(n);
        // move line coordinates to "world" object
        line.geometry.vertices[0].copy(intersection.point);
        line.geometry.vertices[1].copy(n);
        line.geometry.vertices[0].applyMatrix4(invWorld);
        line.geometry.vertices[1].applyMatrix4(invWorld);
        line.geometry.verticesNeedUpdate = true;
        intersection.intersects = true;
    }
    else {
        intersection.intersects = false;
    }
}
function loadLeePerrySmith() {
    var loader = new THREE.JSONLoader();
    loader.load('../resources/obj/leeperrysmith/LeePerrySmith.js', function (geometry) {
        var material = new THREE.MeshPhongMaterial({
            specular: 0x111111,
            map: textureLoader.load('../resources/obj/leeperrysmith/Map-COL.jpg'),
            specularMap: textureLoader.load('../resources/obj/leeperrysmith/Map-SPEC.jpg'),
            normalMap: textureLoader.load('../resources/obj/leeperrysmith/Infinite-Level_02_Tangent_SmoothUV.jpg'),
            normalScale: new THREE.Vector2(0.75, 0.75),
            shininess: 25
        });
        mesh = new THREE.Mesh(geometry, material);
        headModel.add(mesh);
        mesh.scale.set(20, 20, 20);
        mesh.rotation.x = THREE.Math.degToRad(90);
    });
}
function shoot() {
    if (params.projection == 'camera') {
        var dir = headModel.getWorldPosition();
        var camPos = camera.getWorldPosition();
        dir.sub(camPos);
        p = intersection.point;
        var m = new THREE.Matrix4();
        var c = dir.clone();
        c.negate();
        c.multiplyScalar(10);
        c.add(p);
        m.lookAt(p, c, up);
        // put the rotation in "world" object coordinates
        m.multiplyMatrices(invWorld, m);
        m = m.extractRotation(m);
        var dummy = new THREE.Object3D();
        dummy.rotation.setFromRotationMatrix(m);
        r.set(dummy.rotation.x, dummy.rotation.y, dummy.rotation.z);
    }
    else {
        p = intersection.point;
        var m = new THREE.Matrix4();
        m.multiplyMatrices(invWorld, mouseHelper.matrixWorld);
        var dummy = new THREE.Object3D();
        dummy.rotation.setFromRotationMatrix(m);
        r.set(dummy.rotation.x, dummy.rotation.y, dummy.rotation.z);
    }
    // move p to "world" object coordinates
    p = p.clone();
    p.applyMatrix4(invWorld);
    var scale = params.minScale + Math.random() * (params.maxScale - params.minScale);
    s.set(scale, scale, scale);
    if (params.rotate)
        r.z = Math.random() * 2 * Math.PI;
    var material = decalMaterial.clone();
    material.color.setHex(Math.random() * 0xffffff);
    var m2 = new THREE.Mesh(new THREE.DecalGeometry(mesh, p, r, s, false), material);
    decals.push(m2);
    headModel.add(m2);
}
function removeDecals() {
    decals.forEach(function (d) {
        headModel.remove(d);
        d = null;
    });
    decals = [];
}
function mergeDecals() {
    var merge = {};
    decals.forEach(function (decal) {
        var uuid = decal.material.uuid;
        var d = merge[uuid] = merge[uuid] || {};
        d.material = d.material || decal.material;
        d.geometry = d.geometry || new THREE.Geometry();
        d.geometry.merge(decal.geometry, decal.matrix);
    });
    removeDecals();
    for (var key in merge) {
        var d = merge[key];
        var mesh = new THREE.Mesh(d.geometry, d.material);
        headModel.add(mesh);
        decals.push(mesh);
    }
}
app.vuforia.init({
    licenseKey: "AXRIsu7/////AAAAAaYn+sFgpkAomH+Z+tK/Wsc8D+x60P90Nz8Oh0J8onzjVUIP5RbYjdDfyatmpnNgib3xGo1v8iWhkU1swiCaOM9V2jmpC4RZommwQzlgFbBRfZjV8DY3ggx9qAq8mijhN7nMzFDMgUhOlRWeN04VOcJGVUxnKn+R+oot1XTF5OlJZk3oXK2UfGkZo5DzSYafIVA0QS3Qgcx6j2qYAa/SZcPqiReiDM9FpaiObwxV3/xYJhXPUGVxI4wMcDI0XBWtiPR2yO9jAnv+x8+p88xqlMH8GHDSUecG97NbcTlPB0RayGGg1F6Y7v0/nQyk1OIp7J8VQ2YrTK25kKHST0Ny2s3M234SgvNCvnUHfAKFQ5KV"
}).then(function (api) {
    api.objectTracker.createDataSet('../resources/datasets/StonesAndChips.xml').then(function (dataSet) {
        dataSet.load().then(function () {
            var trackables = dataSet.getTrackables();
            var stonesEntity = app.context.subscribeToEntityById(trackables['stones'].id);
            app.context.updateEvent.addEventListener(function () {
                var stonesPose = app.context.getEntityPose(stonesEntity);
                if (stonesPose.poseStatus & Argon.PoseStatus.KNOWN) {
                    stonesObject.position.copy(stonesPose.position);
                    stonesObject.quaternion.copy(stonesPose.orientation);
                }
                if (stonesPose.poseStatus & Argon.PoseStatus.FOUND) {
                    scene.add(stonesObject);
                    headModel.position.set(0, 0, 80);
                }
                else if (stonesPose.poseStatus & Argon.PoseStatus.LOST) {
                    scene.remove(stonesObject);
                }
            });
        });
        api.objectTracker.activateDataSet(dataSet);
    });
}).catch(function () {
    if (app.session.isManager) {
        app.context.updateEvent.addEventListener(function () {
            var userPose = app.context.getEntityPose(app.context.user);
            if (userPose.poseStatus & Argon.PoseStatus.KNOWN) {
                headModel.position.copy(userPose.position);
                headModel.quaternion.copy(userPose.orientation);
                headModel.translateZ(-160);
                headModel.rotateX(-Math.PI / 2);
            }
            if (userPose.poseStatus & Argon.PoseStatus.FOUND) {
                scene.add(headModel);
            }
        });
    }
});
var monoMode = false;
app.renderEvent.addEventListener(function () {
    monoMode = (app.view.getSubviews()).length == 1;
    var viewport = app.view.getViewport();
    renderer.setSize(viewport.width, viewport.height);
    hud.setSize(viewport.width, viewport.height);
    var i = 0;
    for (var _i = 0, _a = app.view.getSubviews(); _i < _a.length; _i++) {
        var subview = _a[_i];
        camera.position.copy(subview.pose.position);
        camera.quaternion.copy(subview.pose.orientation);
        camera.projectionMatrix.fromArray(subview.projectionMatrix);
        var _b = subview.viewport, x = _b.x, y = _b.y, width = _b.width, height = _b.height;
        renderer.setViewport(x, y, width, height);
        renderer.setScissor(x, y, width, height);
        renderer.setScissorTest(true);
        renderer.render(scene, camera);
        if (monoMode) {
            // adjust the hud
            hud.setViewport(x, y, width, height, i);
            hud.render(i);
        }
        i++;
    }
});
