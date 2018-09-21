// homebridge-ws/lib/WsPlatform.js
// Copyright © 2018 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

'use strict'

const fs = require('fs')

const homebridgeLib = require('homebridge-lib')
const WsAccessory = require('./WsAccessory')

module.exports = class WsPlatform extends homebridgeLib.LibPlatform {
  constructor (log, configJson, homebridge) {
    super(log, configJson, homebridge)
    this.on('accessoryRestored', this.accessoryRestored)
    this.on('accessoryRemoved', this.cleanup)
    this.once('heartbeat', this.init)
    this.on('heartbeat', this.heartbeat)
    if (configJson == null) {
      return
    }
    this.config = {
      name: 'WS',
      locations: [],
      timeout: 5
    }
    const optionParser = new homebridgeLib.OptionParser(this.config, true)
    optionParser.stringKey('apikey', true)
    optionParser.listKey('locations')
    optionParser.stringKey('name')
    optionParser.stringKey('platform')
    optionParser.intKey('timeout', 1, 60)
    optionParser.on('usageError', (message) => {
      this.warn('config.json: %s', message)
    })
    try {
      optionParser.parse(configJson)
      if (this.config.locations.length === 0) {
        this.config.locations.push('autoip')
      }
      this.wunderground = new homebridgeLib.RestClient({
        host: 'api.wunderground.com',
        name: 'wunderground',
        path: 'api/' + this.config.apikey + '/conditions/q',
        timeout: this.config.timeout
      })
      this.wsAccessories = {}
    } catch (error) {
      this.fatal(error)
    }
  }

  init (beat) {
    // Remove restored accessories that are no longer mentioned in config.json.
    for (const id in this.wsAccessories) {
      if (!this.config.locations.includes(id)) {
        this.wsAccessories[id].remove()
        delete this.wsAccessories[id]
      }
    }
    // Add accessories for new locations.
    for (const location of this.config.locations) {
      if (this.wsAccessories[location] == null) {
        const wsAccessory = new WsAccessory(this, location)
        this.wsAccessories[location] = wsAccessory
      }
    }
  }

  heartbeat (beat) {
    for (const id in this.wsAccessories) {
      this.wsAccessories[id].heartbeat(beat)
    }
  }

  accessoryRestored (className, context) {
    const AccessoryDelegate = require('./' + className)
    const wsAccessory = new AccessoryDelegate(this, context.location)
    this.wsAccessories[context.location] = wsAccessory
  }

  cleanup (classname, context) {
    if (context.historyFile) {
      this.debug('removing history file %s', context.historyFile)
      fs.unlink(context.historyFile, (error) => {
        if (error) {
          this.error(error)
        }
      })
    }
  }
}
