#!/usr/bin/env node
"use strict";

var argv = require('optimist').argv,
    nagios = require('./nagios'),
    redis = require("redis");

if (argv.V || argv.version) {
    console.log(JSON.parse(require('fs').readFileSync('package.json')).version);
    process.exit();
}

if (argv.h || argv.help) {
    console.log(JSON.parse(require('fs').readFileSync('package.json')).version);
    console.log('');
    console.log('USAGE:');
    console.log('  node roque-nagios.js [options]');
    console.log('      --queues QUEUE1,QUEUE2,QUEUE3 (OPTIONAL, roque queue names,\n            if omitted is obtained from redis set "roque:nagios:queues")');
    console.log('      --hostname -H REDIS_HOSTNAME (OPTIONAL, default is localhost)');
    console.log('      --port -p redis REDIS_PORT (OPTIONAL, default is localhost)');
    console.log('      --check=len|lastcompleteage|nextjobage (OPTIONAL, default is len)');
    console.log('      --critical -c NAGIOS_RANGE (OPTIONAL)');
    console.log('      --warning -w NAGIOS_RANGE (OPTIONAL)');
    process.exit();
}

var client = redis.createClient(argv.port || argv.p || null, argv.hostname || argv.H || 'localhost');

client.on("error", function (err) {
    console.log("Error: ", err);
    process.exit(3);
});

var queues = [];
var values = {};

var logOutput = [];
var log = function(){
    var args = Array.prototype.slice.apply(arguments);
    logOutput.push(args.join(' '));
};

var regexRFC3999 = new RegExp( '^([0-9]{4})-([0-9]{2})-([0-9]{2})[TtZz ]{1}([0-9]{2}):([0-9]{2}):([0-9]{2})[0-9.]*([+-0-9]{3}|[Zz]{1})?(.)*$');
var parseRFC3999 = function(timestamp) {
    var match = regexRFC3999.exec(timestamp);
    if (match !== null && match.length > 0) {
        if (typeof match[7] == 'undefined'){
            // no timezone, assume GMT
            match[7] = 0;
        }
        if (match[7] == 'Z' || match[7] == 'z' ) match[7] = 0;
        return new Date(Date.UTC(parseInt(match[1], 10), parseInt(match[2], 10) -1, parseInt(match[3], 10), (parseInt(match[4], 10) + parseInt(match[7], 10)), parseInt(match[5], 10), parseInt(match[6], 10)));
    }
};

var secondsAgo = function(date){
    return Math.round((new Date().getTime() - date.getTime())/1000);
};

var secondsToString = function(seconds) {
    return [Math.floor(seconds / 60), "'", Math.floor(seconds % 60), "''"].join('');
};

var checkQueue = function(name, callback) {
    log('\nInfo for queue: '+ name);
    var info = {};
    var key = 'roque:'+name;
    client.llen(key, function(err, reply){
        if (err){
            callback(err);
        }
        info.len = +reply;
        client.lindex(key, -1, function(err, reply){
            if (err){
                callback(err);
            }
            if (reply !== null) {
                info.nextJob = JSON.parse(reply.toString());
            }
            client.hgetall(key+':state', function(err, reply){
                if (err){
                    callback(err);
                }
                info.state = reply;

                // check queue
                var critical = false;
                log('queue length is', info.len);
                
                if (argv.check!='nextjobage' && argv.check!='lastcompleteage') {
                    values[name] = info.len;
                }
                if (argv.check=='nextjobage' && info.nextJob){
                    info.nextJob.c = parseRFC3999(info.nextJob.c);
                    log('queue next job created: ', info.nextJob.c);
                    var nextjobage = secondsAgo(info.nextJob.c);
                    values[name] = nextjobage;
                    log('    '+ secondsToString(nextjobage) + ' ago');
                }
                if (argv.check=='lastcompleteage' && info.state) {
                    info.state.lastcomplete = parseRFC3999(info.state.lastcomplete);
                    log('queue last job completed: ', info.state.lastcomplete);
                    var lastcompleteage = secondsAgo(info.state.lastcomplete);
                    values[name] = Math.max(values[name] || 0, lastcompleteage);
                    log('    '+ secondsToString(lastcompleteage) + ' ago');
                }
                callback();
            });
        });
    });
};

var checkNextQueue = function(callback){
    if (queues.length < 1) {
        client.quit();
        if (callback){
            callback();
        }
        return;
    }
    var queue = queues.shift();
    if (queue){
        checkQueue(queue, function(err, critical){
            if (err){
                callback(err);
            }
            checkNextQueue(callback);
        });
    }else{
        checkNextQueue(callback);
    }
};

var outputResults = function(err) {
    log('');
    nagios.reportAndExit(values,
        (argv.check=='lastcompleteage' || argv.check=='nextjobage') ? 's' : '',
        argv.check || 'length',
        argv.critical || argv.c,
        argv.warning || argv.w,
        argv.verbose || argv.v ? logOutput.join('\n') : '');
};

if (argv.queues) {
    queues = argv.queues.split(',');
    checkNextQueue(outputResults);
} else {
    client.smembers('roque:nagios:queues', function(err, replies){
        replies.forEach(function(reply, i){
            queues.push(reply);
        });
        checkNextQueue(outputResults);
    });
}
