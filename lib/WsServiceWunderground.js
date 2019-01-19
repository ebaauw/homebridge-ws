// homebridge-ws/lib/WsServiceWunderground.js
// Copyright © 2018-2019 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

'use strict'

const homebridgeLib = require('homebridge-lib')
const moment = require('moment')

function check (value) {
  const v = parseInt(value)
  return isNaN(v) ? 0 : v
}

module.exports = class WsServiceWunderground extends homebridgeLib.ServiceDelegate {
  static get Temperature () {
    return class Temperature extends WsServiceWunderground {
      constructor (wsAccessory, params = {}) {
        params.name = wsAccessory.name + ' Temperature'
        params.Service = wsAccessory.Service.eve.TemperatureSensor
        super(wsAccessory, params)
      }

      get characteristics () {
        return [
          {
            key: 'temperature',
            Characteristic: this.Characteristic.eve.CurrentTemperature,
            unit: '°C'
          },
          {
            key: 'temperatureUnit',
            Characteristic: this.Characteristic.hap.TemperatureDisplayUnits,
            value: this.Characteristic.hap.TemperatureDisplayUnits.CELSIUS
          }
        ]
      }

      checkObservation (observation) {
        this.values.temperature = check(observation.temp_c)
      }
    }
  }

  static get Humidity () {
    return class Humidity extends WsServiceWunderground {
      constructor (wsAccessory, params = {}) {
        params.name = wsAccessory.name + ' Humidity'
        params.Service = wsAccessory.Service.hap.HumiditySensor
        super(wsAccessory, params)
      }

      get characteristics () {
        return [
          {
            key: 'humidity',
            Characteristic: this.Characteristic.hap.CurrentRelativeHumidity,
            unit: '%'
          }
        ]
      }

      checkObservation (observation) {
        this.values.humidity = check(observation.relative_humidity)
      }
    }
  }

  static get AirPressure () {
    return class AirPressure extends WsServiceWunderground {
      constructor (wsAccessory, params = {}) {
        params.name = wsAccessory.name + ' Weather'
        params.Service = wsAccessory.Service.eve.AirPressureSensor
        super(wsAccessory, params)
      }

      get characteristics () {
        return [
          {
            key: 'pressure',
            Characteristic: this.Characteristic.eve.AirPressure
          },
          {
            key: 'elevation',
            Characteristic: this.Characteristic.eve.Elevation,
            value: 0
          },
          {
            key: 'condition',
            Characteristic: this.Characteristic.eve.WeatherCondition
          },
          {
            key: 'rain1h',
            Characteristic: this.Characteristic.eve.Rain1h
          },
          {
            key: 'rain',
            Characteristic: this.Characteristic.eve.Rain24h
          },
          {
            key: 'uv',
            Characteristic: this.Characteristic.eve.UVIndex
          },
          {
            key: 'visibility',
            Characteristic: this.Characteristic.eve.Visibility
          },
          {
            key: 'wind',
            Characteristic: this.Characteristic.eve.WindDirection
          },
          {
            key: 'windSpeed',
            Characteristic: this.Characteristic.eve.WindSpeed
          },
          {
            key: 'lastupdated',
            Characteristic: this.Characteristic.my.LastUpdated
          },
          {
            key: 'heartrate',
            Characteristic: this.Characteristic.my.Heartrate,
            props: { unit: 'min', minValue: 10, maxValue: 120, minStep: 10 },
            value: 10
          }
        ]
      }

      checkObservation (observation) {
        this.values.pressure = check(observation.pressure_mb)
        this.values.condition = observation.weather
        this.values.rain1h = check(observation.precip_1hr_metric)
        this.values.rain = check(observation.precip_today_metric)
        const uv = check(observation.UV)
        this.values.uv = uv < 0 ? 0 : uv
        this.values.visibility = check(observation.visibility_km)
        this.values.wind = observation.wind_dir
        this.values.windSpeed = check(observation.wind_kph)
        this.values.lastupdated =
          String(new Date(moment.unix(observation.observation_epoch)))
            .substr(0, 24)
      }
    }
  }
}
