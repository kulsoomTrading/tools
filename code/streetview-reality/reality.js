/// <reference path="../../typings/index.d.ts"/>
// save some local references to commonly used classes
var Cartesian3 = Argon.Cesium.Cartesian3;
var Quaternion = Argon.Cesium.Quaternion;
var Matrix3 = Argon.Cesium.Matrix3;
var CesiumMath = Argon.Cesium.CesiumMath;
// set up Argon (unlike regular apps, we call initReality instead of init)
var app = Argon.initReality();
app.context.setDefaultReferenceFrame(app.context.localOriginEastUpSouth);
var mapElement = document.createElement('div');
var subviewElements = [document.createElement('div'), document.createElement('div')];
subviewElements[0].style.width = '100%';
subviewElements[0].style.height = '100%';
subviewElements[1].style.width = '100%';
subviewElements[1].style.height = '100%';
app.view.element.appendChild(mapElement);
app.view.element.appendChild(subviewElements[0]);
app.view.element.appendChild(subviewElements[1]);
subviewElements[0].style.pointerEvents = 'auto';
// google street view is our "renderer" here, so we don't need three.js
var map;
var streetviews;
var currentPanoData;
var transitioning = false; // true;
// The photosphere is a much nicer viewer, but it seems very buggy,
// and breaks if we set the POV while it is transitioning between panorams
google.maps.streetViewViewer = 'photosphere';
window.addEventListener('load', function () {
    // map = new google.maps.Map(mapElement);
    // We select 'webgl' mode so that we can a 3D viewer for our panoramas
    // (this viewer is not as nice as the photosphere option, but it gets the 
    // job done and is less breakable)
    streetviews = [
        new google.maps.StreetViewPanorama(subviewElements[0], { mode: 'webgl' }),
        new google.maps.StreetViewPanorama(subviewElements[1], { mode: 'webgl' })
    ];
    // map.setStreetView(streetviews[0]);
    // streetviews[0].setOptions({enableCloseButton: true});                
    // Enable the pan control so we can cusotmize to trigger device orientation based pose
    streetviews[0].setOptions({ panControl: true });
    app.view.viewportChangeEvent.addEventListener(function () {
        var _loop_1 = function(streetview) {
            google.maps.event.trigger(streetview, 'resize');
            setTimeout(function () { return google.maps.event.trigger(streetview, 'resize'); });
        };
        for (var _i = 0, streetviews_1 = streetviews; _i < streetviews_1.length; _i++) {
            var streetview = streetviews_1[_i];
            _loop_1(streetview);
        }
    });
    var streetViewService = new google.maps.StreetViewService();
    navigator.geolocation.getCurrentPosition(function (position) {
        var coords = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        streetViewService.getPanorama({
            location: coords,
            radius: 1500,
            preference: google.maps.StreetViewPreference.NEAREST
        }, function (data, status) {
            if (status === google.maps.StreetViewStatus.OK) {
                currentPanoData = data;
                // map.setCenter(data.location.latLng);
                streetviews[0].setPano(data.location.pano);
                // streetviews[1].setPano(data.location.pano);
                // Position the panorama entity appropriately
                var latLng = data.location.latLng;
                var altitude = position.coords.altitude || 0;
                var positionValue = Cartesian3.fromDegrees(latLng.lng(), latLng.lat(), altitude, undefined, scratchCartesian);
                panoEntity.position.setValue(positionValue, Argon.Cesium.ReferenceFrame.FIXED);
                var orientationValue = Argon.Cesium.Transforms.headingPitchRollQuaternion(positionValue, 0, 0, 0);
                panoEntity.orientation.setValue(orientationValue);
                // Position the eye as a child of the pano entity
                eyeEntity.position = new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, panoEntity);
            }
            else if (status === google.maps.StreetViewStatus.ZERO_RESULTS) {
                // unable to find nearby panorama (what should we do?)
                alert('Unable to locate nearby streetview imagery.');
            }
            else {
                alert('Error retrieving panorama from streetview service');
            }
        });
    }, function (e) {
        alert(e.message);
    }, {
        enableHighAccuracy: true
    });
});
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
// We need to define a projection matrix for our reality view
var perspectiveProjection = new Argon.Cesium.PerspectiveFrustum();
perspectiveProjection.fov = Math.PI / 2;
// Create an entity to represent the panorama
var panoEntity = new Argon.Cesium.Entity({
    position: new Argon.Cesium.ConstantPositionProperty(undefined, Argon.Cesium.ReferenceFrame.FIXED),
    orientation: new Argon.Cesium.ConstantProperty(Quaternion.IDENTITY)
});
// Create an entity to represent the eye
var eyeEntity = new Argon.Cesium.Entity({
    orientation: new Argon.Cesium.ConstantProperty(Quaternion.IDENTITY)
});
// Creating a lot of garbage slows everything down. Not fun.
// Let's create some recyclable objects that we can use later.
var scratchCartesian = new Cartesian3;
var scratchQuaternion = new Quaternion;
var scratchArray = [];
// disable location updates
app.device.locationUpdatesEnabled = false;
// Reality views must raise frame events at regular intervals in order to 
// drive updates for the entire system. 
function onFrame(time, index) {
    // Get the current display-aligned device orientation relative to the device geolocation
    app.device.update();
    var deviceOrientation = Argon.getEntityOrientation(app.device.displayEntity, time, app.device.geolocationEntity, scratchQuaternion);
    if (deviceOrientation && deviceOrientationControlEnabled) {
        // Rotate the eye according to the device orientation
        // (the eye should be positioned at the current panorama)
        eyeEntity.orientation.setValue(deviceOrientation);
    }
    else if (streetviews && streetviews[0].getPano()) {
        var pov = streetviews[0].getPov();
        var heading = pov.heading * CesiumMath.RADIANS_PER_DEGREE;
        var pitch = pov.pitch * CesiumMath.RADIANS_PER_DEGREE;
        var orientationValue = Quaternion.fromHeadingPitchRoll(heading, pitch, 0, scratchQuaternion);
        eyeEntity.orientation.setValue(orientationValue);
        deviceOrientationControlEnabled = false;
    }
    var viewport = app.view.getMaximumViewport();
    perspectiveProjection.aspectRatio = viewport.width / viewport.height;
    var matrix = perspectiveProjection.infiniteProjectionMatrix;
    // By raising a frame state event, we are describing to the  manager when and where we
    // are in the world, what direction we are looking, and how we are able to render. 
    app.reality.frameEvent.raiseEvent({
        time: time,
        index: index,
        // A reality should pass an "eye" configuration to the manager. The manager will 
        // then construct an appropriate "view" configuration using the eye properties we 
        // send it and other factors unknown to the reality. 
        // For example, the manager may decide to ask applications (including this reality),
        // to render in stereo or in mono, based on wheter or not the user is using a 
        // stereo viewer. 
        // Technically, a reality can instead pass a view configuration to the manager, but 
        // the best practice is to use an eye configuration. Passing a view configuration 
        // is effectively the same thing as telling the manager:
        //      "I am going to render this way, like it or not, don't tell me otherwise"
        // Thus, a view configuration should only be used if absolutely necessary.
        eye: {
            // We must provide a pose representing where we are in world, 
            // and what we are looking at. The viewing direction is always the
            // -Z axis, assuming a right-handed cordinate system with Y pointing up
            // in the camera's local coordinate system. 
            pose: Argon.getSerializedEntityPose(eyeEntity, time),
            // The stereo multiplier tells the manager how we wish to render stereo
            // in relation to the user's interpupillary distance (typically around 0.063m).
            // In this case, since we are using a single panoramic image,
            // we can only render from the center of the panorama (a stereo view 
            // would have the same image in the left and right eyes): thus, we may prefer to use 
            // a stereo multiplier of 0. On the other hand, if our panorama presents a 
            // background that can be considered "far away" or at "infinity", we may prefer to 
            // allow stereo by passing a non-zero value as the multiplier. 
            stereoMultiplier: 0
        }
    });
    app.timer.requestFrame(onFrame);
}
// We can use requestAnimationFrame, or the builtin Argon.TimerService (app.timer),
// The TimerService is more convenient as it will provide the current time 
// as a Cesium.JulianDate object which can be used directly when raising a frame event. 
app.timer.requestFrame(onFrame);
var scratchMatrix3 = new Matrix3;
var compassControl;
var deviceOrientationControlEnabled = true;
// renderEvent is fired whenever argon wants the app to update its display
app.renderEvent.addEventListener(function () {
    if (!streetviews || streetviews[0].getStatus() !== google.maps.StreetViewStatus.OK ||
        !streetviews[0].getPano())
        return;
    if (!compassControl) {
        compassControl = subviewElements[0].querySelector('.iv-tactile-compass');
        if (compassControl) {
            compassControl.style.overflow = 'hidden';
            compassControl.addEventListener('click', function () {
                deviceOrientationControlEnabled = !deviceOrientationControlEnabled;
            });
            var compassTurnControls = subviewElements[0].querySelectorAll('.iv-tactile-compass-turn');
            compassTurnControls.item(0).style.display = 'none';
            compassTurnControls.item(1).style.display = 'none';
            subviewElements[0].querySelector('canvas').addEventListener('touchstart', function () {
                deviceOrientationControlEnabled = false;
            });
        }
    }
    // set the renderer to know the current size of the viewport.
    // This is the full size of the viewport, which would include
    // both views if we are in stereo viewing mode
    var viewport = app.view.getViewport();
    // there is 1 subview in monocular mode, 2 in stereo mode   
    var subviews = app.view.getSubviews();
    for (var _i = 0, subviews_1 = subviews; _i < subviews_1.length; _i++) {
        var subview = subviews_1[_i];
        // set the viewport for this view
        var _a = subview.viewport, x = _a.x, y = _a.y, width = _a.width, height = _a.height;
        var subviewElement = subviewElements[subview.index];
        var streetview = streetviews[subview.index];
        subviewElement.style.left = x + 'px';
        subviewElement.style.bottom = y + 'px';
        subviewElement.style.width = width + 'px';
        subviewElement.style.height = height + 'px';
        // if (subview.index === 0) {
        //     mapElement.style.left = x + 'px';
        //     mapElement.style.bottom = y + 'px';
        //     mapElement.style.width = width + 'px';
        //     mapElement.style.height = height + 'px';
        // }
        // get the heading / pitch / roll
        var rotMatrix = Matrix3.fromQuaternion(subview.pose.orientation, scratchMatrix3);
        var eulerZYX = rotationMatrixToEulerZXY(rotMatrix, scratchCartesian);
        // we assume that our position is as expected, and just set the point of view
        if (deviceOrientationControlEnabled) {
            streetview.setPov({
                heading: eulerZYX.y * CesiumMath.DEGREES_PER_RADIAN,
                pitch: -eulerZYX.x * CesiumMath.DEGREES_PER_RADIAN
            });
            // when in device orientation mode, hide pretty much all the UI
            subviewElement.style.visibility = 'hidden';
            subviewElement.querySelector('canvas').style.visibility = 'visible';
            // make sure we don't hide the copyright / terms of use links / etc
            var alwaysShownElements = subviewElement.querySelectorAll('.gm-style-cc');
            for (var i = 0; i < alwaysShownElements.length; i++) {
                alwaysShownElements.item(i).style.visibility = 'visible';
            }
        }
        else {
            subviewElement.style.visibility = 'visible';
            subviewElement.querySelector('canvas').style.visibility = 'visible';
        }
    }
    if (subviews.length < 2) {
        streetviews[1].setVisible(false);
        subviewElements[1].style.visibility = 'hidden';
    }
    else {
        streetviews[1].setVisible(true);
        subviewElements[1].style.visibility = 'visiblej';
    }
});
function rotationMatrixToEulerZXY(mat, result) {
    var m11 = mat[Matrix3.COLUMN0ROW0];
    var m12 = mat[Matrix3.COLUMN0ROW1];
    var m13 = mat[Matrix3.COLUMN0ROW2];
    var m21 = mat[Matrix3.COLUMN1ROW0];
    var m22 = mat[Matrix3.COLUMN1ROW1];
    var m23 = mat[Matrix3.COLUMN1ROW2];
    var m31 = mat[Matrix3.COLUMN2ROW0];
    var m32 = mat[Matrix3.COLUMN2ROW1];
    var m33 = mat[Matrix3.COLUMN2ROW2];
    result.x = Math.asin(CesiumMath.clamp(m32, -1, 1));
    if (Math.abs(m32) < 0.99999) {
        result.y = Math.atan2(-m31, m33);
        result.z = Math.atan2(-m12, m22);
    }
    else {
        result.y = 0;
        result.z = Math.atan2(m21, m11);
    }
    return result;
}
