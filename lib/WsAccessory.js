// homebridge-ws/lib/WsAccessory.js
// Copyright © 2018-2019 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

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
      category: platform.Accessory.hap.Categories.Sensor
    }
    super(platform, params)

    this.context.location = context.location
    this.on('heartbeat', this.heartbeat.bind(this))

    this.resource = context.location
    this.wsServices = {
      temperature: new WsService.Temperature(this),
      humidity: new WsService.Humidity(this),
      pressure: new WsService.AirPressure(this)
    }
    this.wsServices.history = new homebridgeLib.ServiceDelegate.History.Weather(
      this, params,
      this.wsServices.temperature.characteristicDelegate('temperature'),
      this.wsServices.humidity.characteristicDelegate('humidity'),
      this.wsServices.pressure.characteristicDelegate('pressure')
    )
  }

  heartbeat (beat) {
    const heartrate = this.wsServices.pressure.values.heartrate * 60
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
        this.wsServices.temperature.checkObservation(response)
        this.wsServices.humidity.checkObservation(response)
        this.wsServices.pressure.checkObservation(response)
      }).catch((err) => {
        this.error(err)
      })
    }
  }
}

module.exports = WsAccessory
