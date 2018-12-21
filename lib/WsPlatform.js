// homebridge-ws/lib/WsPlatform.js
// Copyright © 2018 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

'use strict'

const homebridgeLib = require('homebridge-lib')
const WsAccessory = {
  wunderground: require('./WsAccessoryWunderground'),
  openweathermap: require('./WsAccessoryOpenWeatherMap')
}

module.exports = class WsPlatform extends homebridgeLib.LibPlatform {
  constructor (log, configJson, homebridge) {
    super(log, configJson, homebridge)
    this.on('accessoryRestored', this.accessoryRestored)
    this.once('heartbeat', this.init)
    if (configJson == null) {
      return
    }
    this.config = {
      name: 'WS',
      timeout: 15,
      wunderground: { locations: [] },
      openweathermap: { locations: [] }
    }
    const optionParser = new homebridgeLib.OptionParser(this.config, true)
    optionParser.stringKey('name')
    optionParser.stringKey('platform')
    optionParser.intKey('timeout', 1, 60)
    optionParser.objectKey('wunderground')
    optionParser.objectKey('openweathermap')
    optionParser.on('usageError', (message) => {
      this.warn('config.json: %s', message)
    })
    try {
      optionParser.parse(configJson)
      if (configJson.wunderground != null) {
        const optionParser = new homebridgeLib.OptionParser(
          this.config.wunderground, true
        )
        optionParser.stringKey('apikey', true)
        optionParser.listKey('locations')
        optionParser.on('usageError', (message) => {
          this.warn('config.json: wunderground: %s', message)
        })
        optionParser.parse(configJson.wunderground)
        if (this.config.wunderground.locations.length === 0) {
          this.config.wunderground.locations.push('autoip')
        }
        this.wunderground = new homebridgeLib.RestClient({
          host: 'api.wunderground.com',
          name: 'wunderground',
          path: 'api/' + this.config.wunderground.apikey + '/conditions/q',
          timeout: this.config.timeout
        })
      }
      if (configJson.openweathermap != null) {
        const optionParser = new homebridgeLib.OptionParser(
          this.config.openweathermap, true
        )
        optionParser.stringKey('apikey', true)
        optionParser.listKey('locations')
        optionParser.on('usageError', (message) => {
          this.warn('config.json: openweathermap: %s', message)
        })
        optionParser.parse(configJson.openweathermap)
        if (this.config.openweathermap.locations.length === 0) {
          this.warn('config.json: openweathermap: no locations')
        }
        this.openweathermap = new homebridgeLib.RestClient({
          host: 'api.openweathermap.org',
          name: 'openweathermap',
          path: 'data/2.5/weather?APPID=' + this.config.openweathermap.apikey +
            '&units=metric&q=',
          timeout: this.config.timeout
        })
      }
      this.wsAccessories = {
        wunderground: {},
        openweathermap: {}
      }
    } catch (error) {
      this.fatal(error)
    }
  }

  init (beat) {
    for (const provider of ['wunderground', 'openweathermap']) {
      // Remove restored accessories that are no longer mentioned in config.json.
      for (const id in this.wsAccessories[provider]) {
        if (!this.config[provider].locations.includes(id)) {
          // Need to remove event handlers or heartbeat events are still processed.
          this.wsAccessories[provider][id].remove()
          delete this.wsAccessories[provider][id]
        }
      }
      // Add accessories for new locations.
      for (const location of this.config[provider].locations) {
        if (this.wsAccessories[provider][location] == null) {
          const wsAccessory = new WsAccessory[provider](this, { location: location })
          this.wsAccessories[provider][location] = wsAccessory
        }
      }
    }
  }

  accessoryRestored (className, context) {
    const provider = className === 'WsAccessoryOpenWeatherMap'
      ? 'openweathermap' : 'wunderground'
    const wsAccessory = new WsAccessory[provider](this, context)
    this.wsAccessories[provider][context.location] = wsAccessory
  }
}
