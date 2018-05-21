// homebridge-ws/lib/WSPlatform.js
// Copyright © 2018 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

'use strict'

const homebridgeLib = require('homebridge-lib')
const WSAccessory = require('./WSAccessory')

module.exports = class WSPlatform extends homebridgeLib.LibPlatform {
  constructor (log, configJson, homebridge) {
    super(log, configJson, homebridge)
    this.config = {
      name: 'WS',
      location: 'autoip',
      timeout: 5
    }
    for (const key in configJson) {
      const value = configJson[key]
      switch (key.toLowerCase()) {
        case 'apikey':
          this.config.apiKey = value
          break
        case 'name':
          this.config.name = value
          break
        case 'platform':
          break
        // TODO
        // case 'timeout':
        //   break
        case 'location':
          this.config.location = value
          break
        default:
          this.warn('config.json: %s: ignoring unknown key', key)
          break
      }
    }
    this.wunderground = new homebridgeLib.RestClient({
      host: 'api.wunderground.com',
      name: 'wunderground',
      path: 'api/' + this.config.apiKey + '/conditions/q'
    })
    this.on('heartbeat', this.heartbeat)
    // this.on('accessoryRestored', this.accessoryRestored)
    this.accessoryList = []
  }

  heartbeat (beat) {
    if (beat === 0 && this.accessoryList.length === 0) {
      const station = new WSAccessory(this, this.config.location)
      this.accessoryList.push(station)
    }
    for (const accessory of this.accessoryList) {
      accessory.heartbeat(beat)
    }
  }

  // accessoryRestored (className, id) {
  //   this.debug('restore %s %s', className, id)
  // }
}
