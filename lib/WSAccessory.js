// homebridge-ws/lib/WSPlatform.js
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

module.exports = class WSAccessory extends homebridgeLib.LibAccessory {
  constructor (platform, location) {
    const params = {
      name: location,
      id: 'WS-' + location.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      manufacturer: 'homebridge-ws',
      model: 'homebridge-ws',
      firmware: '1.0',
      category: platform.hap.Accessory.Categories.Sensor
    }
    super(platform, params)
    this.context.location = location

    this.location = location + '.json'
    this.state = {
      heartrate: 600,
      request: 0
    }
    this.temperatureService = this.getService(
      this.eve.Service.TemperatureSensor
    )
    if (this.temperatureService == null) {
      this.temperatureService = new this.eve.Service.TemperatureSensor(this.name)
      this.addService(this.temperatureService)
    }
    this.humidityService = this.getService(this.hap.Service.HumiditySensor)
    if (this.humidityService == null) {
      this.humidityService = new this.hap.Service.HumiditySensor(this.name)
      this.addService(this.humidityService)
    }
    this.pressureService = this.getService(this.eve.Service.AirPressureSensor)
    if (this.pressureService == null) {
      this.pressureService = new this.eve.Service.AirPressureSensor(this.name)
      this.addService(this.pressureService)
      this.pressureService.updateCharacteristic(this.eve.Characteristic.Elevation, 0)
      this.pressureService.addCharacteristic(this.eve.Characteristic.WeatherCondition)
      this.pressureService.addCharacteristic(this.eve.Characteristic.Rain1h)
      this.pressureService.addCharacteristic(this.eve.Characteristic.Rain24h)
      this.pressureService.addCharacteristic(this.eve.Characteristic.UVIndex)
      this.pressureService.addCharacteristic(this.eve.Characteristic.Visibility)
      this.pressureService.addCharacteristic(this.eve.Characteristic.WindDirection)
      this.pressureService.addCharacteristic(this.eve.Characteristic.WindSpeed)
      this.pressureService.addCharacteristic(this.my.Characteristic.LastUpdated)
      this.pressureService.addCharacteristic(this.my.Characteristic.Heartrate)
      this.pressureService.getCharacteristic(this.my.Characteristic.Heartrate)
        .setValue(this.state.heartrate / 60)
        .setProps({unit: 'min', minValue: 10, maxValue: 120, minStep: 10})
    } else {
      this.state.heartrate = this.pressureService
        .getCharacteristic(this.my.Characteristic.Heartrate).value * 60
    }
    const path = this.homebridge.user.storagePath() + '/accessories'
    const fileName = 'history_' + params.id + '.json'
    this.context.historyFile = path + '/' + fileName
    this.historyService = new this.HistoryService(
      'weather', {displayName: this.name}, {
        disableTimer: true,
        storage: 'fs',
        path: path,
        filename: fileName
      }
    )
    this.addService(this.historyService)
    this.pressureService.getCharacteristic(this.my.Characteristic.Heartrate)
      .on('set', this.setHeartrate.bind(this))
    this.entry = {temp: 0, humidity: 0, pressure: 0}
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
          .updateCharacteristic(this.eve.Characteristic.CurrentTemperature, temperature)
        this.humidityService.updateCharacteristic(this.hap.Characteristic.CurrentRelativeHumidity, humidity)
        this.pressureService
          .updateCharacteristic(this.eve.Characteristic.AirPressure, pressure)
          .updateCharacteristic(this.eve.Characteristic.WeatherCondition, condition)
          .updateCharacteristic(this.eve.Characteristic.Rain1h, rain1h)
          .updateCharacteristic(this.eve.Characteristic.Rain24h, rain)
          .updateCharacteristic(this.eve.Characteristic.UVIndex, uv < 0 ? 0 : uv)
          .updateCharacteristic(this.eve.Characteristic.Visibility, visibility)
          .updateCharacteristic(this.eve.Characteristic.WindDirection, wind)
          .updateCharacteristic(this.eve.Characteristic.WindSpeed, windSpeed)
          .updateCharacteristic(this.my.Characteristic.LastUpdated, lastupdated)
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
    this.context.heartrate = this.state.heartrate
    return callback()
  }
}
