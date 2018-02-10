// homebridge-ws/index.js
// Copyright © 2018 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

'use strict'

const WSPlatformModule = require('./lib/WSPlatform')
const WSPlatform = WSPlatformModule.WSPlatform

module.exports = function (homebridge) {
  WSPlatformModule.setHomebridge(homebridge)
  homebridge.registerPlatform('homebridge-ws', 'WS', WSPlatform)
}
