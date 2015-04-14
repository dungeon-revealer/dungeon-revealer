require(['common'], function(common) {
    console.log('dm-app.js running');

    //refactor this later
    require(['map', 'jquery', 'dropzone', 'settings'], function(map, jquery, Dropzone, settings) {
        var $ = jquery,
            mapWrapper = document.getElementById('map-wrapper'),
            dmMap = map();
        
        Dropzone.options.upload = {
            url: "/upload",
            dictDefaultMessage: "Click here or drag and drop an image to upload (PNG only for now)", 
            acceptedFiles: "image/png", // Accept png images only, for now
            init: function () {
                this.on("complete", function (file) {
                    console.log('complete');
                    this.removeFile(file);
                    checkForMapUpload();
                });
            }
        };
        
        function checkForMapUpload() {
          var jqxhr = $.get(settings.mapImage, function() {
              console.log( "success" );
              createTheMap();
          }).fail(function() {
              console.log('failure')
          });
        }
        
        checkForMapUpload();
        
        function createTheMap() {
            $('#upload').remove();
            dmMap.create(mapWrapper, {
                callback: function() {
                    dmMap.fitMapToWindow();
                    window.addEventListener('resize', function(event) {
                        dmMap.fitMapToWindow();
                    });
                },
                error: function() {
                  console.log('error creating map');
                }
            });
        }

    });

});