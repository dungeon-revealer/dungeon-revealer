// don't try to use jquery before this is defined, or else it won't be found
require(['common'], function(common) {
    console.log('dm-app.js running');

    //refactor this later
    require(['map', 'jquery'], function(map, jquery) {
        var $ = jquery,
            mapWrapper = document.getElementById('map-wrapper'),
            map1 = map();

        map1.create(mapWrapper);
        //$('#map-wrapper').createMap();
        $('#enter').click(function () {
            $('.splash-js').hide();
            $('.app-js').show();
        });
    });

});