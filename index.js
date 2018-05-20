// homebridge-ws/index.js
// Copyright © 2018 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

'use strict'

const WSPlatform = require('./lib/WSPlatform')
const packageJson = require('./package.json')

module.exports = function (homebridge) {
  WSPlatform.loadPlatform(homebridge, packageJson, 'WS', WSPlatform)
}
