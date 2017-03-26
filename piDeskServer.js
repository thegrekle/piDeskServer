const WebSocket = require('ws');
const gpio = require('rpi-gpio')

const wss = new WebSocket.Server({ port: 8080 });

var power = false;
var mute = false;

const pinConfig = {
    power: 18,
    mute: 17
}

wss.on('connection', function connection(ws) {
    gpio.setMode(gpio.MODE_BCM);

    ws.on('message', function incoming(message) {
        if (message == 'powerToggle') {
            power = !power;

            writePin(pinConfig.mute, true);
            writePin(pinConfig.power, power);
        }

        if (message == 'muteToggle') {
            mute = !mute;

            writePin(pinConfig.mute, mute);
        }
    });

    ws.send('something');
});


function writePin(pinNumber, value) {
    gpio.setup(pinNumber, gpio.DIR_OUT, write);

    function write() {
        gpio.write(pinNumber, value, function (err) {
            if (err) throw err;
            console.log('Written to pin ' + pinNumber);
        });
    }
}
