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

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

wss.on('connection', function connection(ws) {
    gpio.setMode(gpio.MODE_BCM);

    async.parallel([
        function (callback) {
            gpio.setup(pinConfig.power, gpio.DIR_OUT, callback)
        },
        function (callback) {
            gpio.setup(pinConfig.mute, gpio.DIR_OUT, callback)
        },
        function (callback) {
            broadcastVolume();
            broadcastPowerState();
            broadcastMuteState();
        }
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
            delayedWrite(pinConfig.mute, power, function () { }, 0);
            delayedWrite(pinConfig.power, power, function () { }, 250);
            delayedWrite(pinConfig.mute, !power, function () { }, 250);
        }

        if (message == 'muteToggle') {
            mute = !mute;
            delayedWrite(pinConfig.mute, mute, function () { }, 0);
        }

        if (message.startsWith('setVolume')) {
            var volume = message.split(':')[1];
            console.log(`Setting volume to: ${volume}`);
            setVolume(volume);
            easeVolume(volume);
            console.log(`Volume set to: ${getVolume()}`);
        }

        if (message.startsWith('getVolume')) {
            ws.send(`volumeSet:${getVolume()}`);
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

function beginSpi() {
    rpio.spiBegin();
    rpio.spiChipSelect(0);
    rpio.spiSetClockDivider(32);
    rpio.spiSetDataMode(0);
}

function broadcastPowerState() {
    wss.broadcast(`powerState:${power}`);
}

function broadcastMuteState() {
    wss.broadcast(`muteState:${mute}`);
}

function broadcastVolume() {
    wss.broadcast(`volumeSet:${getVolume()}`);
}

function easeInCubic(t) {
    return Math.pow(t,3);
}

function easeOutCubic(t) {
    return 1 - easeInCubic(1-t);
}

function easeVolume(volume) {
    const duration = 500;
    var time = 0;
    var time = time/duration;

    var startVolume = getVolume();

    if(startVolume < volume) {
        for(time; newVolume > startVolume; time = easeOutCubic(time)) {
            var newVolume = startVolume + time*(volume-startVolume);
            //setVolume(volume);
            console.log(`setting volume to ${newVolume}`);
        }
    }
    else if(volume < startVolume) {
        for(time; newVolume < startVolume; time = easeInCubic(time)) {
            var newVolume = startVolume + time*(volume-startVolume);
            //setVolume(volume);
            console.log(`setting volume to ${newVolume}`);
        }
    }
}

function endSpi() {
    rpio.spiEnd();
}

function setVolume(volume) {
    msb1 = volume >> 8 | 0x00
    lsb1 = volume
    var txbuf1 = new Buffer([msb1, lsb1]);

    msb2 = volume >> 8 | 0x10
    lsb2 = volume
    var txbuf2 = new Buffer([msb2, lsb2]);

    beginSpi();
    rpio.spiWrite(txbuf1, txbuf1.length);
    rpio.spiWrite(txbuf2, txbuf2.length);
    endSpi();
    broadcastVolume();
}

function getVolume() {
    msb1 = 0x0C
    lsb1 = 0x00
    var txbuf = new Buffer([msb1, lsb1]);
    var rxbuf = new Buffer(txbuf.length);

    beginSpi();
    rpio.spiTransfer(txbuf, rxbuf, txbuf.length);
    endSpi();

    var msbOut = rxbuf[0];
    var lsbOut = rxbuf[1];
    var volume = ((rxbuf[0] & 0x01) << 8) + rxbuf[1]
    return volume;
}
