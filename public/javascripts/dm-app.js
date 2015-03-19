// don't try to use jquery before this is defined, or else it won't be found
require(['common'], function(common) {
    console.log('dm-app.js running');

    if (false) {
        require(['dmconsole2', 'jquery']);
    }
    else {
        //refactor this later
        require(['map', 'jquery'], function(map, jquery) {
            var $ = jquery,
                mapWrapper = document.getElementById('map-wrapper'),
                map1 = map();

            map1.create(mapWrapper, null, null, function() {
                map1.fitMapToWindow();
                window.addEventListener('resize', function(event){
                    console.log("window resized");
                    map1.fitMapToWindow();
                });
            });

            //$('#map-wrapper').createMap();
            // splash doesnt show for dms so this is useless
            $('#enter').click(function () {
                $('.splash-js').hide();
                $('.app-js').show();
            });


        });
    }

});