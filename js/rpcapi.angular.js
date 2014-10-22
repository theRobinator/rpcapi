angular.module('rpcapi', [])

    .provider('rpcApi', function() {
        /** @type {!Object.<Function>} */
        var apiFunctions_ = {};

        /** @type {string} */
        var apiUrl;

        var $q_, $http_;

        this['$get'] = ['$http', '$q', function($http, $q) {
            // Async functions need access to $http and $q
            $q_ = $q;
            $http_ = $http;
            return apiFunctions_;
        }];

        /**
         * Set the URL of the API.
         * @param {string} url
         */
        this.setApiUrl = function(url) {
            apiUrl = url;
        };

        /**
         * Declare a function name that can be used remotely.
         * @param {string} name The name of the function.
         * @param {boolean=} opt_blocking If true, the function will block until the network request
         *                                completes and return the results synchronously (not recommended).
         */
        this.declareFunction = function(name, opt_blocking) {
            if (opt_blocking) {
                apiFunctions_[name] = createBlockingFunction_(name);
            } else {
                apiFunctions_[name] = createAsyncFunction_(name);
            }
        };

        /**
         * Create a blocking function that will be used in the API.
         * @param {string} name The name of the function.
         */
        var createBlockingFunction_ = function(name) {
            return function(args) {
                // $http does not support blocking requests, so we use the default XHR implementation
                var xhr = new XMLHttpRequest();
                xhr.open('POST', apiUrl + '?rpc=' + name, false);
                xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xhr.send(buildParams_(arguments));

                var responseText = xhr.responseText;
                if (responseText == null) {
                    throw new Error('Failed to call ' + name);
                } else {
                    var responseJSON = JSON.parse(responseText)['response'];
                    if (responseJSON['type'] == 'error') {
                        throw new RPCError(responseJSON['reason']);
                    } else {
                        return responseJSON['result'];
                    }
                }
            };
        };

        /**
         * Create an asynchronous function that will be used in the API.
         * @param {string} name The name of the function.
         */
        var createAsyncFunction_ = function(name) {
            return function(args) {
                var xhr = new XMLHttpRequest();

                var deferred = $q_.defer();

                $http_({
                    'url': apiUrl + '?rpc=' + name,
                    'method': 'POST',
                    'data': buildParams_(arguments),
                    'headers': {'Content-Type': 'application/x-www-form-urlencoded'}

                }).success(function(responseJSON) {
                    responseJSON = responseJSON['response'];
                    if (responseJSON['type'] == 'error') {
                        deferred.reject(responseJSON['reason']);
                    } else {
                        deferred.resolve(responseJSON['result']);
                    }

                }).error(function(error) {
                    if (error) {
                        deferred.reject(error);
                    } else {
                        deferred.reject('Failed to call ' + name)
                    }
                })

                return deferred.promise;
            };
        };

        /**
         * Build the parameter string that will be sent in POST data.
         * @param {!Array.<string>} args
         */
        var buildParams_ = function(args) {
            var postData = [];
            for (var i = 0; i < args.length; ++i) {
                postData.push('arg' + i + '=' + encodeURIComponent(JSON.stringify(args[i])));
            }
            return postData.join("&");
        };
    });

/**
 * A wrapper for Errors that are thrown if an error happens during a synchronous call.
 * @constructor
 * @param {string} message
 */
var RPCError = function(message) {
    Error.call(this, message);
    this.message = message;
};
if (typeof Object.create == 'function') {
    RPCError.prototype = Object.create(Error.prototype);
} else {
    (function(){
        function polyfill() {}
        polyfill.prototype = Error.prototype;
        RPCError.prototype = new polyfill();
    })();
}
