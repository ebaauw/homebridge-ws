// homebridge-ws/lib/WsService.js
// Copyright © 2018-2025 Erik Baauw. All rights reserved.
//
// Homebridge plugin for virtual weather station.

import { ServiceDelegate } from 'homebridge-lib/ServiceDelegate'

function toDate (dt) {
  return String(new Date(dt * 1000)).slice(0, 24)
}

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
function toWeekDay (dt) {
  return weekDays[new Date(dt * 1000).getDay()]
}

const windDirections = [
  'North', 'NNE', 'NE', 'ENE', 'East', 'ESE', 'SE', 'SSE',
  'South', 'SSW', 'SW', 'WSW', 'West', 'WNW', 'NW', 'NNW', 'North'
]
function windDirection (degrees) {
  return windDirections[Math.round(degrees * 16 / 360)]
}

class WsService extends ServiceDelegate {
  static get Temperature () { return Temperature }

  static get Humidity () { return Humidity }

  static get AirPressure () { return AirPressure }

  static get Rain () { return Rain }

  static get Leak () { return Leak }

  static get Weather () { return Weather }

  static get DailyForecast () { return DailyForecast }

  static get HourlyForecast () { return HourlyForecast }
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
  }

  checkObservation (observation) {
    this.values.temperature = Math.round(observation.current.temp * 10) / 10
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
    this.values.humidity = observation.current.humidity
  }
}

class AirPressure extends WsService {
  constructor (wsAccessory, params = {}) {
    params.name = wsAccessory.name + ' Air Pressure'
    params.Service = wsAccessory.Services.eve.AirPressureSensor
    super(wsAccessory, params)
    this.addCharacteristicDelegate({
      key: 'trend',
      Characteristic: this.Characteristics.eve.WeatherTrend
    })
    this.addCharacteristicDelegate({
      key: 'pressure',
      Characteristic: this.Characteristics.eve.AirPressure
    })
    this.addCharacteristicDelegate({
      key: 'elevation',
      Characteristic: this.Characteristics.eve.Elevation,
      value: 0
    })
  }

  checkObservation (observation) {
    this.values.pressure = observation.current.pressure
    const conditionId = observation.current.weather[0].id
    switch (Math.floor(conditionId / 100)) {
      case 2: // Thunderstorm
        this.values.trend = this.Characteristics.eve.WeatherTrend.RAIN_WIND
        break
      case 3: // Drizzle
      case 5: // Rain
      case 6: // Snow
        this.values.trend = this.Characteristics.eve.WeatherTrend.RAIN
        break
      case 8: // Clear, Clouds
        this.values.trend = conditionId === 800
          ? this.Characteristics.eve.WeatherTrend.SUN
          : this.Characteristics.eve.WeatherTrend.CLOUDS_SUN
        break
      default:
        this.values.trend = this.Characteristics.eve.WeatherTrend.BLANK
        break
    }
  }
}

class Rain extends WsService {
  constructor (wsAccessory, params = {}) {
    params.name = wsAccessory.name + ' Rain'
    params.Service = wsAccessory.Services.hap.MotionSensor
    super(wsAccessory, params)
    this.addCharacteristicDelegate({
      key: 'motion',
      Characteristic: this.Characteristics.hap.MotionDetected
    })
    this.addCharacteristicDelegate({
      key: 'lastActivation',
      Characteristic: this.Characteristics.eve.LastActivation
    })
  }

  checkWeather (weather) {
    this.values.motion = (weather.values.rain || weather.values.snow)
  }
}

class Leak extends WsService {
  constructor (wsAccessory, params = {}) {
    params.name = wsAccessory.name + ' Rain'
    params.Service = wsAccessory.Services.hap.LeakSensor
    super(wsAccessory, params)
    this.addCharacteristicDelegate({
      key: 'leak',
      Characteristic: this.Characteristics.hap.LeakDetected
    })
  }

  checkWeather (weather) {
    this.values.leak = (weather.values.rain || weather.values.snow)
      ? this.Characteristics.hap.LeakDetected.LEAK_DETECTED
      : this.Characteristics.hap.LeakDetected.LEAK_NOT_DETECTED
  }
}

