require(['common'], function(common) {
    console.log('dm-app.js running');

    //refactor this later
    require(['map', 'jquery'], function(map, jquery) {
        var $ = jquery,
            mapWrapper = document.getElementById('map-wrapper'),
            map1 = map();

        map1.create(mapWrapper, null, null, function() {
            map1.fitMapToWindow();
            window.addEventListener('resize', function(event) {
                map1.fitMapToWindow();
            });
        });

    });

});