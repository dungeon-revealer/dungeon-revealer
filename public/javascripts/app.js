require.config({
    shim : {
        "bootstrap" : { "deps" :['jquery'] }
    },
    paths: {
        'jquery' : '//code.jquery.com/jquery-2.1.1.min',
        'bootstrap' :  '//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min',
        'io' : '//cdn.socket.io/socket.io-1.2.0'
    }
});

require(['settings', 'jquery', 'io', 'bootstrap'], function(settings, $, io){

    // DOM ready
    $(function(){

        console.log('started');
    });
});