class Weather extends WsService {
  constructor (wsAccessory, params = {}) {
    params.name = wsAccessory.name + ' Weather'
    params.Service = wsAccessory.Services.my.Resource
    super(wsAccessory, params)

    this.addCharacteristicDelegate({
      key: 'apparentTemperature',
      Characteristic: this.Characteristics.my.ApparentTemperature,
      unit: '°C'
    })
    this.addCharacteristicDelegate({
      key: 'clouds',
      Characteristic: this.Characteristics.eve.Clouds,
      unit: '%'
    })
    this.addCharacteristicDelegate({
      key: 'condition',
      Characteristic: this.Characteristics.eve.Condition
    })
    this.addCharacteristicDelegate({
      key: 'conditionCategory',
      Characteristic: this.Characteristics.eve.ConditionCategory
    })
    this.addCharacteristicDelegate({
      key: 'dewPoint',
      Characteristic: this.Characteristics.eve.DewPoint,
      unit: '°C'
    })
    this.addCharacteristicDelegate({
      key: 'heartrate',
      Characteristic: this.Characteristics.my.Heartrate,
      props: { unit: 'min', minValue: 10, maxValue: 120, minStep: 10 },
      value: 10
    })
    this.addCharacteristicDelegate({
      key: 'logLevel',
      Characteristic: this.Characteristics.my.LogLevel,
      value: this.accessoryDelegate.logLevel
    })
    this.addCharacteristicDelegate({
      key: 'observationTime',
      Characteristic: this.Characteristics.eve.ObservationTime
    })
    this.addCharacteristicDelegate({
      key: 'rain',
      Characteristic: this.Characteristics.eve.Rain
    })
    this.addCharacteristicDelegate({
      key: 'rain1h',
      Characteristic: this.Characteristics.eve.Rain1h
    })
    this.addCharacteristicDelegate({
      key: 'rain24h',
      Characteristic: this.Characteristics.eve.Rain24h
    })
    this.addCharacteristicDelegate({
      key: 'snow',
      Characteristic: this.Characteristics.eve.Snow
    })
    this.addCharacteristicDelegate({
      key: 'sunrise',
      Characteristic: this.Characteristics.my.Sunrise
    })
    this.addCharacteristicDelegate({
      key: 'sunset',
      Characteristic: this.Characteristics.my.Sunset
    })
    this.addCharacteristicDelegate({
      key: 'temperatureMin',
      Characteristic: this.Characteristics.eve.MinimumTemperature,
      unit: '°C'
    })
    this.addCharacteristicDelegate({
      key: 'temperatureMax',
      Characteristic: this.Characteristics.my.TemperatureMax,
      unit: '°C'
    })
    this.addCharacteristicDelegate({
      key: 'uvIndex',
      Characteristic: this.Characteristics.eve.UvIndex
    })
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
    const o = observation.current
    this.vdebug('observation: %j', o)
    const d0 = observation.daily[0]
    this.vdebug('observation day0: %j', d0)
    if (o == null || d0 == null) {
      return
    }

    this.values.apparentTemperature = Math.round(o.feels_like * 10) / 10
    this.values.clouds = o.clouds
    this.values.condition = o.weather.map((condition) => {
      return condition.main
    }).join(', ')
    this.values.conditionCategory = o.weather[0].id
    this.values.dewPoint = o.dew_point
    this.values.observationTime = toDate(o.dt)
    this.values.rain = o.weather.reduce((rain, condition) => {
      return rain || [2, 3, 5].includes(Math.floor(condition.id / 100))
    }, false)
    this.values.rain1h = o.rain != null ? o.rain['1h'] : 0
    this.values.rain24h = d0.rain != null ? d0.rain : 0
    this.values.snow = o.weather.reduce((snow, condition) => {
      return snow || (Math.floor(condition.id / 100) === 6)
    }, false)
    this.values.sunrise = toDate(o.sunrise)
    this.values.sunset = toDate(o.sunset)
    this.values.temperatureMin = Math.round(d0.temp.min * 10) / 10
    this.values.temperatureMax = Math.round(d0.temp.max * 10) / 10
    this.values.visibility = Math.round(o.visibility / 1000)
    this.values.uvIndex = o.uvi
    this.values.wind = windDirection(o.wind_deg)
    this.values.windSpeed = o.wind_speed
  }
}

