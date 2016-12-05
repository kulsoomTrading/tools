/// <reference types="@argonjs/argon" />

// set up Argon
const app = Argon.init();

// request our desired reality (and install if not already installed)
app.reality.request({
    uri: Argon.resolveURL('../streetview-reality/index.html')
})

