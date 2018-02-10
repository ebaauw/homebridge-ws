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

function check(value) {
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
  this.displayName = name
  this.url = 'http://api.wunderground.com/api/' + platform.config.apiKey + '/'
  this.resource = 'conditions/q/' + station + '.json'
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
    // .addCharacteristic(eve.Characteristic.WeatherCondition)
    // .addCharacteristic(eve.Characteristic.Rain1h)
    // .addCharacteristic(eve.Characteristic.Rain24h)
    // .addCharacteristic(eve.Characteristic.UVIndex)
    // .addCharacteristic(eve.Characteristic.Visibility)
    // .addCharacteristic(eve.Characteristic.WindDirection)
    // .addCharacteristic(eve.Characteristic.WindSpeed)

  this.pressureService.addCharacteristic(my.Characteristic.LastUpdated)
  this.historyService = new HistoryService('weather', this, {
    storage: 'fs'
  })
  this.entry = {}
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
    this.platform.request('Wunderground', this.url, this.resource)
    .then((response) => {
      const observation = response.current_observation
      const temperature = check(observation.temp_c)
      const humidity = check(observation.relative_humidity)
      const pressure = check(observation.pressure_mb)
      // const condition = observation.weather
      // const rain1h = check(observation.precip_1hr_metric)
      // const rain = check(observation.precip_today_metric)
      // const uv = check(observation.UV)
      // const visibility = check(observation.visibility_km)
      // const wind = observation.wind_dir
      // const windSpeed = check(observation.wind_kph)
      const lastupdated = Date(observation.observation_epoch).substr(0, 24)

      this.entry.temp = temperature
      this.entry.humidity = humidity
      this.entry.pressure = pressure

      this.temperatureService
        .updateCharacteristic(Characteristic.CurrentTemperature, temperature)
      this.humidityService
        .updateCharacteristic(Characteristic.CurrentRelativeHumidity, humidity)
      this.pressureService
        .updateCharacteristic(eve.Characteristic.AirPressure, pressure)
        // .updateCharacteristic(eve.Characteristic.WeatherCondition, condition)
        // .updateCharacteristic(eve.Characteristic.Rain1h, rain1h)
        // .updateCharacteristic(eve.Characteristic.Rain24h, rain)
        // .updateCharacteristic(eve.Characteristic.UVIndex, uv < 0 ? 0 : uv)
        // .updateCharacteristic(eve.Characteristic.Visibility, visibility)
        // .updateCharacteristic(eve.Characteristic.WindDirection, wind)
        // .updateCharacteristic(eve.Characteristic.WindSpeed, windSpeed)
        .updateCharacteristic(my.Characteristic.LastUpdated, lastupdated)
    }).catch((err) => {
      this.log.error(err)
    })
  }
  if (beat % 300 === 15) {
    this.entry.time = moment().unix()
    this.historyService.addEntry(this.entry)
  }
}
