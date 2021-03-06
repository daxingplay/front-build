var fs = require('fs');
var path = require('path');
var async = require('async');
var App = require('../lib/app');
var Page = require('../lib/page');
var util = require('util');
var os = require('os');
var errorHelper = require('./error-helper');

module.exports = {
    init: function(bin, callback) {
        var target;

        if (bin.argv._.length >= 2) {
            target = path.resolve(bin.argv._[1]);
        } else {
            target = bin.cwd;
        }
        
        App.init(target, function (err, logs) {

            if (err) {
                return callback(err);
            }

            callback(null, 'success!');
        });
    },

    web: function (bin, callback) {
        var querystring = require('querystring');
        var http = require('http');
        var cp = require('child_process');

        var domain = 'http://127.0.0.1:8765';
        var url;
        //检查是否在应用目录下
        App.getApp(bin.cwd, function(err, app) {
            if (err) {
                return callback(err);
            }
            //如果是，打开应用的地址，否则打开入口页
            if (app) {
                url = domain + '/app?' + querystring.stringify({
                    root: app.rootDir
                });
            } else {
                url = domain;
            }

            //检查服务器是否开启
            http.get(domain + '/pid', function (res) {
                startWeb(url);
            }).on('error', function (e) {
                console.log('starting server...');

                var child = cp.fork(path.resolve(__dirname, '../server/app.js'), [], {
                    env : {
                        'NODE_ENV': 'production' 
                        // 'NODE_ENV': 'development'
                    }
                });

                setTimeout(function () {
                    startWeb(url);
                }, 300);
            });
        });

        function startWeb (url) {
            switch (os.platform()) {
                case 'win32':
                    console.log('opening...');
                    cp.exec('start ' + url);
                    break;
                case 'darwin':
                    console.log('opening...');
                    cp.exec('open ' + url);
                    break;
                default:
                    console.log('please open %s in your browser', url);
            }
        }

    },

    update: function(bin, callback) {
        var argv = bin.argv;
        App.getApp(bin.cwd, function(err, app) {
            if (err) {
                return callback(err);
            }

            var updateError = new Error();
            updateError.name = 'E_UPDATE';

            if (!app) {
                updateError.message = '不在FB项目，请先初始化！'
                return callback(updateError);
            }

            if (app.config.fbversion || app.config.version) {
                console.log('FB app fbversion was %s',
                    app.config.fbversion || app.config.version);
            }

            if (app.rootDir != bin.cwd) {
                console.error('请在FB项目根目录执行此命令');
                updateError.message = 'not fb root';
                return callback(updateError);
            }

            app.update(function (err) {

                if (err) {
                    return callback(err);
                }
                console.log('Update success! Current fbversion is %s',
                    app.config.fbversion);
                callback(null, 'success');
            });


        });
    },

    /**
     * fb build pagenname/pageversion -t 20120555
     */

    build: function(bin, callback) {
        var argv = bin.argv;
        var jobs = [];

        var date = new Date();
        var buildError = new Error();
        var timestamp = argv.timestamp;
        buildError.name = 'E_BUILD';

        App.getApp(bin.cwd, function (err, app) {
            if (err) {
                return callback(err);
            }

            if (!app) {
                buildError.message = 'build fail, not a fb app';
                return callback(buildError);
            }

            var targets = argv._.slice(1);

            if (targets.length === 0) {
                //ki build -t xxxxxxxx
                var appcurrent = app.getCurrent();
                if (appcurrent.pageName && appcurrent.version) {
                    targets.push(appcurrent.pageName + '/' + appcurrent.version);
                } else {
                    buildError.message = 'no target!';
                    return callback(buildError);
                }
            }

            var pages = targets.filter(function (item) {
                return item != 'common';
            });

            async.series([
                //ki build common
                function (callback) {
                    if (targets.indexOf('common') > -1) {
                        app.buildCommon(callback);
                    } else {
                        callback(null);
                    }
                },
                //ki build page1/1.0 page2/1.0 -t xxxxxxxx
                function (callback) {
                    if (pages.length) {
                        if (argv.watch) {

                            app.buildPages(pages, timestamp, function (err) {
                                if (err) {
                                    return errorHelper(err);
                                }
                            });

                            async.map(pages, function (target, callback) {
                                var parsed = Page.parsePageVersion(target);

                                var page = app.getPage(parsed.name);

                                page.setVersion(parsed.version, function (err) {
                                    if (err) {
                                        return callback(err);
                                    }
                                    callback(null, page);
                                });
                            }, function (err, pages) {
                                if (err) {
                                    return callback(err);
                                }
                                pages.forEach(function (page) {

                                    page.build(timestamp, function(err, reports) {
                                        console.log('- - - - - building %s/%s to %s', page.name, page.version, timestamp);
                                        if (err) {
                                            return errorHelper.printError(err);
                                        }
                                        console.log('- - - - - success');
                                    });

                                    page.startWatch();

                                    page.on('fileupdate', function () {
                                        page.build(timestamp, function (err, reports) {
                                            console.log('- - - - - rebuilding %s/%s to %s', page.name, page.version, timestamp);
                                            if (err) {
                                                return errorHelper.printError(err);
                                            }
                                            console.log('- - - - - watching');
                                        });
                                    });
                                });
                            });
                        } else {
                            app.buildPages(pages, timestamp, callback);
                        }
                    } else {
                        callback(null);
                    }
                }],
                function (err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, 'success');
                }
            );
        });
    },
    /**
     * Add page to current app
     * command:fb add page1/1.0
     * @param  {Object}   bin      command object
     * @param  {Function} callback callback with an error or null
     */
    addpage: function(bin, callback) {
        var cwd = bin.cwd;
        var argv = bin.argv;

        App.getApp(cwd, function (err, app) {
            if (err) {
                return callback(err);
            }
            if (!app) {
                console.error('不在FB项目，请先初始化！');
                return callback(new Error('not a fb app'));
            }

            app.addPage(argv._[1], function (err, logs) {

                if (err) {
                    return callback(err);
                }
                callback(null, 'success!');

            });

        });
    },

    'help': require('./command-help'),

    group: function(bin, callback) {
        var argv = bin.argv;
        var cwd = bin.cwd;

        App.getApp(cwd, function (err, app) {
            if (err) {
                return callback(err);
            }

            if (!app) {
                return callback(new Error('not in a fb project!'));
            }

            var command = argv._[1] || 'list';

            var config = app.config;

            var error = null;
            var groupName;
            var pages;

            switch (command) {
                case 'ls':
                case 'list':
                    //print all groups
                    app.getGroups(function (err, groups) {
                        if (err) {
                            return callback(err);
                        }

                        if(!groups) {
                            return callback(null);
                        }

                        for (k in groups) {
                            console.log('%s: %s',
                                k, 
                                config.groups[k].join(' '));
                        }

                        callback(null);

                    });
                    break;

                case 'add':
                    //check page
                    groupName = argv._[2];

                    if (argv._.length < 4) {
                        return callback(new Error('set group with no page'));
                    }

                    pages = argv._.slice(3);


                    app.getGroup(groupName, function (err, prev_pages) {
                        if (err) {
                            return app.setGroup(groupName, pages, callback);
                        }

                        if (prev_pages) {
                            pages = prev_pages.concat(pages);
                        }

                        var groups = config.groups[groupName].concat(pages);
                        app.setGroup(groupName, groups, function (err) {
                            if (err) {
                                return callback(err);
                            }

                            console.log('%s: %s',
                                groupName,
                                config.groups[groupName].join(' '));
                            callback(null);
                        });
                    });

                    break;

                case 'set':
                    groupName = argv._[2];

                    if (argv._.length < 4) {
                        return callback(new Error('no page'));
                    }

                    pages = argv._.slice(3);

                    app.setGroup(groupName, pages, function () {
                        console.log('%s: %s',
                            groupName,
                            config.groups[groupName].join(', '));
                        app.saveConfig(function (err) {
                            if (err) {
                                return callback(err);
                            }
                            callback(null, 'success!');
                        });
                    });
                    break;
                case 'get':
                case 'show':
                    groupName = argv._[2];

                    app.getGroup(groupName, function (err, pages) {
                        if (err) {
                            return callback(err);
                        }

                        if (!pages || pages.length === 0) {
                            return callback(new Error('no group'));
                        }

                        console.log(page.join(' '));

                        callback(null);
                    });
                    break;

                case 'rm':
                case 'del':
                case 'remove':
                case 'delete':
                    groupName = argv._[2];
                    app.rmGroup(groupName, function (err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, 'success!');
                    });
                    break;
                case 'build':

                    app.buildGroup(argv._[2], argv.timestamp, function (err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, 'success!');
                    });
                    break;

            }

        });
    }
};