# homebridge-ws
[![npm](https://img.shields.io/npm/dt/homebridge-ws.svg)](https://www.npmjs.com/package/homebridge-ws) [![npm](https://img.shields.io/npm/v/homebridge-ws.svg)](https://www.npmjs.com/package/homebridge-ws)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Homebridge plugin for virtual weather station
Copyright © 2018-2019 Erik Baauw. All rights reserved.

This [homebridge](https://github.com/nfarina/homebridge) plugin exposes a virtual weather station to Apple's [HomeKit](http://www.apple.com/ios/home/).  It mimics an Eve Degree, providing separate services for Temperature, Humidity, and Air Pressure.  Temperature and Humidity are supported Apple's [Home](https://support.apple.com/en-us/HT204893) app and by Siri.  For Air Pressure you need another app, like like [Eve](https://www.evehome.com/en/eve-app).  In Eve, you also get history for Temperature, Humidity and Air Pressure.  The weather is retrieved from [OpenWeatherMap](https://openweathermap.org).

There's many other weather station plugins out there.  I created this one for fun and for testing plugin designs.  In particular, this plugin is the launching plugin for [homebridge-lib](https://github.com/ebaauw/homebridge-lib).

### Installation
To install homebridge-ws, use:
```
$ npm -g i hblib homebridge-ws
```

### Configuration
In homebridge's `config.json` you need to specify homebridge-ws as a platform plugin.  Furthermore, you need to specify your OpenWeatherMap [API key](https://openweathermap.org/price), and [location(s)](https://openweathermap.org/current):
```json
  "platforms": [
    {
      "platform": "WS",
      "name": "Weather",
      "apikey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "locations": ["Amsterdam"]
    }
  ]
```
