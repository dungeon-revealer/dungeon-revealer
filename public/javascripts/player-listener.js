define(['settings', 'jquery', 'io'], function (settings, jquery, io) {
    console.log('player.js starting');
    var $ = jquery,
        socket = io();

    socket.on('map update', function (msg) {
        $('.splash-js').hide();
        if (msg && msg.imageData) {
            console.log('got a map update');
            $('.oldest').remove();
            $('.map').addClass('oldest').css('z-index', '30');
            var oldMap = document.querySelector('.map');
            var newMap = new Image();
            newMap.style.width = '100%';
            newMap.style.zIndex = 20;
            newMap.src = msg.imageData;
            newMap.className = "map";
            document.getElementById('map-container').appendChild(newMap);
            $('.oldest').addClass('transparent');
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
        // TODO: return something useful?
        return "hi";
    };
});


