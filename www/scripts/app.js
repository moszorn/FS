'use strict';

angular.module('fsApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ngAnimate',
  'angular-gestures',
  'fx.animations',
  'angularMoment',
  'ppSync',
  'wu.masonry'
])
  .config(function($routeProvider) {
    /* global routingConfig */
    var access = routingConfig.accessLevels;
    $routeProvider
      .when('/login', {
        controller: 'LoginController',
        templateUrl: 'views/login.html',
        access: access.anon
      })
      .when('/logout', {
        controller: 'LogoutController',
        template: 'Logout...',
        access: access.user
      })
      .when('/post/:id', {
        controller: 'SinglePostController',
        templateUrl: 'views/singlePost.html',
        access: access.user
      })
      .when('/hashtag', {
        templateUrl: 'views/hashtag.html',
        access: access.user
      })
      .when('/hashtag/:hashtag', {
        controller: 'HashtagController',
        templateUrl: 'views/hashtag.html',
        access: access.user
      })
      .when('/report', {
        controller: 'ReportController',
        templateUrl: 'views/report.html',
        access: access.admin

      })
      .when('/timeline', {
        controller: 'TimelineController',
        templateUrl: 'views/timeline.html',
        access: access.user
      })
      .when('/map', {
        controller: 'MapController',
        templateUrl: 'views/map.html',
        access: access.user
      })
      .when('/map/:long/:lat/:zoom', { // this route wont work if called twice without reloading the app
        controller: 'MapController',
        templateUrl: 'views/map.html',
        access: access.user
      })
      .when('/user/:id', {
        controller: 'UserController',
        templateUrl: 'views/user.html',
        access: access.user
      })
      .when('/load', {
        controller: 'LoadController',
        templateUrl: 'views/load.html',
        access: access.anon
      })
      .when('/codecatch', {
        templateUrl: 'views/codecatch.html',
        controller: 'CodecatchCtrl',
        access: access.user
      })
      .when('/wall', {
        templateUrl: 'views/wall.html',
        controller: 'WallController',
        access: access.public
      })
      .when('/', {
        controller: 'StreamController',
        templateUrl: 'views/stream.html',
        access: access.user
      })
      .otherwise({
        redirectTo: '/',
        access: access.public
      });



  })
  .run(function($rootScope, $http, fsUser, fsGeolocation, fsConfig, global_functions, $location, fsID) {
    /* global $ */
    $rootScope.phonegap = false;
    if (window.location.protocol === 'file:') {
      $rootScope.phonegap = true;
    }


    $(document).ready(function() {
      if (!global_functions.isPhoneGap()) {
        fsGeolocation.startGeoWatch();
      } else {
        onDeviceReady();
      }
    });

    function onDeviceReady() {
      document.addEventListener('deviceready', function() {
        fsGeolocation.startGeoWatch();
        if (global_functions.isIOS()) {
          $('body').addClass('phonegap-ios-7');
        }
      }, false);
    }

    $rootScope.$on('$routeChangeStart', function(event, next, current) {
      /*jshint unused:false */
      if (!fsUser.authorize(next.access)) {
        if (fsUser.isLoggedIn()) {
          $location.path('/');
        } else {
          $location.path('/login');
        }
      }
    });

    fsID.init();
    
    if (!fsConfig.existingConfig()) {
      fsConfig.loadConfigFromExternal().then(function(response) {
        fsConfig.init(response.data);
      });
    } else {
      fsConfig.init(null).then(function() {});
    }

    
  });
(function(exports) {

  var config = {

    roles: [
      'public',
      'user',
      'admin'
    ],


    accessLevels: {
      'public': '*',
      'anon': ['public'],
      'user': ['user', 'admin'],
      'admin': ['admin']
    }

  };


  function buildRoles(roles) {

    var bitMask = '01';
    var userRoles = {};

    for (var role in roles) {
      var intCode = parseInt(bitMask, 2);
      userRoles[roles[role]] = {
        bitMask: intCode,
        title: roles[role]
      };
      bitMask = (intCode << 1).toString(2);
    }

    return userRoles;
  }

  function buildAccessLevels(accessLevelDeclarations, userRoles) {

    var accessLevels = {};
    for (var level in accessLevelDeclarations) {

      if (typeof accessLevelDeclarations[level] === 'string') {
        if (accessLevelDeclarations[level] === '*') {

          var resultBitMask = '';

          for (var role in userRoles) {
            resultBitMask += '1';
          }
          //accessLevels[level] = parseInt(resultBitMask, 2);
          accessLevels[level] = {
            bitMask: parseInt(resultBitMask, 2)
          };
        } else {
          console.log('Access Control Error: Could not parse ' + accessLevelDeclarations[level] + ' as access definition for level ' + level + '');
        }

      } else {

        var resultBitMask = 0;
        for (var role in accessLevelDeclarations[level]) {
          if (userRoles.hasOwnProperty(accessLevelDeclarations[level][role]))
            resultBitMask = resultBitMask | userRoles[accessLevelDeclarations[level][role]].bitMask;
          else {
            console.log('Access Control Error: Could not find role ' + accessLevelDeclarations[level][role] + ' in registered roles while building access for ' + level + '');
          }
        }
        accessLevels[level] = {
          bitMask: resultBitMask
        };
      }
    }

    return accessLevels;
  }
  exports.userRoles = buildRoles(config.roles);
  exports.accessLevels = buildAccessLevels(config.accessLevels, exports.userRoles);

})(typeof exports === 'undefined' ? this['routingConfig'] = {} : exports);