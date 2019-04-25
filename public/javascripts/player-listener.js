define(['settings', 'jquery', 'io', 'panzoom'], function (settings, jquery, io) {
  console.log('player.js starting');
  var $ = jquery,
    socket = io();

  var $panzoom = $("#map-container").panzoom({
    $zoomIn: $('#btn-zoom-in'),
    $zoomOut: $('#btn-zoom-out'),
    $zoomRange: $('#range'),
    increment: 0.4,
    minScale: 1,
    maxScale: 20,
  });

  $("#map-container").on('mousewheel', function (e) {
    e.preventDefault();
    var delta = e.delta || e.originalEvent.wheelDelta;
    var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0;
    $panzoom.panzoom('zoom', zoomOut, {
      animate: false,
      focal: e
    });
  });
  
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

  socket.on('connect', function () {
    console.log('connected to server');
  });

  socket.on('reconnecting', function () {
    console.log('reconnecting to server');
  });

  socket.on('reconnect', function () {
    console.log('reconnected to server');
  });

  socket.on('reconnect_failed', function () {
    console.log('reconnect failed!');
  });

  socket.on('disconnect', function () {
    console.log('disconnected from server');
  });

  //Define the module value by returning a value.
  return function () {
    // TODO: return something useful?
    return "hi";
  };
});
