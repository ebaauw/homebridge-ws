// homebridge-ws/lib/WsAccessory.js
// Copyright © 2018 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

'use strict'

const homebridgeLib = require('homebridge-lib')
const moment = require('moment')

function check (value) {
  const v = parseInt(value)
  return isNaN(v) ? 0 : v
}

module.exports = class WsAccessory extends homebridgeLib.LibAccessory {
  constructor (platform, context) {
    const params = {
      name: context.location,
      id: 'WS-' + context.location.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      manufacturer: 'homebridge-ws',
      model: 'Wunderground',
      firmware: '1.0',
      category: platform.Accessory.hap.Categories.Sensor
    }
    super(platform, params)
    this.context.location = context.location
    this.on('heartbeat', this.heartbeat)

    this.location = context.location + '.json'
    this.state = {
      heartrate: 600,
      request: 0
    }
    this.temperatureService = this.getService(
      this.Service.eve.TemperatureSensor
    )
    if (this.temperatureService == null) {
      this.temperatureService = new this.Service.eve.TemperatureSensor(this.name)
      this.addService(this.temperatureService)
    }
    this.humidityService = this.getService(this.Service.hap.HumiditySensor)
    if (this.humidityService == null) {
      this.humidityService = new this.Service.hap.HumiditySensor(this.name)
      this.addService(this.humidityService)
    }
    this.pressureService = this.getService(this.Service.eve.AirPressureSensor)
    if (this.pressureService == null) {
      this.pressureService = new this.Service.eve.AirPressureSensor(this.name)
      this.addService(this.pressureService)
      this.pressureService.updateCharacteristic(this.Characteristic.eve.Elevation, 0)
      this.pressureService.addCharacteristic(this.Characteristic.eve.WeatherCondition)
      this.pressureService.addCharacteristic(this.Characteristic.eve.Rain1h)
      this.pressureService.addCharacteristic(this.Characteristic.eve.Rain24h)
      this.pressureService.addCharacteristic(this.Characteristic.eve.UVIndex)
      this.pressureService.addCharacteristic(this.Characteristic.eve.Visibility)
      this.pressureService.addCharacteristic(this.Characteristic.eve.WindDirection)
      this.pressureService.addCharacteristic(this.Characteristic.eve.WindSpeed)
      this.pressureService.addCharacteristic(this.Characteristic.my.LastUpdated)
      this.pressureService.addCharacteristic(this.Characteristic.my.Heartrate)
      this.pressureService.getCharacteristic(this.Characteristic.my.Heartrate)
        .setValue(this.state.heartrate / 60)
        .setProps({ unit: 'min', minValue: 10, maxValue: 120, minStep: 10 })
    } else {
      this.state.heartrate = this.pressureService
        .getCharacteristic(this.Characteristic.my.Heartrate).value * 60
    }
    const path = this.homebridge.user.storagePath() + '/accessories'
    const fileName = 'history_' + params.id + '.json'
    this.context.historyFile = path + '/' + fileName
    this.historyService = new this.HistoryService(
      'weather', { displayName: this.name }, {
        disableTimer: true,
        storage: 'fs',
        path: path,
        filename: fileName
      }
    )
    this.addService(this.historyService)
    this.pressureService.getCharacteristic(this.Characteristic.my.Heartrate)
      .on('set', this.setHeartrate.bind(this))
    this.entry = { temp: 0, humidity: 0, pressure: 0 }
  }

  heartbeat (beat) {
    if (beat % this.state.heartrate === 0) {
      this.platform.wunderground.get(this.location).then((response) => {
        if (!response.current_observation) {
          if (
            response.response && response.response.error &&
            response.response.error.description
          ) {
            this.error(
              'Wunderground error: %s', response.response.error.description
            )
            return
          }
          this.error('Wunderground error: %j', response)
          return
        }
        // this.debug('%j', response)
        const observation = response.current_observation
        const temperature = check(observation.temp_c)
        const humidity = check(observation.relative_humidity)
        const pressure = check(observation.pressure_mb)
        const condition = observation.weather
        const rain1h = check(observation.precip_1hr_metric)
        const rain = check(observation.precip_today_metric)
        const uv = check(observation.UV)
        const visibility = check(observation.visibility_km)
        const wind = observation.wind_dir
        const windSpeed = check(observation.wind_kph)
        const lastupdated = Date(observation.observation_epoch).substr(0, 24)

        this.log(
          'temperature: %d°C, humidity: %d%, pressure: %d hPa',
          temperature, humidity, pressure
        )
        this.entry.temp = temperature
        this.entry.humidity = humidity
        this.entry.pressure = pressure

        this.temperatureService
          .updateCharacteristic(this.Characteristic.eve.CurrentTemperature, temperature)
        this.humidityService.updateCharacteristic(this.Characteristic.hap.CurrentRelativeHumidity, humidity)
        this.pressureService
          .updateCharacteristic(this.Characteristic.eve.AirPressure, pressure)
          .updateCharacteristic(this.Characteristic.eve.WeatherCondition, condition)
          .updateCharacteristic(this.Characteristic.eve.Rain1h, rain1h)
          .updateCharacteristic(this.Characteristic.eve.Rain24h, rain)
          .updateCharacteristic(this.Characteristic.eve.UVIndex, uv < 0 ? 0 : uv)
          .updateCharacteristic(this.Characteristic.eve.Visibility, visibility)
          .updateCharacteristic(this.Characteristic.eve.WindDirection, wind)
          .updateCharacteristic(this.Characteristic.eve.WindSpeed, windSpeed)
          .updateCharacteristic(this.Characteristic.my.LastUpdated, lastupdated)
      }).catch((err) => {
        this.error(err)
      })
    }
    if (beat % 600 === 5) {
      this.entry.time = moment().unix()
      this.debug('add history entry %j', this.entry)
      this.historyService.addEntry(this.entry)
    }
  }

  setHeartrate (rate, callback) {
    if (rate === this.state.heartrate) {
      return callback()
    }
    this.log(
      'homekit heartrate changed from %s min to %s min',
      this.state.heartrate / 60, rate
    )
    this.state.heartrate = rate * 60
    return callback()
  }
}
