/**
 * @tconstructor
 * @param {string} apiUrl
 */
var RpcApiConfig = function(apiUrl) {
    /** @type {!Object.<Function>} */
    var apiFunctions_ = {};

    /**
     * Get the object containing all the API functions.
     * @return {!Object.<Function>}
     */
    this.getApi = function() {
        return apiFunctions_;
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
            var xhr = new XMLHttpRequest();
            xhr.open('POST', apiUrl + '?rpc=' + name, false);
            sendCall_(xhr, name, arguments);

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

            /**
             * 10-second implementation of deferred.
             */
            var deferred = {
                setCallback: function(callback) {
                    this.callback = callback;
                },
                setErrback: function(errback) {
                    this.errback = errback;
                },
                resolve: function(result) {
                    if (this.callback) { this.callback(result); }
                },
                reject: function(result) {
                    if (this.errback) { this.errback(result); }
                },
                callback: null,
                errback: null
            };

            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var responseText = xhr.responseText;
                    if (responseText == null) {
                        deferred.reject('Failed to call ' + name);
                    } else {
                        var responseJSON = JSON.parse(responseText)['response'];
                        if (responseJSON['type'] == 'error') {
                            deferred.reject(responseJSON['reason']);
                        } else {
                            deferred.resolve(responseJSON['result']);
                        }
                    }
                } else if (xhr.readyState == 4) {
                    // The status was not 200
                    deferred.reject('Failed to call ' + name);
                }
            }

            xhr.open('POST', apiUrl + '?rpc=' + name, true);
            sendCall_(xhr, name, arguments);

            return deferred;
        };
    };

    /**
     * Utility function to send an XHR call with the correct parameters.
     * @param {XMLHttpRequest} xhr
     * @param {string} name
     * @param {!Array.<string>} args
     */
    var sendCall_ = function(xhr, name, args) {
        var postData = [];
        for (var i = 0; i < args.length; ++i) {
            postData.push('arg' + i + '=' + encodeURIComponent(JSON.stringify(args[i])));
        }
        postData = postData.join("&");
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.send(postData);
    };
};

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
