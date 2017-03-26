const WebSocket = require('ws');
const gpio = require('rpi-gpio')

const wss = new WebSocket.Server({ port: 8080 });

var power = false;
var mute = false;

const pinConfig = {
    power: {
        number: 18,
        direction: gpio.DIR_OUT
    },
    mute: {
        number: 17,
        direction: gpio.DIR_OUT
    },
}

wss.on('connection', function connection(ws) {
    gpio.setMode(gpio.MODE_BCM);
    gpio.setup(pinConfig.power.number, pinConfig.power.direction);
    gpio.setup(pinConfig.mute.number, pinConfig.mute.direction);

    ws.on('message', function incoming(message) {
        if (message == 'powerToggle') {
            power = !power;

            writePin(pinConfig.mute.number, true);
            writePin(pinConfig.power.number, power);
        }

    });

    ws.send('something');
});


function writePin(pinNumber, value) {
    gpio.write(pinNumber, value, function (err) {
        if (err) throw err;
        console.log('Written to pin ' + pinNumber);
    });
}
