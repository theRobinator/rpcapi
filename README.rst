######
RPCAPI
######

RPCAPI is a library that allows JavaScript developers to call server-side functions as if they were defined in JavaScript.

On the server, in PHP::

    function addNumbers($number1, $number2) {
        return $number1 + $number2;
    }

    $api = new RPCAPI();
    $api->addFunction('addNumbers');
    $api->$respondToRequest();

On the client, in JavaScript::

    var config = new RpcApiConfig('/my/api/url');
    config.declareFunction('addNumbers', true);
    var api = config.getApi();

    var result = api.addNumbers(1, 2);  // 3!

But waiting for every call to complete is slow and makes your site look bad, so you can also call these functions asynchronously::

    var config = new RpcApiConfig('/my/api/url');
    config.declareFunction('addNumbers');
    var api = config.getApi();

    var promise = api.addNumbers(1, 2);
    promise.setCallback(function(result) {
        console.log(result);  // 3!
    });

Limitations
===========

- Because different languages have different ideas of classes and methods, only JSON-encodable values can be passed as arguments and results.
  This means no passing of functions or class instances. You can still pass complex JSON objects, however.
- The default promise returned in the pure JS version does not support callback chaining. Use a library version for that.

Language / Library Examples
===========================

PHP
---

::

    $api = new RPCAPI();

    function addNumbers($number1, $number2) {
        return $number1 + $number2;
    }
    $api->addFunction('addNumbers');

    $api->addFunction('subtractNumbers', function($number1, $number2) {
        return $number1 - $number2;
    });

    $api->$respondToRequest();

JavaScript (Pure)
-----------------

::

    var config = new RpcApiConfig('/my/api/url');  // all functions declared in this file
    config.declareFunction('addNumbers', true);  // true for blocking, false for async
    config.declareFunction('subtractNumbers');
    var api = config.getApi();

    var result = api.addNumbers(1, 2);
    api.subtractNumbers(3, 1).setCallback(function(result) {
        console.log(result);
    });

JavaScript (AngularJS)
----------------------

::

    angular.module('myModule', ['rpcapi'])
        .config(function(rpcApiProvider) {
            rpcApiProvider.setApiUrl('/my/api/url');
            rpcApiProvider.declareFunction('addNumbers', true);  // blocking
            rpcApiProvider.declareFunction('subtractNumbers');  // async
        })

        .controller('testCtrl', function($scope, rpcApi) {
            $scope['firstNumber'] = rpcApi.addNumbers(1, 2);
            // Async requests use promises in Angular
            rpcApi.subtractNumbers(3, 1).then(function(result) {
                $scope['secondNumber'] = result;
            });
        })
