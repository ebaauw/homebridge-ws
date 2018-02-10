// homebridge-hue/lib/WSPlatform.js
// Copyright © 2018 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

'use strict'

const deferred = require('deferred')
const request = require('request')
const semver = require('semver')

const homebridgeHueUtils = require('homebridge-hue-utils')
const CustomHomeKitTypesMy = homebridgeHueUtils.CustomHomeKitTypesMy
const CustomHomeKitTypesEve = homebridgeHueUtils.CustomHomeKitTypesEve
const WSAccessoryModule = require('./WSAccessory')
const WSAccessory = WSAccessoryModule.WSAccessory
const packageJson = require('../package.json')

module.exports = {
  WSPlatform: WSPlatform,
  setHomebridge: setHomebridge
}

function minVersion (range) {
  let s = range.split(' ')[0]
  while (s) {
    if (semver.valid(s)) {
      break
    }
    s = s.substring(1)
  }
  return s || undefined
}

// ===== Homebridge ============================================================

let homebridgeVersion

function setHomebridge (homebridge) {
  homebridgeVersion = homebridge.serverVersion
  const my = new CustomHomeKitTypesMy(homebridge)
  const eve = new CustomHomeKitTypesEve(homebridge)
  WSAccessoryModule.setHomebridge(homebridge, my, eve)
}

// ===== HuePlatform ===========================================================

function WSPlatform (log, configJson, api) {
  this.log = log
  this.api = api
  this.packageJson = packageJson
  this.configJson = configJson
  this.config = {}
  for (const key in configJson) {
    const value = configJson[key]
    switch (key.toLowerCase()) {
      case 'apikey':
        this.config.apiKey = value
        break
      case 'name':
        this.config.name = value
        break
      case 'platform':
        break
      // TODO
      // case 'timeout':
      //   break
      case 'station':
        this.config.station = value
        break
      default:
        this.log.warn('config.json: warning: %s: ignoring unknown key', key)
        break
    }
  }
  this.identify()
}

WSPlatform.prototype.accessories = function (callback) {
  let accessoryList = []

  this.request(
    'npm registry', 'https://registry.npmjs.org/', packageJson.name
  ).then((response) => {
    if (
      response && response['dist-tags'] &&
      response['dist-tags'].latest !== packageJson.version
    ) {
      this.log.warn(
        'warning: lastest version: %s v%s', packageJson.name,
        response['dist-tags'].latest
      )
    }
  }).catch((err) => {
    this.log.error(err)
  }).then(() => {
    const station = new WSAccessory(this, this.config.name, this.config.station)
    accessoryList.push(station)
    if (accessoryList.length > 0) {
      // Setup heartbeat.
      let beat = -1
      setInterval(() => {
        beat += 1
        beat %= 7 * 24 * 3600
        for (const accessory of accessoryList) {
          accessory.heartbeat(beat)
        }
      }, 1000)
    }
    callback(accessoryList)
  }).catch((err) => {
    this.log.error(err)
    callback(null) // Not going to help if error was thrown by callback().
  })
}

WSPlatform.prototype.identify = function () {
  this.log.info(
    '%s v%s, node %s, homebridge v%s', packageJson.name,
    packageJson.version, process.version, homebridgeVersion
  )
  if (semver.clean(process.version) !== minVersion(packageJson.engines.node)) {
    this.log.warn(
      'warning: not using recommended node version v%s LTS',
      minVersion(packageJson.engines.node)
    )
  }
  if (homebridgeVersion !== minVersion(packageJson.engines.homebridge)) {
    this.log.warn(
      'warning: not using recommended homebridge version v%s',
      minVersion(packageJson.engines.homebridge)
    )
  }
}

// Get resource from url.
WSPlatform.prototype.request = function (site, url, resource, ipv6) {
  const d = deferred()
  const requestObj = {
    method: 'GET',
    url: url + resource,
    timeout: 1000 * this.config.timeout,
    json: true
  }
  requestObj.family = ipv6 ? 6 : 4
  this.log.debug('%s: get /%s', site, resource)
  request(requestObj, (err, response, responseBody) => {
    if (err) {
      this.log.error('%s: communication error %s on %s', site, err.code, url)
      return d.resolve(null)
    }
    if (response.statusCode !== 200) {
      this.log.error(
        '%s: status %s %s', site, response.statusCode, response.statusMessage
      )
      return d.resolve(null)
    }
    this.log.debug('%s: get /%s ok', site, resource)
    return d.resolve(responseBody)
  })
  return d.promise
}
