// homebridge-ws/lib/WsService.js
// Copyright © 2018-2020 Erik Baauw. All rights reserved.
//
// Homebridge plugin for virtual weather station.

'use strict'

const homebridgeLib = require('homebridge-lib')
const moment = require('moment')

const windDirections = [
  'North', 'NNE', 'NE', 'ENE', 'East', 'ESE', 'SE', 'SSE',
  'South', 'SSW', 'SW', 'WSW', 'West', 'WNW', 'NW', 'NNW', 'North'
]
function windDirection (degrees) {
  return windDirections[Math.round(degrees * 16 / 360)]
}

class WsService extends homebridgeLib.ServiceDelegate {
  static get Temperature () { return Temperature }

  static get Humidity () { return Humidity }

  static get AirPressure () { return AirPressure }
}

class Temperature extends WsService {
  constructor (wsAccessory, params = {}) {
    params.name = wsAccessory.name + ' Temperature'
    params.Service = wsAccessory.Services.eve.TemperatureSensor
    super(wsAccessory, params)
    this.addCharacteristicDelegate({
      key: 'temperature',
      Characteristic: this.Characteristics.eve.CurrentTemperature,
      unit: '°C'
    })
    this.addCharacteristicDelegate({
      key: 'temperatureUnit',
      Characteristic: this.Characteristics.hap.TemperatureDisplayUnits,
      value: this.Characteristics.hap.TemperatureDisplayUnits.CELSIUS
    })
    this.addCharacteristicDelegate({
      key: 'lastupdated',
      Characteristic: this.Characteristics.my.LastUpdated,
      value: 'n/a'
    })
    this.addCharacteristicDelegate({
      key: 'heartrate',
      Characteristic: this.Characteristics.my.Heartrate,
      props: { unit: 'min', minValue: 10, maxValue: 120, minStep: 10 },
      value: 10
    })
  }

  checkObservation (observation) {
    this.values.temperature = Math.round(observation.main.temp * 10) / 10
    this.values.lastupdated = String(new Date(moment.unix(observation.dt)))
      .slice(0, 24)
  }
}

class Humidity extends WsService {
  constructor (wsAccessory, params = {}) {
    params.name = wsAccessory.name + ' Humidity'
    params.Service = wsAccessory.Services.hap.HumiditySensor
    super(wsAccessory, params)
    this.addCharacteristicDelegate({
      key: 'humidity',
      Characteristic: this.Characteristics.hap.CurrentRelativeHumidity,
      unit: '%'
    })
  }

  checkObservation (observation) {
    this.values.humidity = observation.main.humidity
  }
}

class AirPressure extends WsService {
  constructor (wsAccessory, params = {}) {
    params.name = wsAccessory.name + ' Weather'
    params.Service = wsAccessory.Services.eve.AirPressureSensor
    super(wsAccessory, params)
    this.addCharacteristicDelegate({
      key: 'pressure',
      Characteristic: this.Characteristics.eve.AirPressure
    })
    this.addCharacteristicDelegate({
      key: 'elevation',
      Characteristic: this.Characteristics.eve.Elevation,
      value: 0
    })
    this.addCharacteristicDelegate({
      key: 'condition',
      Characteristic: this.Characteristics.eve.WeatherCondition
    })
    // this.addCharacteristic({
    //   key: 'rain1h',
    //   Characteristic: Characteristics.eve.Rain1h
    // })
    // this.addCharacteristic({
    //   key: 'rain',
    //   Characteristic: Characteristics.eve.Rain24h
    // })
    this.addCharacteristicDelegate({
      key: 'visibility',
      Characteristic: this.Characteristics.eve.Visibility
    })
    this.addCharacteristicDelegate({
      key: 'wind',
      Characteristic: this.Characteristics.eve.WindDirection
    })
    this.addCharacteristicDelegate({
      key: 'windSpeed',
      Characteristic: this.Characteristics.eve.WindSpeed
    })
  }

  checkObservation (observation) {
    this.values.pressure = observation.main.pressure
    this.values.condition = observation.weather.map((condition) => {
      return condition.main
    }).join(', ')
    this.values.visibility = Math.round(observation.visibility / 1000)
    this.values.wind = windDirection(observation.wind.deg)
    this.values.windSpeed = Math.round(observation.wind.speed * 36) / 10
  }
}

module.exports = WsService
