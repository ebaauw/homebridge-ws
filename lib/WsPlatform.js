// homebridge-ws/lib/WsPlatform.js
// Copyright © 2018-2021 Erik Baauw. All rights reserved.
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
    optionParser.boolKey('noLeak')
    optionParser.on('userInputError', (message) => {
      this.warn('config.json: %s', message)
    })
    try {
      optionParser.parse(configJson)
      if (this.config.locations.length === 0) {
        this.warn('config.json: no locations')
      }
      this.wsAccessories = {}
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
      this._client
        .on('error', (error) => {
          this.log(
            'openweathermap request %d: %s %s', error.request.id,
            error.request.method, error.request.resource
          )
          this.warn(
            'openweathermap request %d: %s', error.request.id, error
          )
        })
        .on('request', (request) => {
          this.debug(
            'openweathermap request %d: %s %s', request.id,
            request.method, request.resource
          )
          this.vdebug(
            'openweathermap request %d: %s %s', request.id,
            request.method, request.url
          )
        })
        .on('response', (response) => {
          this.vdebug(
            'openweathermap request %d: response: %j', response.request.id,
            response.body
          )
          this.debug(
            'openweathermap request %d: %d %s', response.request.id,
            response.statusCode, response.statusMessage
          )
        })
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
        hourlyForecasts: this.config.hourlyForecasts,
        noLeak: this.config.noLeak
      }
      // TODO: only create accessory when location can be converted into
      // long/lat coordinates
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

  // TODO One persisted logLevel for all accessories
  // get logLevel () { return 3 }

  async weather (location) {
    const response = await this._client.get(`weather?q=${location}`)
    if (response.body.cod !== 200) {
      const error = new Error(
        `openweathermap status: ${response.body.cod} ${response.body.message}`
      )
      error.request = response.request
      this.log(
        'openweathermap request %d: %s %s', error.request.id,
        error.request.method, error.request.resource
      )
      this.warn(
        'openweathermap request %d: %s', error.request.id, error
      )
      throw error
    }
    return response
  }

  async onecall (lon, lat) {
    return this._client.get(`onecall?lon=${lon}&lat=${lat}&exclude=minutely`)
  }
}

module.exports = WsPlatform
