require(["common"], function() {
  console.log("dm-app.js running");

  //refactor this later
  require(["map", "jquery", "dropzone", "settings"], function(
    map,
    jquery,
    Dropzone,
    settings
  ) {
    const $ = jquery;
    const mapWrapper = document.getElementById("map-wrapper");
    const dmMap = map();

    $("#upload")
      .addClass("dropzone")
      .dropzone({
        url: "/upload",
        dictDefaultMessage: "Click here or drag and drop an image to upload",
        acceptedFiles: "image/*",
        init: function() {
          this.on("addedfile", function() {
            console.log("added file");
          });

          this.on("complete", function(file) {
            console.log("complete");
            this.removeFile(file);
            checkForMapUpload();
          });
        }
      });

    function checkForMapUpload() {
      $.get(settings.mapImage, function() {
        console.log("success");
        createTheMap();
      }).fail(function() {
        console.log("failure");
      });
    }

    checkForMapUpload();

    function createTheMap() {
      $("#upload").hide();
      dmMap.create(mapWrapper, {
        callback: function() {
          dmMap.fitMapToWindow();
          window.addEventListener("resize", function() {
            dmMap.fitMapToWindow();
          });
        },
        error: function() {
          console.error("error creating map");
        }
      });
    }

    $("#btn-new-map").click(function() {
      dmMap.remove();
      $("#upload").show();
    });
  });
});
