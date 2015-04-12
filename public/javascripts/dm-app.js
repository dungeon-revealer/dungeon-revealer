require(['common'], function(common) {
    console.log('dm-app.js running');

    //refactor this later
    require(['map', 'jquery', 'dropzone'], function(map, jquery, Dropzone) {
        var $ = jquery,
            mapWrapper = document.getElementById('map-wrapper'),
            map1 = map();
            
        var myDropzone = new Dropzone("div#upload", { url: "/upload"});

        map1.create(mapWrapper, null, null, function() {
            map1.fitMapToWindow();
            window.addEventListener('resize', function(event) {
                map1.fitMapToWindow();
            });
        });

    });

});