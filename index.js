// homebridge-ws/index.js
// Copyright © 2018-2024 Erik Baauw. All rights reserved.
//
// Homebridge plugin for virtual weather station.

'use strict'

import { createRequire } from 'node:module'

import { WsPlatform } from './lib/WsPlatform.js'

const require = createRequire(import.meta.url)
const packageJson = require('./package.json')

function main (homebridge) {
  WsPlatform.loadPlatform(homebridge, packageJson, 'WS', WsPlatform)
}

export { main as default }
