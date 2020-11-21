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
    this._client = new homebridgeLib.HttpClient({
      https: true,
      host: 'api.openweathermap.org',
      json: true,
      maxSockets: 1,
      path: '/data/2.5/',
      suffix: '&appid=' + this.config.apikey + '&units=metric',
      timeout: this.config.timeout,
      validStatusCodes: [200, 404]
    })
    this._client.on('request', (id, method, resource, body, url) => {
      this.debug('openweathermap request %d: %s %s', id, method, resource)
      this.vdebug('openweathermap request %d: %s %s', id, method, url)
    })
    this._client.on('response', (id, code, message, body) => {
      this.vdebug('openweathermap request %d: response: %j', id, body)
      this.debug('openweathermap request %d: %d %s', id, code, message)
    })
    this._client.on('error', (error, id, method, resource, body, url) => {
      this.warn('openweathermap request %d: %s %s', id, method, resource)
      this.warn('openweathermap request %d: error: %s', id, error)
    })
    this.debug('initialised')
    this.emit('initialised')
  }

  async weather (location) {
    return this._client.get(`weather?q=${location}`)
  }

  async onecall (lon, lat) {
    return this._client.get(`onecall?lon=${lon}&lat=${lat}`)
  }
}

module.exports = WsPlatform
