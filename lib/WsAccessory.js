// homebridge-ws/lib/WsAccessory.js
// Copyright © 2018-2019 Erik Baauw. All rights reserved.
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
    this.on('heartbeat', this.heartbeat.bind(this))

    this.resource = context.location
    this.wsServices = {
      temperature: new WsService.Temperature(this)
    }
    if (this.platform.config.noHumidity) {
      // Temperature
      // this.wsServices.weather = new WsService.Weather(
      //   this, {},
      //   this.wsServices.temperature.characteristicDelegate('temperature')
      // )
      this.wsServices.history = new homebridgeLib.ServiceDelegate.History.Weather(
        this, params,
        this.wsServices.temperature.characteristicDelegate('temperature')
      )
    } else {
      this.wsServices.humidity = new WsService.Humidity(this)
      if (this.platform.config.noPressure) {
        // Temperature/Humidity
        // this.wsServices.weather = new WsService.Weather(
        //   this, {},
        //   this.wsServices.temperature.characteristicDelegate('temperature'),
        //   this.wsServices.humidity.characteristicDelegate('humidity')
        // )
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

  heartbeat (beat) {
    const heartrate = this.wsServices.temperature.values.heartrate * 60
    if (beat % heartrate === 1) {
      this.platform.openweathermap.get(this.resource).then((response) => {
        this.debug('%j', response)
        if (!response) {
          if (
            response.response && response.response.error &&
            response.response.error.description
          ) {
            this.error(
              'OpenWeatherMap error: %s', response.response.error.description
            )
            return
          }
          this.error('OpenWeatherMap error: %j', response)
          return
        }
        for (const id in this.wsServices) {
          if (typeof this.wsServices[id].checkObservation === 'function') {
            this.wsServices[id].checkObservation(response)
          }
        }
      }).catch((err) => {
        this.error(err)
      })
    }
  }
}

module.exports = WsAccessory
