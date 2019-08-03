#!/usr/bin/env node

// homebridge-ws/cli/upnp.js
// Copyright © 2019 Erik Baauw. All rights reserved.
//
// Homebridge plugin for virtual weather station.

'use strict'

const homebridgeLib = require('homebridge-lib')

new homebridgeLib.UpnpCommand().main()
