define(['settings', 'jquery', 'io'], function (settings, jquery, io) {
    console.log('player.js starting');
    var $ = jquery,
        socket = io();

    socket.on('map update', function (msg) {
        $('.splash-js').hide();
        if (msg && msg.imageData) {
            console.log('got a map update');
            $('#map').remove();
            var map = new Image();
            map.id = 'map';
            map.style.width = '100%';
            map.src = msg.imageData;
            document.getElementById('map-container').appendChild(map);
        }
    });
    
    socket.on('connect', function() {
      console.log('connected to server');
    });
    
    socket.on('reconnecting', function() {
      console.log('reconnecting to server');
    });
    
    socket.on('reconnect', function() {
      console.log('reconnected to server');
    });
    
    socket.on('reconnect_failed', function() {
      console.log('reconnect failed!');
    });

    socket.on('disconnect', function() {
      console.log('disconnected from server');
    });

    //Define the module value by returning a value.
    return function () {
        return "hi";
    };
});


