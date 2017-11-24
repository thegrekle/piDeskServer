const WebSocket = require('ws');
const gpio = require('rpi-gpio');
var rpio = require('rpio');
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
            delayedWrite(pinConfig.mute, power, function(){}, 0);
            delayedWrite(pinConfig.power, power, function(){}, 250);
            delayedWrite(pinConfig.mute, !power, function(){}, 250);         
        }

        if (message == 'muteToggle') {
            mute = !mute;
            delayedWrite(pinConfig.mute, mute, function(){}, 0);
        }

	if (message.startsWith('setVolume')) {
	    var volume = message.split(':')[1];
	    console.log(`Setting volume to: ${volume}`);
	    setVolume(volume);
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

function setVolume(volume) {
    msb1 = volume >> 8 | 0x10
    lsb1 = volume
    var txbuf1 = new Buffer([msb1, lsb1]);

    msb2 = volume >> 8 | 0x30
    lsb2 = volume
    var txbuf2 = new Buffer([msb2, lsb2]);
    
    rpio.spiBegin();
    rpio.spiChipSelect(0);
    rpio.spiSetClockDivider(32);
    rpio.spiSetDataMode(0);
    rpio.spiWrite(txbuf1, txbuf1.length);
    rpio.spiWrite(txbuf2, txbuf2.length);
    rpio.spiEnd();
}
