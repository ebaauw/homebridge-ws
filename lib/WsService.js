// homebridge-ws/lib/WsService.js
// Copyright © 2018-2019 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

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
  static get Temperature () {
    return class Temperature extends WsService {
      constructor (wsAccessory, params = {}) {
        params.name = wsAccessory.name + ' Temperature'
        params.Service = wsAccessory.Service.eve.TemperatureSensor
        super(wsAccessory, params)
        this.addCharacteristic({
          key: 'temperature',
          Characteristic: this.Characteristic.eve.CurrentTemperature,
          unit: '°C'
        })
        this.addCharacteristic({
          key: 'temperatureUnit',
          Characteristic: this.Characteristic.hap.TemperatureDisplayUnits,
          value: this.Characteristic.hap.TemperatureDisplayUnits.CELSIUS
        })
      }

      checkObservation (observation) {
        this.values.temperature = Math.round(observation.main.temp * 10) / 10
      }
    }
  }

  static get Humidity () {
    return class Humidity extends WsService {
      constructor (wsAccessory, params = {}) {
        params.name = wsAccessory.name + ' Humidity'
        params.Service = wsAccessory.Service.hap.HumiditySensor
        super(wsAccessory, params)
        this.addCharacteristic({
          key: 'humidity',
          Characteristic: this.Characteristic.hap.CurrentRelativeHumidity,
          unit: '%'
        })
      }

      checkObservation (observation) {
        this.values.humidity = observation.main.humidity
      }
    }
  }

  static get AirPressure () {
    return class AirPressure extends WsService {
      constructor (wsAccessory, params = {}) {
        params.name = wsAccessory.name + ' Weather'
        params.Service = wsAccessory.Service.eve.AirPressureSensor
        super(wsAccessory, params)
        this.addCharacteristic({
          key: 'pressure',
          Characteristic: this.Characteristic.eve.AirPressure
        })
        this.addCharacteristic({
          key: 'elevation',
          Characteristic: this.Characteristic.eve.Elevation,
          value: 0
        })
        this.addCharacteristic({
          key: 'condition',
          Characteristic: this.Characteristic.eve.WeatherCondition
        })
        // this.addCharacteristic({
        //   key: 'rain1h',
        //   Characteristic: this.Characteristic.eve.Rain1h
        // })
        // this.addCharacteristic({
        //   key: 'rain',
        //   Characteristic: this.Characteristic.eve.Rain24h
        // })
        this.addCharacteristic({
          key: 'visibility',
          Characteristic: this.Characteristic.eve.Visibility
        })
        this.addCharacteristic({
          key: 'wind',
          Characteristic: this.Characteristic.eve.WindDirection
        })
        this.addCharacteristic({
          key: 'windSpeed',
          Characteristic: this.Characteristic.eve.WindSpeed
        })
        this.addCharacteristic({
          key: 'lastupdated',
          Characteristic: this.Characteristic.my.LastUpdated
        })
        this.addCharacteristic({
          key: 'heartrate',
          Characteristic: this.Characteristic.my.Heartrate,
          props: { unit: 'min', minValue: 10, maxValue: 120, minStep: 10 },
          value: 10
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
        this.values.lastupdated = String(new Date(moment.unix(observation.dt)))
          .substr(0, 24)
      }
    }
  }
}

module.exports = WsService
