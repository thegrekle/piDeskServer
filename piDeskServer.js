const WebSocket = require('ws');
const gpio = require('rpi-gpio')

const wss = new WebSocket.Server({ port: 8080 });

var power = false;

wss.on('connection', function connection(ws) {
    gpio.setMode(gpio.MODE_BCM);

    ws.on('message', function incoming(message) {
        if (message == 'powerToggle') {
            power = !power;
            
            gpio.setup(18, gpio.DIR_OUT, write);

            function write() {
                gpio.write(18, power, function (err) {
                    if (err) throw err;
                    console.log('Written to pin 18');
                });
            }
        }

    });

    ws.send('something');
});
