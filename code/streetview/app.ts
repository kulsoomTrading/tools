/// <reference path="../../typings/index.d.ts"/>

// When we distribute Argon typings, we can get rid of this, but for now
// we need to shut up the Typescript compiler about missing Argon typings
declare const Argon:any;

// set up Argon
const app = Argon.init();

// set our desired reality 
app.reality.setDesired({
    type:'hosted',
    name: 'My Nearest Streetview',
    url: Argon.resolveURL('../streetview-reality/index.html')
})