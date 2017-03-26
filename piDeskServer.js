const WebSocket = require('ws');
const gpio = require('rpi-gpio')

const wss = new WebSocket.Server({ port: 8080 });

var power = false;

wss.on('connection', function connection(ws) {
    this.gpio.setMode(this.gpio.MODE_BCM);

    ws.on('message', function incoming(message) {
        if (message == 'powerToggle') {
            this.power = !this.power;
            
            this.gpio.setup(18, this.gpio.DIR_OUT, write);

            function write() {
                this.gpio.write(18, this.power, function (err) {
                    if (err) throw err;
                    console.log('Written to pin 18');
                });
            }
        }

    });

    ws.send('something');
});