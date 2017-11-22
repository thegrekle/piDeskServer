const WebSocket = require('ws');
const gpio = require('rpi-gpio');
var async = require('async');

const wss = new WebSocket.Server({ port: 8080 });

var power = false;
var mute = false;

const pinConfig = {
    power: 18,
    mute: 17
}

wss.on('connection', function connection(ws) {
    gpio.setMode(gpio.MODE_BCM);

    async.parallel([
                function (callback) {
                    gpio.setup(pinConfig.power, gpio.DIR_OUT, callback)
                },
                function (callback) {
                    gpio.setup(pinConfig.mute, gpio.DIR_OUT, callback)
                },
            ], function (err, results) {
                console.log('Pins set up');
                async.series([
                    function (callback) {
                        delayedWrite(pinConfig.mute, true, callback);
                    },
                    function (callback) {
                        delayedWrite(pinConfig.power, power, callback, 0);
                    }
                ], function (err, results) {
                    if (err) {
                        console.error(err);
                    }
                    else {
                        console.log(`Powered ${power ? "on" : "off"}`);
                    }
                });
            });

    ws.on('message', function incoming(message) {
        if (message == 'powerToggle') {
            power = !power;

            
        }

        if (message == 'muteToggle') {
            mute = !mute;

            writePin(pinConfig.mute, mute);
        }
    });

    ws.on('close', function exit(code, reason) {
        gpio.destroy(function () {
            console.log(`Closing connection: ${code} : ${reason}`)
        });
    });

    ws.send('connected to DeskPi');
});

function delayedWrite(pin, value, callback, delay = 250) {
    setTimeout(function () {
        gpio.write(pin, value, callback);
    }, delay);
}
