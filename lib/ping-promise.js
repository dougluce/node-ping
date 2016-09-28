'use strict';

/**
* LICENSE MIT
* (C) Daniel Zelisko
* http://github.com/danielzzz/node-ping
*
* a wrapper for ping
* Now with support of not only english Windows.
*
*/

// System library
var cp = require('child_process');
var os = require('os');
var rl = require('readline');

// 3rd-party library
var Q = require('q');

// Our library
var linuxBuilder = require('./builder/linux');
var macBuilder = require('./builder/mac');
var winBuilder = require('./builder/win');

/**
 * Class::PromisePing
 *
 * @param {string} addr - Hostname or ip address
 * @param {PingConfig} config - Configuration for command ping
 * @return {Promise}
 */
function probe(addr, config) {
    var p = os.platform();
    var ls;
    var deferred = Q.defer();

    if (p === 'linux') {
        // linux
        var args = linuxBuilder.getResult(addr, config);
        ls = cp.spawn('/bin/ping', args);
    } else if (p.match(/^win/)) {
        // windows
        var args = winBuilder.getResult(addr, config);
        ls = cp.spawn(process.env.SystemRoot + '/system32/ping.exe', args);
    } else if (p === 'darwin' || p === 'freebsd') {
        // mac osx
        var args = macBuilder.getResult(addr, config);
        ls = cp.spawn('/sbin/ping', args);
    } else if (p === 'aix') {
        // aix
        var args = linuxBuilder.getResult(addr, config);
        ls = cp.spawn('/usr/sbin/ping', args);
    }
    var linereader = rl.createInterface(ls.stdout, ls.stdin);

    ls.on('error', deferred.reject);

    var results = {
        host: addr,
        output: '',
        time: null,
        min: null,
        max: null,
        alive: false
    }

    var isWin = p.match(/^win/);
    var N = 0;
    var sum = 0;
    var sumsq = 0;

    linereader.on('line', function (line) {
        if (isWin && results.alive === false && line.search(/TTL=[0-9]+/i) > 0) {
            results.alive = true;
        }
        var match = /time=([0-9\.]+)\s*ms/i.exec(line);
        if (match) {
            var parsedTime = parseFloat(match[1], 10);
            if (results.time === null) {
                results.time = parsedTime;
            }
            if (results.min === null || results.min > parsedTime) {
                results.min = parsedTime;
            }
            if (results.max === null || results.max < parsedTime) {
                results.max = parsedTime;
            }
            N += 1;
            sum += parsedTime;
            sumsq += parsedTime * parsedTime;
        }
        results.output += line;
    });

    ls.on('close', function (code) {
        if (!isWin) {
            results.alive = code === 0;
        }
        var avg = sum / N;
        results.stddev = Math.sqrt((sumsq / N) - (avg * avg));
        results.avg = avg;
        deferred.resolve(results);
    })

    return deferred.promise;
}

exports.probe = probe;
