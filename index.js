// homebridge-ws/index.js
// Copyright © 2018-2024 Erik Baauw. All rights reserved.
//
// Homebridge plugin for virtual weather station.

'use strict'

import { WsPlatform } from './lib/WsPlatform.js'

function main (homebridge) {
  WsPlatform.loadPlatform(homebridge, import.meta.dirname, 'WS', WsPlatform)
}

export { main as default }
