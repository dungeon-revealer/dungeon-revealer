require(['common'], function(common) {
    console.log('dm-app.js running');

    //refactor this later
    require(['map', 'jquery', 'dropzone'], function(map, jquery, Dropzone) {
        var $ = jquery,
            mapWrapper = document.getElementById('map-wrapper'),
            dmMap = map();

        Dropzone.options.upload = { 
            url: "/upload",
            dictDefaultMessage: "Click here or drag and drop an image to upload (PNG only for now)", 
            acceptedFiles: "image/png" // Accept png images only, for now
        };

        dmMap.create(mapWrapper, null, null, function() {
            dmMap.fitMapToWindow();
            window.addEventListener('resize', function(event) {
                dmMap.fitMapToWindow();
            });
        });

    });

});