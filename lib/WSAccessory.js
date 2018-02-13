// homebridge-hue/lib/WSPlatform.js
// Copyright © 2018 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

'use strict'

const fakegatoHistory = require('fakegato-history')
const moment = require('moment')

module.exports = {
  setHomebridge: setHomebridge,
  WSAccessory: WSAccessory
}

function check (value) {
  const v = parseInt(value)
  return isNaN(v) ? 0 : v
}

// ===== Homebridge ============================================================

let Service
let Characteristic
let eve
let my
let HistoryService

function setHomebridge (homebridge, _my, _eve) {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  eve = _eve
  my = _my
  HistoryService = fakegatoHistory(homebridge)
}

// ===== HueBridge =============================================================

function WSAccessory (platform, name, station) {
  this.log = platform.log
  this.platform = platform
  this.name = name
  this.station = station + '.json'
  this.displayName = name
  this.uuid_base = name
  this.state = {
    heartrate: 600,
    request: 0
  }
  this.infoService = new Service.AccessoryInformation()
  this.infoService
    .updateCharacteristic(Characteristic.Manufacturer, 'homebridge-ws')
    .updateCharacteristic(Characteristic.Model, 'homebridge-ws')
    .updateCharacteristic(Characteristic.SerialNumber, name)
    .updateCharacteristic(Characteristic.FirmwareRevision, this.platform.packageJson.version)

  this.temperatureService = new eve.Service.TemperatureSensor(this.name)
  this.humidityService = new Service.HumiditySensor(this.name)
  this.pressureService = new eve.Service.AirPressureSensor(this.name)
  this.pressureService
    .updateCharacteristic(eve.Characteristic.Elevation, 0)
  this.pressureService.addCharacteristic(eve.Characteristic.WeatherCondition)
  this.pressureService.addCharacteristic(eve.Characteristic.Rain1h)
  this.pressureService.addCharacteristic(eve.Characteristic.Rain24h)
  this.pressureService.addCharacteristic(eve.Characteristic.UVIndex)
  this.pressureService.addCharacteristic(eve.Characteristic.Visibility)
  this.pressureService.addCharacteristic(eve.Characteristic.WindDirection)
  this.pressureService.addCharacteristic(eve.Characteristic.WindSpeed)
  this.pressureService.addCharacteristic(my.Characteristic.LastUpdated)
  this.pressureService.addCharacteristic(my.Characteristic.Heartrate)
  this.pressureService.getCharacteristic(my.Characteristic.Heartrate)
    .setProps({unit: 'min', minValue: 10, maxValue: 120, minStep: 10})
    .setValue(this.state.heartrate / 60)
    .on('set', this.setHeartrate.bind(this))
  this.historyService = new HistoryService('weather', this, {
    storage: 'fs'
  })
  this.entry = {temp: 0, humidity: 0, pressure: 0}
}

WSAccessory.prototype.getServices = function () {
  return [
    this.infoService,
    this.temperatureService,
    this.humidityService,
    this.pressureService,
    this.historyService
  ]
}

WSAccessory.prototype.heartbeat = function (beat) {
  if (beat % this.state.heartrate === 0) {
    this.platform.wunderground.get(this.station).then((response) => {
      if (!response.current_observation) {
        if (
          response.response && response.response.error &&
          response.response.error.description
        ) {
          this.log.error(
            '%s: Wunderground error: %s', this.name,
            response.response.error.description
          )
          return
        }
        this.log.error('%s: Wunderground error: %j', this.name, response)
        return
      }
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
        '%s: temperature: %d°C, humidity: %d%, pressure: %d hPa',
        this.name, temperature, humidity, pressure
      )
      this.entry.temp = temperature
      this.entry.humidity = humidity
      this.entry.pressure = pressure

      this.temperatureService
        .updateCharacteristic(eve.Characteristic.CurrentTemperature, temperature)
      this.humidityService
        .updateCharacteristic(Characteristic.CurrentRelativeHumidity, humidity)
      this.pressureService
        .updateCharacteristic(eve.Characteristic.AirPressure, pressure)
        .updateCharacteristic(eve.Characteristic.WeatherCondition, condition)
        .updateCharacteristic(eve.Characteristic.Rain1h, rain1h)
        .updateCharacteristic(eve.Characteristic.Rain24h, rain)
        .updateCharacteristic(eve.Characteristic.UVIndex, uv < 0 ? 0 : uv)
        .updateCharacteristic(eve.Characteristic.Visibility, visibility)
        .updateCharacteristic(eve.Characteristic.WindDirection, wind)
        .updateCharacteristic(eve.Characteristic.WindSpeed, windSpeed)
        .updateCharacteristic(my.Characteristic.LastUpdated, lastupdated)
    }).catch((err) => {
      this.log.error(err)
    })
  }
  if (beat % 300 === 5) {
    this.entry.time = moment().unix()
    this.historyService.addEntry(this.entry)
  }
}

WSAccessory.prototype.setHeartrate = function (rate, callback) {
  if (rate === this.state.heartrate) {
    return callback()
  }
  this.log.info(
    '%s: homekit heartrate changed from %s min to %s min', this.name,
    this.state.heartrate / 60, rate
  )
  this.state.heartrate = rate * 60
  return callback()
}
