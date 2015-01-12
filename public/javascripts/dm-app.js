// don't try to use jquery before this is defined, or else it won't be found
require(['common'], function(common) {
    console.log('dm-app.js running');
    //refactor this later
    require(['dmconsole2', 'jquery'], function(dmconsole2, jquery) {
        var $ = jquery;
        $('#enter').click(function () {
            $('.splash-js').hide();
            $('.app-js').show();
        });
    });


});