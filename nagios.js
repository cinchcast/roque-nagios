"use strict";

var nagios = {};

nagios.reportAndExit = function(values, uom, propertyName, criticalRange, warningRange, verboseOutput) {
	var exitCode = 0;
	if (typeof values !== 'object'){
		values = {
			_: values
		};
	}

	var isCritical = nagios.rangeToFunction(criticalRange);
	var isWarning = nagios.rangeToFunction(warningRange);
	var message = propertyName + ' is fine';
	var perfData = [];
	for (var name in values) {
		if (values.hasOwnProperty(name)) {
			var value = values[name];
			if (exitCode < 2 && isCritical && isCritical(value)){
				exitCode = 2;
				message = name + ' '+propertyName + ' is ' + value + uom;
			} else if (exitCode < 1 && isWarning && isWarning(value)) {
				exitCode = 1;
				message = name + ' '+propertyName + ' is ' + value + uom;
			}
			var queuePerfInfo = '\'' + (name === '_' ? '' : name + '_') + propertyName + '\'' + '=' + value + uom +
				';' + (warningRange?warningRange : '') +
				';' + (criticalRange?criticalRange : '');
			perfData.push(queuePerfInfo);
		}
	}

	var output = [];
	switch(exitCode) {
		case 0:
			output.push('OK - ');
			break;
		case 1:
			output.push('WARNING - ');
			break;
		case 2:
			output.push('CRITICAL - ');
			break;
		default:
			output.push('UNKNOWN - ');
			break;
	}
	output.push(message);
	output.push(' | ', perfData.join(' '));

	console.log(output.join(''));

	if (verboseOutput){
		console.log(verboseOutput);
	}
	
	process.exit(exitCode);
};

nagios.rangeToFunction = function(range) {
	if (range === null || typeof range == 'undefined') {
		return null;
	}
	if (typeof range == 'number'){
		return function(value){
			return value > range || value < 0;
		};
	}
	var match = /^(\@)?((-?[0-9]*|~)\:)?(-?[0-9]*|~)$/.exec(range);
	if (match === null){
		throw new Error('invalid range format: '+range);
	}
	var neg = match[1] === '@';
	var left = match[3];
	if (typeof match[2]=='undefined'){
		left = '0';
	}
	var right = match[4];
	if (left === '~'){
		left = -Infinity;
	} else if (left === ''){
		left = Infinity;
	} else {
		left = parseInt(left);
	}
	if (right === '~'){
		right = -Infinity;
	} else if (right === ''){
		right = Infinity;
	}else {
		right = parseInt(right);
	}
	return function(value) {
		var inRange = value >= left && value <= right;
		return neg ? inRange : !inRange;
	};
};

module.exports = nagios;