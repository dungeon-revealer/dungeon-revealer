define(['settings', 'jquery', 'io'], function (settings, jquery, io) {
    console.log('player.js starting');
    var $ = jquery,
        socket = io();

    socket.on('map update', function (msg) {
        console.log('got a map update');
        $('.splash-js').hide();
        console.log(msg);
        if (msg && msg.imageData) {
            console.log('updating the map');
            $('#map').remove();
            var map = new Image();
            map.id = 'map';
            map.style.width = '100%';
            map.src = msg.imageData;
            document.getElementById('map-container').appendChild(map);
        }
    });

    //Define the module value by returning a value.
    return function () {
        return "hi"
    };
});


