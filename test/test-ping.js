/* global describe it before beforeEach after */
'use strict'
var expect = require('chai').expect
var sinon = require('sinon')
var cp = require('child_process')
var os = require('os')
var events = require('events')
var Readable = require('stream').Readable
var ping = require('..')
var semver = require('semver')

var windows_output = "\
Pinging www.some-domain.com [127.0.0.1] with 32 bytes of\n\
\n\
Reply from 127.0.0.1: bytes=32 time=809ms TTL=237\n\
Reply from 127.0.0.1: bytes=32 time=907ms TTL=237\n\
Reply from 127.0.0.1: bytes=32 time=613ms TTL=237\n\
Reply from 127.0.0.1: bytes=32 time=701ms TTL=237\n\
\n\
Ping statistics for 127.0.0.1:\n\
Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)\n\
Approximate round trip times in milli-seconds:\n\
Minimum = 548ms, Maximum = 564ms, Average = 555ms\n\
"

describe('Ping', function () {
  var host = '127.0.0.1'
  describe('runs in callback mode', function () {
    it('plain pings ' + host, function (done) {
      ping.sys.probe(host, function (isAlive) {
        expect(isAlive).to.be.true
        done()
      })
    })
    it('pings ' + host + ' with custom config', function (done) {
      ping.sys.probe(host, function (isAlive) {
        expect(isAlive).to.be.true
        done()
      }, {extra: ['-i 2']})
    })
    it('pings ' + host + ' with some default argument gone', function (done) {
      ping.sys.probe(host, function (isAlive) {
        expect(isAlive).to.be.true
        done()
      }, {extra: ['-i 2'], timeout: false})
    })
  })
  describe('runs in promise mode', function () {
    it('plain pings ' + host, function () {
      var promise = ping.promise.probe(host)
          .then(function (res) {
            expect(res.alive).to.be.true
            expect(res.time).to.be.above(0)
            expect(res.host).to.equal(host)
            expect(res.output).to.not.be.empty
            expect(res.min).to.be.above(0)
            expect(res.max).to.be.above(0)
            expect(res.avg).to.be.above(0)
            expect(res.stddev).to.match(/^[0-9.]+$/)
          })
      return promise
    })
    it('pings ' + host + ' with custom config', function () {
      var promise = ping.promise.probe(host, {
        timeout: 10,
        extra: ['-i 2']
      }).then(function (res) {
        expect(res.alive).to.be.true
        expect(res.time).to.be.above(0)
        expect(res.host).to.equal(host)
        expect(res.output).to.not.be.empty
        expect(res.min).to.be.above(0)
        expect(res.max).to.be.above(0)
        expect(res.avg).to.be.above(0)
        expect(res.stddev).to.match(/^[0-9.]+$/)
      })
      return promise
    })
    it('pings ' + host + ' with some default argument gone', function () {
      var promise = ping.promise.probe(host, {
        timeout: false,
        extra: ['-i 2']
      }).then(function (res) {
        expect(res.alive).to.be.true
        expect(res.time).to.be.above(0)
        expect(res.host).to.equal(host)
        expect(res.output).to.not.be.empty
        expect(res.min).to.be.above(0)
        expect(res.max).to.be.above(0)
        expect(res.avg).to.be.above(0)
        expect(res.stddev).to.match(/^[0-9.]+$/)
      })
      return promise
    })
  })
  describe('runs in a simulated Windows environment', function () {
    // Pretend we're in Windows to test compatibility
    var emitter = new events.EventEmitter()
    before(function () {
      if (!semver.satisfies(process.versions.node, '>0.11.14')) {
        this.skip()
      }
      this.stubs = [
        sinon.stub(cp, 'spawn', function () { return emitter }),
        sinon.stub(os, 'platform', function () { return 'windows' })
      ]
    })
    beforeEach(function () {
      emitter.stdout = new Readable()
      emitter.stdout.push(windows_output)
      emitter.stdout.push(null)
      emitter.stdout.on('end', function () {
        emitter.emit('close', 0)
      })
    })
    after(function () {
      this.stubs.forEach(function (stub) {
        stub.restore()
      })
    })
    it('plain pings ' + host, function () {
      var promise = ping.promise.probe(host)
          .then(function (res) {
            expect(res.alive).to.be.true
            expect(res.time).to.equal(809)
            expect(res.host).to.equal(host)
            expect(res.output).to.not.be.empty
            expect(res.min).to.equal(613)
            expect(res.max).to.equal(907)
            expect(res.avg).to.equal(757.5)
            expect(res.stddev).to.equal(110.7643895843786)
          })
      return promise
    })
    it('pings ' + host + ' with custom config', function () {
      var promise = ping.promise.probe(host, {
        timeout: 10,
        extra: ['-i 2']
      }).then(function (res) {
        expect(res.alive).to.be.true
        expect(res.time).to.equal(809)
        expect(res.host).to.equal(host)
        expect(res.output).to.not.be.empty
        expect(res.min).to.equal(613)
        expect(res.max).to.equal(907)
        expect(res.avg).to.equal(757.5)
        expect(res.stddev).to.equal(110.7643895843786)
      })
      return promise
    })
    it('pings ' + host + ' with some default argument gone', function () {
      var promise = ping.promise.probe(host, {
        timeout: false,
        extra: ['-i 2']
      }).then(function (res) {
        expect(res.alive).to.be.true
        expect(res.time).to.equal(809)
        expect(res.host).to.equal(host)
        expect(res.output).to.not.be.empty
        expect(res.min).to.equal(613)
        expect(res.max).to.equal(907)
        expect(res.avg).to.equal(757.5)
        expect(res.stddev).to.equal(110.7643895843786)
      })
      return promise
    })
  })
})
