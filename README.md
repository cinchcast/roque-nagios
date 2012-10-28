# Roque-Nagios

Nagios plugin to monitor [Roque Queues](https://github.com/cinchcast/Roque).

This plugin allows you to setup nagios monitoring on:

- Queue sizes (detect if workers are down, or they are not working fast enough)
- Queue last completed job age (detect if no jobs are being enqueued, or workers are down)
- Queue next job age (detect if jobs are taking too long to be processed)

## Requirements

- Node.js >= 0.8.6
- Nagios

## Installing

To download the latest version:

    npm install roque-nagios

## Usage

Edit your commands.cfg and add the following:

	define command {
	    command_name    check_roque
	    command_line    $USER1$/roque-nagios/roque-nagios.js -hostname $HOSTADDRESS$ --check $ARG1$ --queues $ARG2 --warning $ARG3$ --critical $ARG4$ 
	}

Now you can add monitor queues by adding:

	define service {
	    use                 generic-service
	    hostgroup_name          Roque Queues
	    service_description     Roque Queues Check
	    check_command           check_roque!len!myqueuename!20!30
	}

	define service {
	    use                 generic-service
	    hostgroup_name          Roque Queues
	    service_description     Roque Queues Check
	    check_command           check_roque!lastcompleteage!myqueuename!1800!3600
	}

	define service {
	    use                 generic-service
	    hostgroup_name          Roque Queues
	    service_description     Roque Queues Check
	    check_command           check_roque!nextjobage!myqueuename,anotherqueue!30!180
	}

This plugin will output performance data for the property being checked.

## License

(The MIT License)

Copyright (c) 2012 Cinchcast <contact@cinchcast.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

