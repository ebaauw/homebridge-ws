// homebridge-ws/lib/WsPlatform.js
// Copyright © 2018-2026 Erik Baauw. All rights reserved.
//
// Homebridge plugin for virtual weather station.

import { once } from 'node:events'

import { HttpClient } from 'homebridge-lib/HttpClient'
import { OptionParser } from 'homebridge-lib/OptionParser'
import { Platform } from 'homebridge-lib/Platform'

import { WsAccessory } from './WsAccessory.js'

class WsPlatform extends Platform {
  constructor (log, configJson, homebridge, bridge) {
    super(log, configJson, homebridge)
    this.knownLocations = {}
    this
      .on('accessoryRestored', this.accessoryRestored)
      .once('heartbeat', this.init)
    this.config = {
      cityIds: [],
      name: 'WS',
      timeout: 15,
      locations: []
    }
    const optionParser = new OptionParser(this.config, true)
    optionParser
      .stringKey('name')
      .stringKey('platform')
      .stringKey('apikey', true)
      .listKey('cityIds')
      .intKey('dailyForecasts', 0, 7)
      .intKey('hourlyForecasts', 0, 47)
      .boolKey('leakSensor')
      .listKey('locations')
      .intKey('timeout', 1, 60)
      .on('userInputError', (message) => {
        this.warn('config.json: %s', message)
      })
    try {
      optionParser.parse(configJson)
      this.config.locations = this.config.locations.concat(this.config.cityIds)
      if (this.config.locations.length === 0) {
        this.warn('config.json: no locations nor city ids')
      }
      this.wsAccessories = {}
      this._client = new HttpClient({
        https: true,
        host: 'api.openweathermap.org',
        json: true,
        maxSockets: 1,
        path: '/data/',
        suffix: '&appid=' + this.config.apikey + '&units=metric',
        timeout: this.config.timeout,
        validStatusCodes: [200, 401, 404]
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
      this.error(error)
    }
  }

  async init (beat) {
    const jobs = []
    for (const location of this.config.locations) {
      try {
        let name, id, lat, lon
        if (this.knownLocations[location] != null) {
          const context = this.knownLocations[location]
          name = context.location
          id = context.cityId
          lat = context.lat
          lon = context.lon
        } else {
          const { body } = await this.weather(location)
          name = typeof location === 'number'
            ? body.name
            : location
          id = body.id
          lat = body.coord.lat
          lon = body.coord.lon
        }
        if (this.wsAccessories[name] != null) {
          this.warn('%s: ignore duplicate location %s', location, name)
          continue
        }
        const latitude = lat < 0 ? lat * -1 + '°S' : lat + '°N'
        const longitude = lon < 0 ? lon * -1 + '°W' : lon + '°E'
        this.log('%s [%s]: %s, %s', name, id, latitude, longitude)
        const params = {
          location: name,
          cityId: id,
          lon,
          lat,
          dailyForecasts: this.config.dailyForecasts,
          hourlyForecasts: this.config.hourlyForecasts
        }
        const wsAccessory = new WsAccessory(this, params)
        jobs.push(once(wsAccessory, 'initialised'))
        this.wsAccessories[name] = wsAccessory
      } catch (error) {
        this.error(error)
        this.warn(
          '%s: ignore unknown %s', location,
          typeof location === 'number' ? 'city id' : 'location'
        )
      }
    }
    for (const job of jobs) {
      await job
    }
    this.debug('initialised')
    this.emit('initialised')
  }

  accessoryRestored (className, version, id, name, context) {
    try {
      if (className === 'WsAccessory' && context.cityId != null) {
        this.knownLocations[context.location] = context
        this.knownLocations[context.cityId] = context
      }
    } catch (error) { this.error(error) }
  }

  checkResponse (response) {
    if (response.body.cod != null && response.body.cod !== 200) {
      const error = new HttpClient.HttpError(
        `openweathermap status: ${response.body.cod} ${response.body.message}`,
        response.request
      )
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

  async weather (location) {
    // TODO: allow for lat, lon parameters
    const param = typeof location === 'number' ? 'id' : 'q'
    const response = await this._client.get(`2.5/weather?${param}=${location}`)
    return this.checkResponse(response)
  }

  async onecall (lat, lon) {
    const response = await this._client.get(
      `3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely`
    )
    return this.checkResponse(response)
  }

  async geocode (location) {
    const response = await this._client.get(`geo/1.0/direct?q=${location}`)
    this.checkResponse(response)
    const { name, lat, lon } = response[0]
    return { name, lat, lon }
  }

  async reverseGeocode (lattitude, longitute) {
    const response = await this._client.get(`geo/1.0/reverse?lat=${lattitude}&lon=${longitute}`)
    this.checkResponse(response)
    const { name, lat, lon } = response[0]
    return { name, lat, lon }
  }
}

export { WsPlatform }
