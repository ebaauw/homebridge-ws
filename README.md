<p align="center">
  <img src="homebridge-ws.png" height="200px">  
</p>
<span align="center">

# Homebridge WS
[![Downloads](https://img.shields.io/npm/dt/homebridge-ws.svg)](https://www.npmjs.com/package/homebridge-ws)
[![Version](https://img.shields.io/npm/v/homebridge-ws.svg)](https://www.npmjs.com/package/homebridge-ws)
[![Homebridge Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/aCTWrqb)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

[![GitHub issues](https://img.shields.io/github/issues/ebaauw/homebridge-ws)](https://github.com/ebaauw/homebridge-ws/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/ebaauw/homebridge-ws)](https://github.com/ebaauw/homebridge-ws/pulls)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

</span>

## Homebridge plugin for virtual weather station
Copyright © 2018-2020 Erik Baauw. All rights reserved.

This [Homebridge](https://github.com/homebridge/homebridge) plugin exposes one or more virtual weather stations to Apple's [HomeKit](http://www.apple.com/ios/home/).
The weather is obtained from [OpenWeatherMap](https://openweathermap.org).

Each weather station is exposed as a separate accessory, mimicking an Eve Degree, with separate services for Temperature, Humidity, and Air Pressure.
In addition, Homebridge WS provides a Leak Sensor service, to receive HomeKit notifications for rain or snow.
The Leak Sensor service contains a full weather report, including observation time, conditions, clouds, rain, snow, wind, min/max temperature, UV index, visibility, sunrise, and sunset.
The Temperature, Humidity, and Leak sensors are supported Apple's [Home](https://support.apple.com/en-us/HT204893) app and by Siri.
You need another HomeKit app, like [Eve](https://www.evehome.com/en/eve-app), for the Air Pressure sensor and the full weather report
In Eve, you also get history for Temperature, Humidity and Air Pressure.

Optionally, Homebridge WS exposes a second _Forecast_ accessory per location, with a Leak Sensor service per hourly or daily forecast.

There are many other weather station plugins out there.
I created this one for fun and for testing plugin designs.
In particular, this plugin is the launching plugin for [homebridge-lib](https://github.com/ebaauw/homebridge-lib).

### Prerequisites
You need to obtain an [API key](https://openweathermap.org/price) from OpenWeatherMap.
The free tier of the _Current weather and forecasts collection_ will do just fine.

You need a server to run Homebridge.
This can be anything running [Node.js](https://nodejs.org): from a Raspberry Pi, a NAS system, or an always-on PC running Linux, macOS, or Windows.
See the [Homebridge Wiki](https://github.com/homebridge/homebridge/wiki) for details.
I run Homebridge WS on a Raspberry Pi 3B+.

To interact with HomeKit, you need Siri or a HomeKit app on an iPhone, Apple Watch, iPad, iPod Touch, or Apple TV (4th generation or later).
I recommend to use the latest released versions of iOS, watchOS, and tvOS.  
Please note that Siri and even Apple's [Home](https://support.apple.com/en-us/HT204893) app still provide only limited HomeKit support.
To use the full features of Homebridge WS, you might want to check out some other HomeKit apps, like the [Eve](https://www.evehome.com/en/eve-app) app (free) or Matthias Hochgatterer's [Home+](https://hochgatterer.me/home/) app (paid).  

### Installation
To install Homebridge WS:
- Follow the instructions on the [Homebridge Wiki](https://github.com/homebridge/homebridge/wiki) to install Node.js and Homebridge;
- Install the Homebridge WS plugin through Homebridge Config UI X or manually by:
  ```
  $ sudo npm -g i homebridge-ws
  ```
- Edit `config.json` and add the `WS` platform provided by Homebridge WS, see [**Configuration**](#configuration).

### Configuration
In Homebridge's `config.json` you need to specify Homebridge WS as a platform plugin.
Furthermore, you need to specify your OpenWeatherMap [API key](https://openweathermap.org/price), and [location(s)](https://openweathermap.org/current):
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

To expose weather forecasts, set `"dailyForecasts": `_d_ (with _d_ between 1 and 7) or `"hourlyForcasts":` _h_ (with _h_ between 1 and 47) in config.json.
When either has been set, Homebridge WS exposes an additional _Forecast_ accessory per location, with a Leak Sensor service per forecast.
Home will only show _Leak Detected_ per forecast, in Eve you can see the full weather reports.

Note that OpenWeatherMap's One Call API returns the current conditions and forecasts in a single API call, so enabling forecasts won't increase the number of outgoing API calls.  The rate at which OpenWeatherMap is called can be changed using the _Heartrate_ characteristic in the Leak Sensor service on the main accessory.

### Troubleshooting

#### Check Dependencies
If you run into Homebridge startup issues, please double-check what versions of Node.js and of Homebridge have been installed.
Homebridge WS has been developed and tested using the [latest LTS](https://nodejs.org/en/about/releases/) version of Node.js and the [latest](https://www.npmjs.com/package/homebridge) version of Homebridge.
Other versions might or might not work - I simply don't have the bandwidth to test these.

#### Run Homebridge WS Solo
If you run into Homebridge startup issues, please run a separate instance of Homebridge with only Homebridge WS (and Homebridge Config UI X) enabled in `config.json`.
This way, you can determine whether the issue is related to Homebridge WS itself, or to the interaction of multiple Homebridge plugins in your setup.
You can start this separate instance of Homebridge on a different system, as a different user, or from a different user directory (specified by the `-U` flag).
Make sure to use a different Homebridge `name`, `username`, and (if running on the same system) `port` in the `config.json` for each instance.

#### Debug Log File
Homebridge WS outputs an info message for each HomeKit characteristic value it sets and for each HomeKit characteristic value change notification it receives.
When Homebridge is started with `-D`, Homebridge WS outputs a debug message for each request it makes to OpenWeatherMap.

To capture these messages into a log file do the following:
- If you're running Homebridge as a service, stop that service;
- Run Homebridge manually, capturing the output into a file, by issuing:
  ```
  $ homebridge -CD 2>&1 | tee homebridge.log
  ```
- Interact with your devices, through their native app and or through HomeKit to trigger the issue;
- Hit interrupt (ctrl-C) to stop Homebridge;
- If you're running Homebridge as a service, restart the service;
- Compress the log file by issuing:
  ```
  $ gzip homebridge.log
  ```

#### Getting Help
If you have a question, please post a message to the **#ws** channel of the Homebridge community on [Discord](https://discord.gg/aCTWrqb).

If you encounter a problem, please open an issue on [GitHub](https://github.com/ebaauw/homebridge-ws/issues).
Please **attach** a copy of `homebridge.log.gz` to the issue, see [**Debug Log File**](#debug-log-file).
Please do **not** copy/paste large amounts of log output.

### Caveats
Homebridge WS is a hobby project of mine, provided as-is, with no warranty whatsoever.  I've been running it successfully at my home for years, but your mileage might vary.

The HomeKit terminology needs some getting used to.
An _accessory_ more or less corresponds to a physical device, accessible from your iOS device over WiFi or Bluetooth.
A _bridge_ (like Homebridge) is an accessory that provides access to other, bridged, accessories.
An accessory might provide multiple _services_.
Each service corresponds to a virtual device (like a lightbulb, switch, motion sensor, ..., but also: a programmable switch button, accessory information, battery status).
Siri interacts with services, not with accessories.
A service contains one or more _characteristics_.
A characteristic is like a service attribute, which might be read or written by HomeKit apps.
You might want to checkout Apple's [HomeKit Accessory Simulator](https://developer.apple.com/documentation/homekit/testing_your_app_with_the_homekit_accessory_simulator), which is distributed as an additional tool for `Xcode`.
