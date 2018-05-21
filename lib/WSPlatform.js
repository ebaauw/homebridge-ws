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
    if (configJson == null) {
      return
    }
    this.config = {
      name: 'WS',
      location: 'autoip',
      timeout: 5
    }
    const optionParser = new homebridgeLib.OptionParser(this.config, true)
    optionParser.stringKey('apikey', true)
    optionParser.stringKey('location')
    optionParser.stringKey('name')
    optionParser.stringKey('platform')
    optionParser.intKey('timeout', 1, 60)
    optionParser.on('usageError', (message) => {
      this.warn('config.json: %s', message)
    })
    try {
      optionParser.parse(configJson)
    } catch (err) {
      this.fatal(err)
    }
    this.wunderground = new homebridgeLib.RestClient({
      host: 'api.wunderground.com',
      name: 'wunderground',
      path: 'api/' + this.config.apikey + '/conditions/q'
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