class DailyForecast extends WsService {
  constructor (wsAccessory, params = {}) {
    params.name = wsAccessory.name
    params.name += ' ' + params.day + 'd'
    params.Service = wsAccessory.Services.hap.MotionSensor
    params.subtype = params.day + 'd'
    params.exposeConfiguredName = true
    super(wsAccessory, params)
    this.day = params.day

    this.addCharacteristicDelegate({
      key: 'motion',
      Characteristic: this.Characteristics.hap.MotionDetected
    })

    this.addCharacteristicDelegate({
      key: 'index',
      Characteristic: this.Characteristics.hap.ServiceLabelIndex,
      value: params.index
    })

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
      key: 'humidity',
      Characteristic: this.Characteristics.hap.CurrentRelativeHumidity,
      unit: '%'
    })

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
      key: 'apparentTemperature',
      Characteristic: this.Characteristics.my.ApparentTemperature,
      unit: '°C'
    })
    this.addCharacteristicDelegate({
      key: 'clouds',
      Characteristic: this.Characteristics.eve.Clouds,
      unit: '%'
    })
    this.addCharacteristicDelegate({
      key: 'condition',
      Characteristic: this.Characteristics.eve.Condition
    })
    this.addCharacteristicDelegate({
      key: 'conditionCategory',
      Characteristic: this.Characteristics.eve.ConditionCategory
    })
    this.addCharacteristicDelegate({
      key: 'day',
      Characteristic: this.Characteristics.eve.Day
    })
    this.addCharacteristicDelegate({
      key: 'dewPoint',
      Characteristic: this.Characteristics.eve.DewPoint,
      unit: '°C'
    })
    this.addCharacteristicDelegate({
      key: 'observationTime',
      Characteristic: this.Characteristics.eve.ObservationTime
    })
    this.addCharacteristicDelegate({
      key: 'rain',
      Characteristic: this.Characteristics.eve.Rain
    })
    this.addCharacteristicDelegate({
      key: 'rain24h',
      Characteristic: this.Characteristics.eve.Rain24h
    })
    this.addCharacteristicDelegate({
      key: 'snow',
      Characteristic: this.Characteristics.eve.Snow
    })
    this.addCharacteristicDelegate({
      key: 'sunrise',
      Characteristic: this.Characteristics.my.Sunrise
    })
    this.addCharacteristicDelegate({
      key: 'sunset',
      Characteristic: this.Characteristics.my.Sunset
    })
    this.addCharacteristicDelegate({
      key: 'temperatureMin',
      Characteristic: this.Characteristics.eve.MinimumTemperature,
      unit: '°C'
    })
    this.addCharacteristicDelegate({
      key: 'temperatureMax',
      Characteristic: this.Characteristics.my.TemperatureMax,
      unit: '°C'
    })
    this.addCharacteristicDelegate({
      key: 'uvIndex',
      Characteristic: this.Characteristics.eve.UvIndex
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
    const o = observation.daily[this.day]
    this.vdebug('observation: %j', o)
    if (o == null) {
      return
    }

    this.values.apparentTemperature = Math.round(o.feels_like.day * 10) / 10
    this.values.clouds = o.clouds
    this.values.condition = o.weather.map((condition) => {
      return condition.main
    }).join(', ')
    this.values.conditionCategory = o.weather[0].id
    this.values.day = toWeekDay(o.dt)
    this.values.dewPoint = o.dew_point
    this.values.humidity = o.humidity
    this.values.observationTime = toDate(o.dt)
    this.values.pressure = o.pressure
    this.values.rain = o.weather.reduce((rain, condition) => {
      return rain || [2, 3, 5].includes(Math.floor(condition.id / 100))
    }, false)
    this.values.rain24h = o.rain != null ? o.rain : 0
    this.values.snow = o.weather.reduce((snow, condition) => {
      return snow || (Math.floor(condition.id / 100) === 6)
    }, false)
    this.values.sunrise = toDate(o.sunrise)
    this.values.sunset = toDate(o.sunset)
    this.values.temperature = Math.round(o.temp.day * 10) / 10
    this.values.temperatureMin = Math.round(o.temp.min * 10) / 10
    this.values.temperatureMax = Math.round(o.temp.max * 10) / 10
    this.values.uvIndex = o.uvi
    this.values.wind = windDirection(o.wind_deg)
    this.values.windSpeed = o.wind_speed

    this.values.motion = (this.values.rain || this.values.snow)
  }
}

