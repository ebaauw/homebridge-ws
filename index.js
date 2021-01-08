// homebridge-ws/index.js
// Copyright © 2018-2021 Erik Baauw. All rights reserved.
//
// Homebridge plugin for virtual weather station.

'use strict'

const WsPlatform = require('./lib/WsPlatform')
const packageJson = require('./package.json')

module.exports = function (homebridge) {
  WsPlatform.loadPlatform(homebridge, packageJson, 'WS', WsPlatform)
}
