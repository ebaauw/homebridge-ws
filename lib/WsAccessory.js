// homebridge-ws/lib/WsAccessory.js
// Copyright © 2018-2025 Erik Baauw. All rights reserved.
//
// Homebridge plugin for virtual weather station.

import { AccessoryDelegate } from 'homebridge-lib/AccessoryDelegate'
import { ServiceDelegate } from 'homebridge-lib/ServiceDelegate'
import 'homebridge-lib/ServiceDelegate/History'

import { WsService } from './WsService.js'

class WsAccessory extends AccessoryDelegate {
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
    this.rainService = new WsService.Rain(this)
    this.wsServices = {
      temperature: new WsService.Temperature(this),
      humidity: new WsService.Humidity(this),
      pressure: new WsService.AirPressure(this),
      weather: new WsService.Weather(this)
    }
    if (platform.config.leakSensor) {
      this.leakService = new WsService.Leak(this)
    }
    this.manageLogLevel(
      this.wsServices.weather.characteristicDelegate('logLevel'), true
    )
    this.historyService = new ServiceDelegate.History(
      this, {
        motionDelegate: this.rainService.characteristicDelegate('motion'),
        lastMotionDelegate: this.rainService.characteristicDelegate('lastActivation'),
        temperatureDelegate: this.wsServices.temperature.characteristicDelegate('temperature'),
        humidityDelegate: this.wsServices.humidity.characteristicDelegate('humidity'),
        airPressureDelegate: this.wsServices.pressure.characteristicDelegate('pressure')
      }
    )
    if (context.hourlyForecasts > 0 || context.dailyForecasts > 0) {
      let index = 1
      this.forecasts = new Forecasts(this, context)
      for (let h = 1; h <= context.hourlyForecasts; h++) {
        this.wsServices['h' + h] = new WsService.HourlyForecast(
          this.forecasts, { hour: h, index: index++ }
        )
      }
      for (let d = 1; d <= context.dailyForecasts; d++) {
        this.wsServices['d' + d] = new WsService.DailyForecast(
          this.forecasts, { day: d, index: index++ }
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
        this.rainService.checkWeather(this.wsServices.weather)
        this.leakService?.checkWeather(this.wsServices.weather)
      } catch (error) {
        if (error.request == null) {
          this.error(error)
        }
      }
    }
  }
}

class Forecasts extends AccessoryDelegate {
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

export { WsAccessory }