class HourlyForecast extends WsService {
  constructor (wsAccessory, params = {}) {
    params.name = wsAccessory.name
    params.name += ' ' + params.hour + 'h'
    params.Service = wsAccessory.Services.hap.MotionSensor
    params.subtype = params.hour + 'h'
    super(wsAccessory, params)
    this.hour = params.hour

    this.addCharacteristicDelegate({
      key: 'motion',
      Characteristic: this.Characteristics.hap.MotionDetected
    })

    this.addCharacteristicDelegate({
      key: 'index',
      Characteristic: this.Characteristics.hap.ServiceLabelIndex,
      value: params.index
    })

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
      key: 'humidity',
      Characteristic: this.Characteristics.hap.CurrentRelativeHumidity,
      unit: '%'
    })

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
      key: 'apparentTemperature',
      Characteristic: this.Characteristics.my.ApparentTemperature,
      unit: '°C'
    })
    this.addCharacteristicDelegate({
      key: 'clouds',
      Characteristic: this.Characteristics.eve.Clouds,
      unit: '%'
    })
    this.addCharacteristicDelegate({
      key: 'condition',
      Characteristic: this.Characteristics.eve.Condition
    })
    this.addCharacteristicDelegate({
      key: 'conditionCategory',
      Characteristic: this.Characteristics.eve.ConditionCategory
    })
    this.addCharacteristicDelegate({
      key: 'dewPoint',
      Characteristic: this.Characteristics.eve.DewPoint,
      unit: '°C'
    })
    this.addCharacteristicDelegate({
      key: 'observationTime',
      Characteristic: this.Characteristics.eve.ObservationTime
    })
    this.addCharacteristicDelegate({
      key: 'rain',
      Characteristic: this.Characteristics.eve.Rain
    })
    this.addCharacteristicDelegate({
      key: 'rain1h',
      Characteristic: this.Characteristics.eve.Rain1h
    })
    this.addCharacteristicDelegate({
      key: 'snow',
      Characteristic: this.Characteristics.eve.Snow
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
    const o = observation.hourly[this.hour]
    this.vdebug('observation: %j', o)
    if (o == null) {
      return
    }

    this.values.apparentTemperature = Math.round(o.feels_like * 10) / 10
    this.values.clouds = o.clouds
    this.values.condition = o.weather.map((condition) => {
      return condition.main
    }).join(', ')
    this.values.conditionCategory = o.weather[0].id
    this.values.dewPoint = o.dew_point
    this.values.humidity = o.humidity
    this.values.observationTime = toDate(o.dt)
    this.values.pressure = o.pressure
    this.values.rain = o.weather.reduce((rain, condition) => {
      return rain || [2, 3, 5].includes(Math.floor(condition.id / 100))
    }, false)
    this.values.rain1h = o.rain != null ? o.rain['1h'] : 0
    this.values.snow = o.weather.reduce((snow, condition) => {
      return snow || (Math.floor(condition.id / 100) === 6)
    }, false)
    this.values.temperature = Math.round(o.temp * 10) / 10
    this.values.wind = windDirection(o.wind_deg)
    this.values.windSpeed = o.wind_speed

    this.values.motion = (this.values.rain || this.values.snow)
  }
}

export { WsService }
