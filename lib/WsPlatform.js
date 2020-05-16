// homebridge-ws/lib/WsPlatform.js
// Copyright © 2018-2020 Erik Baauw. All rights reserved.
//
// Homebridge plugin for virtual weather station.

'use strict'

const events = require('events')
const homebridgeLib = require('homebridge-lib')
const WsAccessory = require('./WsAccessory')

class WsPlatform extends homebridgeLib.Platform {
  constructor (log, configJson, homebridge) {
    super(log, configJson, homebridge)
    this.once('heartbeat', this.init)
    this.config = {
      name: 'WS',
      timeout: 15,
      locations: []
    }
    const optionParser = new homebridgeLib.OptionParser(this.config, true)
    optionParser.stringKey('name')
    optionParser.stringKey('platform')
    optionParser.intKey('timeout', 1, 60)
    optionParser.stringKey('apikey', true)
    optionParser.intKey('dailyForecasts', 0, 7)
    optionParser.intKey('hourlyForecasts', 0, 47)
    optionParser.listKey('locations')
    optionParser.on('userInputError', (message) => {
      this.warn('config.json: %s', message)
    })
    try {
      optionParser.parse(configJson)
      if (this.config.locations.length === 0) {
        this.warn('config.json: no locations')
      }
      this.wsAccessories = {}
    } catch (error) {
      this.fatal(error)
    }
  }

  async init (beat) {
    const jobs = []
    for (const location of this.config.locations) {
      const params = {
        location: location,
        dailyForecasts: this.config.dailyForecasts,
        hourlyForecasts: this.config.hourlyForecasts
      }
      const wsAccessory = new WsAccessory(this, params)
      jobs.push(events.once(wsAccessory, 'initialised'))
      this.wsAccessories[location] = wsAccessory
    }
    for (const job of jobs) {
      await job
    }
    this.debug('initialised')
    this.emit('initialised')
  }

  async weather (location) {
    if (this._weather == null) {
      this._weather = new homebridgeLib.HttpClient({
        https: true,
        host: 'api.openweathermap.org',
        json: true,
        path: '/data/2.5/weather?appid=' + this.config.apikey + '&units=metric&',
        timeout: this.config.timeout
      })
    }
    return this._weather.get(`q=${location}`)
  }

  async onecall (lon, lat) {
    if (this._onecall == null) {
      this._onecall = new homebridgeLib.HttpClient({
        https: true,
        host: 'api.openweathermap.org',
        json: true,
        path: '/data/2.5/onecall?appid=' + this.config.apikey + '&units=metric&',
        timeout: this.config.timeout
      })
    }
    return this._onecall.get(`lon=${lon}&lat=${lat}`)
  }
}

module.exports = WsPlatform
