/// <reference path="../../typings/index.d.ts"/>
// set up Argon
var app = Argon.init();
// set our desired reality 
app.reality.setDesired({
    type: 'hosted',
    name: 'My Nearest Streetview',
    url: Argon.resolveURL('../streetview-reality/index.html')
});
