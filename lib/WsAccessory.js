// homebridge-ws/lib/WsAccessory.js
// Copyright © 2018-2023 Erik Baauw. All rights reserved.
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
      category: platform.Accessory.Categories.Sensor
    }
    super(platform, params)
    this.context.location = context.location
    this.context.cityId = context.cityId
    this.context.lat = context.lat
    this.context.lon = context.lon
    this.wsServices = {
      temperature: new WsService.Temperature(this),
      humidity: new WsService.Humidity(this),
      pressure: new WsService.AirPressure(this),
      weather: new WsService.Weather(this)
    }
    if (!context.noLeak) {
      this.leakService = new WsService.Leak(this)
    }
    this.manageLogLevel(
      this.wsServices.weather.characteristicDelegate('logLevel'), true
    )
    this.historyService = new homebridgeLib.ServiceDelegate.History.Weather(
      this, {
        // config: true,
        temperatureDelegate: this.wsServices.temperature.characteristicDelegate('temperature'),
        humidityDelegate: this.wsServices.humidity.characteristicDelegate('humidity'),
        airPressureDelegate: this.wsServices.pressure.characteristicDelegate('pressure')
      }
    )
    if (context.hourlyForecasts > 0 || context.dailyForecasts > 0) {
      this.forecasts = new Forecasts(this, context)
      for (let h = 1; h <= context.hourlyForecasts; h++) {
        this.wsServices['h' + h] = new WsService.HourlyForecast(
          this.forecasts, { hour: h, noLeak: context.noLeak }
        )
      }
      for (let d = 1; d <= context.dailyForecasts; d++) {
        this.wsServices['d' + d] = new WsService.DailyForecast(
          this.forecasts, { day: d, noLeak: context.noLeak }
        )
      }
    }
    this.heartbeatEnabled = true
    this.on('heartbeat', this.heartbeat.bind(this))
    setImmediate(() => {
      this.emit('initialised')
    })
  }

  async heartbeat (beat) {
    const heartrate = this.wsServices.weather.values.heartrate * 60
    if (beat % heartrate === 1) {
      try {
        const result = await this.platform.onecall(
          this.context.lat, this.context.lon
        )
        for (const id in this.wsServices) {
          this.wsServices[id].checkObservation(result.body)
        }
        if (this.leakService != null) {
          this.leakService.checkWeather(this.wsServices.weather)
        }
      } catch (error) {
        if (error.request == null) {
          this.error(error)
        }
      }
    }
  }
}

class Forecasts extends homebridgeLib.AccessoryDelegate {
  constructor (wsAccessory, context) {
    const params = {
      name: context.location + ' Forecast',
      id: 'WS-' + context.location.toUpperCase().replace(/[^A-Z0-9]/g, '') + '-F',
      manufacturer: 'homebridge-ws',
      model: 'OpenWeatherMap',
      firmware: '1.0',
      category: wsAccessory.Accessory.Categories.Sensor
    }
    super(wsAccessory.platform, params)
    this.context.location = context.location
    this.inheritLogLevel(wsAccessory)
    setImmediate(() => {
      this.emit('initialised')
    })
  }
}

module.exports = WsAccessory
