// homebridge-ws/lib/WsAccessory.js
// Copyright © 2018-2020 Erik Baauw. All rights reserved.
//
// Homebridge plugin for virtual weather station.

'use strict'

const homebridgeLib = require('homebridge-lib')
const WsService = require('./WsService')

class WsAccessory extends homebridgeLib.AccessoryDelegate {
  constructor (platform, context) {
    const params = {
      name: context.location,
      id: 'WS-' + context.location.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      manufacturer: 'homebridge-ws',
      model: 'OpenWeatherMap',
      firmware: '1.0',
      category: platform.Accessory.Categories.Sensor
    }
    super(platform, params)

    this.context.location = context.location
    this.setAlive()

    this.on('heartbeat', this.heartbeat.bind(this))

    this.resource = context.location
    this.wsServices = {
      temperature: new WsService.Temperature(this)
    }
    if (this.platform.config.noHumidity) {
      this.wsServices.history = new homebridgeLib.ServiceDelegate.History.Weather(
        this, params,
        this.wsServices.temperature.characteristicDelegate('temperature')
      )
    } else {
      this.wsServices.humidity = new WsService.Humidity(this)
      if (this.platform.config.noPressure) {
        this.wsServices.history = new homebridgeLib.ServiceDelegate.History.Weather(
          this, params,
          this.wsServices.temperature.characteristicDelegate('temperature'),
          this.wsServices.humidity.characteristicDelegate('humidity')
        )
      } else {
        // Temperature/Humidity/Pressure
        this.wsServices.pressure = new WsService.AirPressure(this)
        this.wsServices.history = new homebridgeLib.ServiceDelegate.History.Weather(
          this, params,
          this.wsServices.temperature.characteristicDelegate('temperature'),
          this.wsServices.humidity.characteristicDelegate('humidity'),
          this.wsServices.pressure.characteristicDelegate('pressure')
        )
      }
    }
    setImmediate(() => {
      this.emit('initialised')
    })
  }

  async heartbeat (beat) {
    const heartrate = this.wsServices.temperature.values.heartrate * 60
    if (beat % heartrate === 1) {
      try {
        const { body } = await this.platform.openweathermap.get(this.resource)
        this.debug('%j', body)
        if (body.cod !== 200) {
          this.error(
            'OpenWeatherMap status: %d %s', body.cod, body.message
          )
          return
        }
        for (const id in this.wsServices) {
          if (typeof this.wsServices[id].checkObservation === 'function') {
            this.wsServices[id].checkObservation(body)
          }
        }
      } catch (error) {
        this.warn(error)
      }
    }
  }
}

module.exports = WsAccessory
