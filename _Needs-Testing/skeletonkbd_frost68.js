export function Name() { return "skeletonkbd Frost68 QMK Keyboard"; }
export function Version() { return "1.1.6"; }
export function VendorId() { return 0x1209; }
export function ProductId() { return 0x68A0; }
export function Publisher() { return "Polyhaze (@Polyhaze) / Dylan Perks (@Perksey)"; }
export function Documentation(){ return "qmk/srgbmods-qmk-firmware"; }
export function Size() { return [66, 39]; }
export function DefaultPosition(){return [10, 100]; }
export function DefaultScale(){return 8.0;}
/* global
shutdownMode:readonly
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters()
{
    return [
        {"property":"shutdownMode", "group":"lighting", "label":"Shutdown Mode", "type":"combobox", "values":["SignalRGB", "Hardware"], "default":"SignalRGB"},
        {"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", "min":"0", "max":"360", "type":"color", "default":"#000000"},
        {"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
        {"property":"forcedColor", "group":"lighting", "label":"Forced Color", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
    ];
}

//Plugin Version: Built for Protocol V1.0.4

const vKeys = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67
];

const vKeyNames = [
   "Light 1", "Light 2", "Light 3", "Light 4", "Light 5", "Light 6", "Light 7", "Light 8", "Light 9", "Light 10", "Light 11", "Light 12", "Light 13", "Light 14", "Light 15", "Light 16", "Light 17", "Light 18", "Light 19", "Light 20", "Light 21", "Light 22", "Light 23", "Light 24", "Light 25", "Light 26", "Light 27", "Light 28", "Light 29", "Light 30", "Light 31", "Light 32", "Light 33", "Light 34", "Light 35", "Light 36", "Light 37", "Light 38", "Light 39", "Light 40", "Light 41", "Light 42", "Light 43", "Light 44", "Light 45", "Light 46", "Light 47", "Light 48", "Light 49", "Light 50", "Light 51", "Light 52", "Light 53", "Light 54", "Light 55", "Light 56", "Light 57", "Light 58", "Light 59", "Light 60", "Light 61", "Light 62", "Light 63", "Light 64", "Light 65", "Light 66", "Light 67", "Light 68"
];

const vKeyPositions = [
    [13, 2], [21, 2], [30, 1], [39, 5], [47, 7], [54, 9], [62, 11], [56, 21], [50, 19], [41, 17], [33, 14], [24, 15], [15, 15], [12, 24], [25, 24], [32, 25], [42, 26], [51, 27], [57, 28], [59, 33], [53, 32], [43, 31], [36, 30], [28, 29], [14, 29], [11, 34], [22, 34], [45, 36], [58, 38], [4, 37], [19, 35], [38, 34], [48, 34], [55, 34], [63, 34], [55, 29], [44, 29], [34, 29], [26, 29], [17, 30], [8, 31], [3, 32], [64, 33], [1, 28], [6, 27], [10, 26], [20, 25], [29, 24], [37, 24], [49, 24], [63, 23], [61, 12], [52, 15], [40, 15], [31, 15], [23, 13], [16, 16], [7, 18], [2, 20], [65, 22], [0, 10], [5, 8], [9, 6], [18, 4], [27, 3], [35, 2], [46, 2], [60, 0]
];

let LEDCount = 0;
let IsViaKeyboard = false;
const MainlineQMKFirmware = 1;
const VIAFirmware = 2;
const PluginProtocolVersion = "1.0.4";

export function LedNames() {
    return vKeyNames;
}

export function LedPositions() {
    return vKeyPositions;
}

export function vKeysArrayCount() {
    device.log('vKeys ' + vKeys.length);
    device.log('vKeyNames ' + vKeyNames.length);
    device.log('vKeyPositions ' + vKeyPositions.length);
}

export function Initialize() {
    requestFirmwareType();
    requestQMKVersion();
    requestSignalRGBProtocolVersion();
    requestUniqueIdentifier();
    requestTotalLeds();
    effectEnable();

}

export function Render() {
    sendColors();
}

export function Shutdown(SystemSuspending) {

    if(SystemSuspending) {
        sendColors("#000000"); // Go Dark on System Sleep/Shutdown
    } else {
        if (shutdownMode === "SignalRGB") {
            sendColors(shutdownColor);
        } else {
            effectDisable();
        }
    }

    vKeysArrayCount(); // For debugging array counts

}

function commandHandler() {
    const readCounts = [];

    do {
        const returnpacket = device.read([0x00], 32, 10);
        processCommands(returnpacket);

        readCounts.push(device.getLastReadSize());

        // Extra Read to throw away empty packets from Via
        // Via always sends a second packet with the same Command Id.
        if(IsViaKeyboard) {
            device.read([0x00], 32, 10);
        }
    }
    while(device.getLastReadSize() > 0);

}

function processCommands(data) {
    switch(data[1]) {
    case 0x21:
        returnQMKVersion(data);
        break;
    case 0x22:
        returnSignalRGBProtocolVersion(data);
        break;
    case 0x23:
        returnUniqueIdentifier(data);
        break;
    case 0x24:
        sendColors();
        break;
    case 0x27:
        returnTotalLeds(data);
        break;
    case 0x28:
        returnFirmwareType(data);
        break;
    }
}

function requestQMKVersion() //Check the version of QMK Firmware that the keyboard is running
{
    device.write([0x00, 0x21], 32);
    device.pause(30);
    commandHandler();
}

function returnQMKVersion(data) {
    const QMKVersionByte1 = data[2];
    const QMKVersionByte2 = data[3];
    const QMKVersionByte3 = data[4];
    device.log("QMK Version: " + QMKVersionByte1 + "." + QMKVersionByte2 + "." + QMKVersionByte3);
    device.log("QMK SRGB Plugin Version: "+ Version());
    device.pause(30);
}

function requestSignalRGBProtocolVersion() //Grab the version of the SignalRGB Protocol the keyboard is running
{
    device.write([0x00, 0x22], 32);
    device.pause(30);
    commandHandler();
}

function returnSignalRGBProtocolVersion(data) {
    const ProtocolVersionByte1 = data[2];
    const ProtocolVersionByte2 = data[3];
    const ProtocolVersionByte3 = data[4];

    const SignalRGBProtocolVersion = ProtocolVersionByte1 + "." + ProtocolVersionByte2 + "." + ProtocolVersionByte3;
    device.log(`SignalRGB Protocol Version: ${SignalRGBProtocolVersion}`);


    if(PluginProtocolVersion !== SignalRGBProtocolVersion) {
        device.notify("Unsupported Protocol Version: ", `This plugin is intended for SignalRGB Protocol version ${PluginProtocolVersion}. This device is version: ${SignalRGBProtocolVersion}`, 1, "Documentation");
    }

    device.pause(30);
}

function requestUniqueIdentifier() //Grab the unique identifier for this keyboard model
{
    if(device.write([0x00, 0x23], 32) === -1) {
        device.notify("Unsupported Firmware: ", `This device is not running SignalRGB-compatible firmware. Click the Open Troubleshooting Docs button to learn more.`, 1, "Documentation");
    }

    device.pause(30);
    commandHandler();
}


function returnUniqueIdentifier(data) {
    const UniqueIdentifierByte1 = data[2];
    const UniqueIdentifierByte2 = data[3];
    const UniqueIdentifierByte3 = data[4];

    if(!(UniqueIdentifierByte1 === 0 && UniqueIdentifierByte2 === 0 && UniqueIdentifierByte3 === 0)) {
        device.log("Unique Device Identifier: " + UniqueIdentifierByte1 + UniqueIdentifierByte2 + UniqueIdentifierByte3);
    }

    device.pause(30);
}

function requestTotalLeds() //Calculate total number of LEDs
{
    device.write([0x00, 0x27], 32);
    device.pause(30);
    commandHandler();
}

function returnTotalLeds(data) {
    LEDCount = data[2];
    device.log("Device Total LED Count: " + LEDCount);
    device.pause(30);
}

function requestFirmwareType() {
    device.write([0x00, 0x28], 32);
    device.pause(30);
    commandHandler();
}

function returnFirmwareType(data) {
    const FirmwareTypeByte = data[2];

    if(!(FirmwareTypeByte === MainlineQMKFirmware || FirmwareTypeByte === VIAFirmware)) {
        device.notify("Unsupported Firmware: ", "Click Show Console, and then click on troubleshooting for your keyboard to find out more.", 1, "Documentation");
    }

    if(FirmwareTypeByte === MainlineQMKFirmware) {
        IsViaKeyboard = false;
        device.log("Firmware Type: Mainline");
    }

    if(FirmwareTypeByte === VIAFirmware) {
        IsViaKeyboard = true;
        device.log("Firmware Type: VIA");
    }

    device.pause(30);
}

function effectEnable() //Enable the SignalRGB Effect Mode
{
    device.write([0x00, 0x25], 32);
    device.pause(30);
}

function effectDisable() //Revert to Hardware Mode
{
    device.write([0x00, 0x26], 32);
    device.pause(30);
}

function createSolidColorArray(color) {
    const rgbdata = new Array(vKeys.length * 3).fill(0);

    for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
        const iLedIdx = vKeys[iIdx] * 3;
        rgbdata[iLedIdx] = color[0];
        rgbdata[iLedIdx+1] = color[1];
        rgbdata[iLedIdx+2] = color[2];
    }

    return rgbdata;
}

function grabColors(overrideColor) {
    if(overrideColor) {
        return createSolidColorArray(hexToRgb(overrideColor));
    } else if (LightingMode === "Forced") {
        return createSolidColorArray(hexToRgb(forcedColor));
    }

    const rgbdata = new Array(vKeys.length * 3).fill(0);

    for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
        const iPxX = vKeyPositions[iIdx][0];
        const iPxY = vKeyPositions[iIdx][1];
        const color = device.color(iPxX, iPxY);

        const iLedIdx = vKeys[iIdx] * 3;
        rgbdata[iLedIdx] = color[0];
        rgbdata[iLedIdx+1] = color[1];
        rgbdata[iLedIdx+2] = color[2];
    }

    return rgbdata;
}

function sendColors(overrideColor) {
    const rgbdata = grabColors(overrideColor);

    const LedsPerPacket = 9;
    let BytesSent = 0;
    let BytesLeft = rgbdata.length;

    while(BytesLeft > 0) {
        const BytesToSend = Math.min(LedsPerPacket * 3, BytesLeft);
        StreamLightingData(Math.floor(BytesSent / 3), rgbdata.splice(0, BytesToSend));

        BytesLeft -= BytesToSend;
        BytesSent += BytesToSend;
    }
}

function StreamLightingData(StartLedIdx, RGBData) {
    const packet = [0x00, 0x24, StartLedIdx, Math.floor(RGBData.length / 3)].concat(RGBData);
    device.write(packet, 33);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    const colors = [];
    colors[0] = parseInt(result[1], 16);
    colors[1] = parseInt(result[2], 16);
    colors[2] = parseInt(result[3], 16);

    return colors;
}

export function Validate(endpoint) {
    return endpoint.interface === 1;
}

export function Image() {
    return "";
}
