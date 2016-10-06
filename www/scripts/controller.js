'use strict';

angular.module('fsApp')

.controller('LoginController', function($scope, $location, $routeParams, fsUser, fsConfig) {
  /* global hello, hello_phonegap (需求不明,待確認), Fingerprint */
  $scope.LoginData = fsConfig.getLoginData();

  var isCordovaApp = $scope.isCordovaApp = !!window.cordova;

 //Anonymous Browser Fingerprinting : https://github.com/Valve/fingerprintjs
  $scope.fingerprintjsLogin = function() {
    var newUser = {
      id: new Fingerprint().get(),
      name: $scope.simple.name,
      provider: 'fingerprintjs'
    };
    console.log(newUser);
    fsUser.logout();
    if (fsUser.login(newUser)) {
      $location.path('');
    }
  };


  $scope.simpleLogin = function() {
    var newUser = {
      id: $scope.simple.id.toString(),
      name: $scope.simple.name,
      provider: 'simple'
    };
    fsUser.logout();
    if (fsUser.login(newUser)) {
      $location.path('');
    }
  };


  if ($routeParams.task === 'logout') {
    hello().logout();
    fsUser.logout();
  }

  var redirect_uri = (isCordovaApp) ? 'http://TODO/fs/redirect.html' : 'index.html';
    //三方設定,請勿變動
  var fiware = '320';
  var facebook = '758204300873538';
  var google = '971631219298-dgql1k3ia1qpkma6lfsrnt2cjevvg9fm.apps.googleusercontent.com';
  var github = 'c6f5cd8c081419b33623';
  var windows = '0000000048117AB3';

  if (isCordovaApp) {
    hello_phonegap.init({
      facebook: facebook,
      fiware: fiware,
      google: google,
      github: github,
      windows: windows
    }, {
      redirect_uri: redirect_uri
    });
    hello_phonegap.on('auth.login', function(auth) {
      // call user information, for the given network
      hello_phonegap(auth.network).api('/me').success(function(r) {

        var userdata = {
          id: auth.network + '_' + r.id,
          name: r.name,
          provider: auth.network
        };
        fsUser.login(userdata);
      });
    });
  } else {
    hello.init({
      facebook: facebook,
      fiware: fiware,
      google: google,
      github: github,
      windows: windows
    }, {
      redirect_uri: redirect_uri
    });
    hello.on('auth.login', function(auth) {

      hello(auth.network).api('/me').success(function(r) {

        var userdata = {
          id: auth.network + '_' + r.id,
          name: r.name,
          provider: auth.network
        };
        fsUser.login(userdata);
      });
    });
  }



});
'use strict';

angular.module('fsApp')
	.controller('LogoutController', function($scope, $location, fsUser) {
		/* global hello */
		hello().logout();
		fsUser.logout();
		$location.path('login');
	});
'use strict';
angular.module('fsApp')
  .controller('StreamController', function($scope, ppSyncService, fsPostHelper, fsUser, $routeParams) {      
    $scope.posts = [];
    $scope.comments = [];
    $scope.likes = [];
    $scope.channels = ppSyncService.getChannels();
        
    $scope.loadingStream = true;

    $scope.toggleTimeVar = false;
    $scope.toggleTime = function() {
      $scope.toggleTimeVar = $scope.toggleTimeVar === false ? true : false;
    };
    $scope.getCurrentChannel = function () {
        return ppSyncService.getActiveChannel();
    };

    var fetchingChanges = function () {
        ppSyncService.fetchChanges().then(function() {
    }, function(error) {
      console.log(error);
    }, function(change) {
      if (change.deleted) {
        fsPostHelper.deletePost($scope.posts, change);
        fsPostHelper.deleteLike($scope.likes, change);
      } else {
        // 事件指定陣列事件
        switch (change.doc.type) {
          case 'POST':
            ppSyncService.getInfo().then(function(response) {
              console.log(response);
            });
            $scope.posts.push(change);
            break;
          case 'LIKE':
            fsPostHelper.loadLike($scope.likes, change);
            break;
          case 'COMMENT':
            fsPostHelper.loadComment($scope.comments, change);
            break;
          case 'IMAGE':
            if (!angular.isUndefined(change.doc._attachments)) {
              $scope.posts.push(change);
            }
            break;
        }
      }
    });
    };
    

    var loadMeta = function(response) {
      for (var i = response.length - 1; i >= 0; i--) {
        switch (response[i].doc.type) {
          case 'LIKE':
            fsPostHelper.loadLike($scope.likes, response[i]);
            break;
          case 'COMMENT':
            fsPostHelper.loadComment($scope.comments, response[i]);
            break;
        }
      }
    };

    // 預設抓10筆
    var loadDocuments = function(startkey) {
      if (angular.isUndefined(startkey)) {
        startkey = [9999999999999, {}, {}];
      } else {
        startkey = [startkey, {}, {}];
      }


      var limit = 10;

      ppSyncService.getPosts(limit, startkey).then(function(response) {

        for (var i = response.length - 1; i >= 0; i--) {

          $scope.posts.push(response[i]);

          ppSyncService.getRelatedDocuments(response[i].id).then(loadMeta);
        }
        $scope.loadingStream = false;
      });
    };
    

    loadDocuments();
    fetchingChanges();

    $scope.switchChannel = function (channel) {
        if (ppSyncService.setChannel(channel)) {
            $scope.posts = [];
            $scope.comments = [];
            $scope.likes = [];
            loadDocuments();
            fetchingChanges();
        }
    };


    $scope.loadMore = function() {
      $scope.loadingStream = true;
      var oldestTimestamp = 9999999999999;
      for (var i = 0; i < $scope.posts.length; i++) {

        if (oldestTimestamp > $scope.posts[i].value) {
          oldestTimestamp = $scope.posts[i].value;
        }
      }
      loadDocuments(oldestTimestamp - 1);
    };

    $scope.isPostedByUser = function(user) {
      return user.id === fsUser.user.id ? true : false;
    };


    $scope.deletePost = function(postId) {
      fsPostHelper.findPostInArray($scope.posts, postId).then(function(response) {
        var currentObject = $scope.posts[response];

        $scope.posts.splice(response, 1);
        ppSyncService.deleteDocument(currentObject.doc, true);
        return true;
      });
    };

    $scope.top = function(likes) {
      console.log(likes);
      if (likes >= 2) {
        return 'big';
      } else if (likes >= 1) {
        return 'medium';
      }
    };

    $scope.$on('$destroy', function() {
      ppSyncService.cancel();
    });
  });
'use strict';

angular.module('fsApp')
  .controller('PostActionsController', function($scope) {

    $scope.current_action = 'post_image';


    $scope.toggleAction = function(target) {
      if ($scope.current_action === target) {
        $scope.current_action = false;
      } else {
        $scope.current_action = target;
      }
    };


    $scope.activeClass = function(target) {
      return target === $scope.current_action ? 'active' : undefined;
    };

  });
'use strict';

angular.module('fsApp')
  .controller('PostMetaController', function($scope, ppSyncService, fsPostHelper, fsUser) {

    $scope.newLike = function(postId) {
      $scope.inProgress = true;

      var user = fsUser.user;
      var likeObject = fsPostHelper.createLikeObject(user, postId);

      ppSyncService.postDocument(likeObject).then(function() {
        $scope.inProgress = false;
      });
    };

    $scope.deleteLike = function(postId) {
      $scope.inProgress = true;

      fsPostHelper.deleteLikeLocal($scope.likes, postId, fsUser.user.id)
        .then(function(result) {
          ppSyncService.deleteDocument(result, true).then(function() {
            $scope.inProgress = false;
          });
        });
    };

    $scope.isLiked = function(postId) {
      var userId = fsUser.user.id;
      if (!angular.isUndefined($scope.likes[postId])) {
        for (var i = 0; i < $scope.likes[postId].length; i++) {
          var currentObject = $scope.likes[postId][i];
          if (currentObject.doc.user.id === userId) {
            return true;
          }
        }
      }

      return false;
    };

    $scope.isCommented = function(postId) {
      var userId = fsUser.user.id;

      if (!angular.isUndefined($scope.comments[postId])) {
        for (var i = 0; i < $scope.comments[postId].length; i++) {
          var currentObject = $scope.comments[postId][i];
          if (currentObject.doc.user.id === userId) {
            return true;
          }
        }
      }
    };

    $scope.isTrending = function(likes) {
      if (likes >= 10) {
        return 'big';
      } else if (likes >= 5) {
        return 'medium';
      }
    };
  });
'use strict';

angular.module('fsApp')
  .controller('NewPostController', function($scope, $rootScope, ppSyncService, fsUser, fsPostHelper, global_functions) {
    /* global Camera */
    // Current User
    $scope.user = fsUser.user;

    // Initial Model
    $scope.newPost = {
      content: false
    };

    var toggleAdmin = function(msg) {
      if (msg.match(/iamadmin/i)) {
        fsUser.toggleAdmin(true);
        window.alert('Welcome Admin!');
        return true;
      }
      if (msg.match(/noadmin/i) && fsUser.user.role.title === 'admin') {
        fsUser.toggleAdmin(false);
        return true;
      }
    };

    // Check Support for FILE Api  尚未完成 TODO
      //先用 Canvas 替代先
    var reader = false;
    $scope.support = false;
    if (window.File && window.FileReader && window.FileList && window.Blob) {

      $scope.support = true;
      reader = new FileReader();

      var canvas = document.getElementById('preview-canvas');
      var context = canvas.getContext('2d');

      var image = new Image();

      reader.onload = function(e) {
        image.src = e.currentTarget.result;

        $scope.$apply(function() {
          $scope.preview = e.currentTarget.result;
        });
      };

      image.onload = function() {
        var maxWidth = 800;
        var maxHeight = 600;
        var width = image.width;
        var height = image.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;

        context.drawImage(image, 0, 0, width, height);
        $scope.croppedImage = canvas.toDataURL('image/jpeg', 0.8);
      };

    }
    //html5 capture image
    var captureSuccess = function(result) {
      result = 'data:image/jpeg;base64,' + result;
      image.src = result;

      $scope.$apply(function() {
        $scope.preview = result;
        $scope.showMediaSelect = false;
      });
    };

    var captureError = function(error) {
      console.log('抓取錯誤 ' + error.code);
    };

    $scope.captureImage = function(captureType) {
      var options = {
        quality: 90,
        destinationType: Camera.DestinationType.DATA_URL,
        encodingType: Camera.EncodingType.JPEG,
        saveToPhotoAlbum: true,
        targetWidth: 800,
        targetHeight: 600,
        sourceType: Camera.PictureSourceType.CAMERA
      };

      if (captureType === 1) {
        options.sourceType = Camera.PictureSourceType.PHOTOLIBRARY;
      }

      navigator.camera.getPicture(captureSuccess, captureError, options);
    };

    $scope.showUpload = function() {
      if (global_functions.isPhoneGap()) {
        return false;
      } else {
        return true;
      }
    };


    $scope.processImage = function(image) {
      var file = image.files[0];
      reader.readAsDataURL(file);
    };

    $scope.newPost = function() {
      var msg = $scope.newPost.content;
      if ((typeof msg !== 'undefined' && msg.length > 0 && !toggleAdmin(msg)) || $scope.croppedImage) {
        var postObject;
        if ($scope.croppedImage) {
          postObject = fsPostHelper.createImageObject(
            msg,
            fsUser.user
          );
        } else {
          postObject = fsPostHelper.createPostObject(
            msg,
            fsUser.user
          );
        }

        // Save the object to the database
        ppSyncService.postDocument(postObject).then(function(response) {
          // Is there a image to upload?
          if ($scope.croppedImage && response.ok) {

            // Extract the Base64 encoded String from DataURL
            var regex = /^data:.+\/(.+);base64,(.*)$/;
            var matches = $scope.croppedImage.match(regex);

            // Attach the attachment to the Post
            ppSyncService.putAttachment(response.id, 'image', response.rev, matches[2], 'image/jpeg');
          }

          // Reset the Input Fields
          $scope.croppedImage = false;
          $scope.preview = false;
        });
      }
      $scope.newPost.content = '';
    };
  });
'use strict';

angular.module('fsApp')
  .controller('NewCommentController', function($scope, ppSyncService, fsUser, fsPostHelper) {


    $scope.newComment = function() {

      var commentObject = fsPostHelper.createCommentObject(
        $scope.newComment.content,
        fsUser.user,
        $scope.postId
      );


      ppSyncService.postDocument(commentObject);


      $scope.newComment.content = '';
    };
  });
'use strict';

angular.module('fsApp')
  .controller('AdminDebugController', function($scope, ppSyncService, fsUser, fsGeolocation) {

    $scope.isAdmin = false;

    $scope.resetDatabase = function() {
      ppSyncService.reset();
    };

    $scope.getDatabaseInfo = function() {
      ppSyncService.debug().then(function(response) {
        console.log(response);
      });
    };

    $scope.debugUserData = function() {
      console.log(fsUser.user);
    };

    $scope.debugGeolocation = function() {
      console.log(fsGeolocation.getCurrentCoords());
    };

  });
'use strict';

angular.module('fsApp')
  .controller('SinglePostController', function($scope, $routeParams, ppSyncService, fsPostHelper, fsUser) {

    $scope.posts = [];
    $scope.comments = [];
    $scope.likes = [];

    $scope.loadingComments = true;
    $scope.loadingLikes = true;

    $scope.toggleTimeVar = false;
    $scope.toggleTime = function() {
      $scope.toggleTimeVar = $scope.toggleTimeVar === false ? true : false;
    };

    ppSyncService.fetchChanges().then(function() {
      //console.log(response);
    }, function(error) {
      console.log(error);
    }, function(change) {
      if (change.deleted) {
        fsPostHelper.deleteLike($scope.likes, change);
        fsPostHelper.deleteComment($scope.comments, change);
      } else {
        switch (change.doc.type) {
          case 'LIKE':
            fsPostHelper.loadLike($scope.likes, change);
            break;
          case 'COMMENT':
            fsPostHelper.loadComment($scope.comments, change);
            break;
        }
      }
    });

    $scope.isCommentedByUser = function(user) {
      return user.id === fsUser.user.id ? true : false;
    };

    $scope.deleteComment = function(comment) {
      ppSyncService.deleteDocument(comment.doc, true);
    };

    var loadMeta = function(response) {
      for (var i = response.length - 1; i >= 0; i--) {
        switch (response[i].doc.type) {
          case 'LIKE':
            fsPostHelper.loadLike($scope.likes, response[i]);
            break;
          case 'COMMENT':
            fsPostHelper.loadComment($scope.comments, response[i]);
            break;
        }
      }
      $scope.loadingComments = false;
      $scope.loadingLikes = false;
    };

    ppSyncService.getDocument($routeParams.id).then(function(response) {
      var tempPostObject = {
        'doc': response,
        'id': response._id
      };

      $scope.posts.push(tempPostObject);
      ppSyncService.getRelatedDocuments($routeParams.id).then(loadMeta);
    });



    $scope.$on('$destroy', function() {
      ppSyncService.cancel();
    });
  });
'use strict';

angular.module('fsApp')
  .controller('TimelineController', function($scope, ppSyncService, $routeParams) {
    $scope.channels = ppSyncService.getChannels();
    $scope.getCurrentChannel = function () {
        return ppSyncService.getActiveChannel();
    };
      

    var viewsize = window.innerHeight - 100;
    var timeline = new links.Timeline(document.getElementById('timeline'));
    
    
    timeline.draw([], {
      minHeight: 500,
      height: viewsize + 'px',
      animate: false,
      cluster: true,
      style: 'box',
      box: {
        align: 'left'
      },
      zoomMin: 1 * 60 * 1000,
      zoomMax: 2 * 7 * 24 * 60 * 60 * 1000
    });

    var fetchingChanges = function () {

        ppSyncService.fetchChanges().then(function () {

        }, function (error) {
            console.log(error);
        }, function (change) {
            if (!change.deleted) {
                switch (change.doc.type) {
                    case 'POST':
                        $scope.prepareForTimeline(change.doc);
                        break;
                    case 'IMAGE':
                        if (!angular.isUndefined(change.doc._attachments)) {
                            $scope.prepareForTimeline(change.doc);
                        }
                        break;
                }
            }
        });

    };

    var getPosts = function () {

        ppSyncService.getPosts().then(function (response) {

            for (var i = response.length - 1; i >= 0; i--) {
                switch (response[i].doc.type) {
                    case 'POST':
                    case 'IMAGE':
                        $scope.prepareForTimeline(response[i].doc);
                        break;
                }
            }
            $scope.loadingStream = false;
        });
    };
    
    getPosts();
    fetchingChanges();

    $scope.switchChannel = function (channel) {
        if (ppSyncService.setChannel(channel)) {
            timeline.clearItems();
            timeline.setVisibleChartRangeNow()
            getPosts();
            fetchingChanges();
        }
    };


    $scope.timelineZoomIn = function() {
      timeline.zoom(1);
    };
    $scope.timelineZoomOut = function() {
      timeline.zoom(-1);
    };
    $scope.centerNow = function() {
      timeline.setVisibleChartRangeNow();
    };
    $scope.prepareForTimeline = function(doc) {
      if ((!angular.isUndefined(doc.msg) && doc.msg.trim() !== '') || doc.type === 'IMAGE') {
        doc.content = '<div class="fs-timeline-content">' + doc.msg + '</div>';

        if (doc.type === 'IMAGE') {

          ppSyncService.getAttachment(doc._id, 'image').then(function(response) {
            var reader = new FileReader();

            reader.onload = function(e) {
              doc.content = doc.content + '<img src="' + e.target.result + '">';
              $scope.pushToTimeline(doc);
            };


            if (response) {
              reader.readAsDataURL(response);
            }
          });
        } else {
          $scope.pushToTimeline(doc);
        }
      }
    };

    $scope.pushToTimeline = function(doc) {
      timeline.addItem({
        'start': new Date(doc.created),
        'end': '', // end is optional
        'content': '<span style="color: #0195A6">' + doc.user.name + '</span>' + '<br>' + doc.content,
        'editable': false
      });
    };
    $scope.$on('$destroy', function() {
      ppSyncService.cancel();
    });
  });
'use strict';
angular.module('fsApp')
  .controller('HashtagController', function($scope, $location, $routeParams, ppSyncService, fsPostHelper, fsUser) {
    $scope.posts = [];
    $scope.comments = [];
    $scope.likes = [];

    $scope.hashtag = $scope.model_hashtag = $routeParams.hashtag;

    $scope.toggleTimeVar = false;
    $scope.toggleTime = function() {
      $scope.toggleTimeVar = $scope.toggleTimeVar === false ? true : false;
    };


    $scope.loadingStream = true;
    $scope.search = function() {
      $location.path('/hashtag/' + $scope.model_hashtag);
    };

    ppSyncService.fetchChanges().then(function() {
      //console.log(response);
    }, function(error) {
      console.log(error);
    }, function(change) {
      if (change.deleted) {
        fsPostHelper.deletePost($scope.posts, change);
        fsPostHelper.deleteLike($scope.likes, change);
      } else {

        switch (change.doc.type) {
          case 'POST':
            if (change.doc.msg.match(new RegExp('#' + $routeParams.hashtag, 'gi'))) {
              $scope.posts.push(change);
            }
            break;
          case 'LIKE':
            fsPostHelper.loadLike($scope.likes, change);
            break;
          case 'COMMENT':
            fsPostHelper.loadComment($scope.comments, change);
            break;
          case 'IMAGE':
            if (!angular.isUndefined(change.doc._attachments)) {
              $scope.posts.push(change);
            }
            break;
        }
      }
    });

    var loadMeta = function(response) {
      for (var i = response.length - 1; i >= 0; i--) {
        switch (response[i].doc.type) {
          case 'LIKE':
            fsPostHelper.loadLike($scope.likes, response[i]);
            break;
          case 'COMMENT':
            fsPostHelper.loadComment($scope.comments, response[i]);
            break;
        }
      }
    };


    var loadDocuments = function() {


      ppSyncService.getPostsWithTag($routeParams.hashtag).then(function(response) {

        for (var i = response.length - 1; i >= 0; i--) {

          $scope.posts.push(response[i]);


          ppSyncService.getRelatedDocuments(response[i].id).then(loadMeta);
        }
        $scope.loadingStream = false;
      });
    };
    loadDocuments();


    $scope.loadMore = function() {
      $scope.loadingStream = true;
      var oldestTimestamp = 9999999999999;
      for (var i = 0; i < $scope.posts.length; i++) {

        if (oldestTimestamp > $scope.posts[i].value) {
          oldestTimestamp = $scope.posts[i].value;
        }
      }
      loadDocuments(oldestTimestamp - 1);
    };

    $scope.isPostedByUser = function(user) {
      return user.id === fsUser.user.id ? true : false;
    };

    $scope.deletePost = function(postId) {
      fsPostHelper.findPostInArray($scope.posts, postId).then(function(response) {
        var currentObject = $scope.posts[response];

        $scope.posts.splice(response, 1);
        ppSyncService.deleteDocument(currentObject.doc, true);
        return true;
      });
    };

    $scope.top = function(likes) {
      console.log(likes);
      if (likes >= 2) {
        return 'big';
      } else if (likes >= 1) {
        return 'medium';
      }
    };

    $scope.$on('$destroy', function() {
      ppSyncService.cancel();
    });
  });
'use strict';

angular.module('fsApp')

.controller('MapController', function($scope, $routeParams, ppSyncService, fsGeolocation, fsConfig) {
    $scope.channels = ppSyncService.getChannels();
    $scope.getCurrentChannel = function () {
        return ppSyncService.getActiveChannel();
    };
    /* global L */
  var defaultLatitude = fsConfig.getMapviewDefaultLatitude(),
    defaultLongitude = fsConfig.getMapviewDefaultLongitude(),
    defaultZoom = fsConfig.getMapviewDefaultZoom(),
    markers = new L.MarkerClusterGroup();


  if ($routeParams.long && $routeParams.lat && $routeParams.zoom) {
    fsGeolocation.setCurrentMapLocation({
      lat: $routeParams.lat,
      long: $routeParams.long,
      zoom: $routeParams.zoom
    });
  } else if (fsGeolocation.getCurrentUserPosition() && !fsGeolocation.getCurrentMapLocation()) {
    fsGeolocation.setCurrentMapLocation({
      lat: fsGeolocation.getCurrentUserPosition().latitude,
      long: fsGeolocation.getCurrentUserPosition().longitude,
      zoom: defaultZoom
    });
  } else if (!fsGeolocation.getCurrentMapLocation()) {
    fsGeolocation.setCurrentMapLocation({
      lat: defaultLatitude,
      long: defaultLongitude,
      zoom: defaultZoom
    });
  }

  var map = L.mapbox.map('map', fsConfig.getMapviewMapID(), {
      accessToken: fsConfig.getMapviewAccessToken()
    })
    .setView([fsGeolocation.getCurrentMapLocation().lat, fsGeolocation.getCurrentMapLocation().long], fsGeolocation.getCurrentMapLocation().zoom);

  L.control.locate().addTo(map);

  map.on('moveend ', function() {
    fsGeolocation.setCurrentMapLocation({
      long: map.getCenter().lng,
      lat: map.getCenter().lat,
      zoom: map.getZoom()
    });
  });

  var markerIcon = L.icon({
    iconUrl: 'vendor/mapbox/images/marker-icon.png',
    iconRetinaUrl: 'vendor/mapbox/images/marker-icon-2x.png',
    iconSize: [25, 41],
    iconAnchor: [25, 41],
    popupAnchor: [-12, -40],
    shadowUrl: 'vendor/mapbox/images/marker-shadow.png',
    shadowRetinaUrl: 'vendor/mapbox/images/marker-shadow.png',
    shadowSize: [41, 41],
    shadowAnchor: [25, 41]
  });

  // Gets all Documents, including Posts, Images, Comments and Likes
  var getPostings = function () {
      ppSyncService.getPosts().then(function(response) {
    // Loop through the response and assign the elements to the specific temporary arrays
    for (var i = response.length - 1; i >= 0; i--) {
      switch (response[i].doc.type) {
        case 'POST':
        case 'IMAGE':
          $scope.addToMap(response[i].doc);
          break;
      }
    }
      });
  };
  


    var fetchingChanges = function () {

        ppSyncService.fetchChanges().then(function () {
            //console.log(response);
        }, function (error) {
            console.log(error);
        }, function (change) {
            if (!change.deleted) {

                switch (change.doc.type) {
                    case 'POST':
                        $scope.addToMap(change.doc);
                        break;
                    case 'IMAGE':
                        if (!angular.isUndefined(change.doc._attachments)) {
                            $scope.addToMap(change.doc);
                        }
                        break;
                }
            }
        });

    };
    

    getPostings();
    fetchingChanges();

    $scope.switchChannel = function (channel) {
        if(ppSyncService.setChannel(channel)) {
            markers.eachLayer(function (layer) {
                markers.removeLayer(layer);
            });
            getPostings();
            fetchingChanges();
        };
    };



  $scope.addToMap = function(doc) {
    if (!angular.isUndefined(doc.coords) && doc.coords.longitude && doc.coords.latitude) {
        //marker 桃紅色 20150618
      doc.content = '<span style="color: #bf004d;">' + doc.user.name + '</span><br>' + doc.msg;

      if (doc.type === 'IMAGE') {
        ppSyncService.getAttachment(doc._id, 'image').then(function(response) {
          var reader = new FileReader();

          reader.onload = function(e) {
            doc.content = doc.content + '<img src="' + e.target.result + '">';
            /**
               //凜北測試用,請勿亂刪
              L.marker([doc.coords.latitude, doc.coords.longitude], {
                icon: markerIcon
              })
                .addTo(map)
                .bindPopup(doc.content);**/
            var marker = L.marker([doc.coords.latitude, doc.coords.longitude], {
                icon: markerIcon
              })
              .bindPopup(doc.content);
            markers.addLayer(marker);
            map.addLayer(markers);
          };


          if (response) {
            reader.readAsDataURL(response);//BLOB to DataURL
          }
        });
      } else {
        var marker = L.marker([doc.coords.latitude, doc.coords.longitude], {
            icon: markerIcon
          })
          .bindPopup(doc.content);

        markers.addLayer(marker);
        map.addLayer(markers);
      }


    }
  };

  $scope.$on('$destroy', function() {
    ppSyncService.cancel();
  });

});
'use strict';

angular.module('fsApp')
  .controller('UserController', function($scope, $routeParams, ppSyncService, fsPostHelper) {

    $scope.posts = [];
    $scope.comments = [];
    $scope.likes = [];

    $scope.userId = $routeParams.id;

    var loadMeta = function(response) {
      for (var i = response.length - 1; i >= 0; i--) {
        switch (response[i].doc.type) {
          case 'LIKE':
            fsPostHelper.loadLike($scope.likes, response[i]);
            break;
          case 'COMMENT':
            fsPostHelper.loadComment($scope.comments, response[i]);
            break;
        }
      }
    };

    ppSyncService.getUserPosts($routeParams.id).then(function(response) {

      for (var i = response.length - 1; i >= 0; i--) {
        $scope.posts.push(response[i]);

        ppSyncService.getRelatedDocuments(response[i].id).then(loadMeta);
      }
    });

    ppSyncService.fetchChanges().then(function() {
      //console.log(response);
    }, function(error) {
      console.log(error);
    }, function(change) {
      if (change.deleted) {
        fsPostHelper.deletePost($scope.posts, change);
        fsPostHelper.deleteLike($scope.likes, change);
      } else {

        switch (change.doc.type) {
          case 'POST':
            $scope.posts.push(change);
            break;
          case 'LIKE':
            fsPostHelper.loadLike($scope.likes, change);
            break;
          case 'COMMENT':
            fsPostHelper.loadComment($scope.comments, change);
            break;
          case 'IMAGE':
            if (!angular.isUndefined(change.doc._attachments)) {
              $scope.posts.push(change);
            }
            break;
        }
      }
    });

    $scope.$on('$destroy', function() {
      ppSyncService.cancel();
    });
  });
'use strict';
angular.module('fsApp')
	.controller('LoadController', function() {


	});
'use strict';
angular.module('fsApp')
  .controller('configController', function($scope, $location, $routeParams, fsConfig, fsUser) {
    $scope.user = fsUser.user;
    $scope.userRoles = fsUser.userRoles;
    $scope.accessLevels = fsUser.accessLevels;

    $scope.$watch(
      function() {
        return fsConfig.existingConfig();
      },
      function(newValue) {
        if (newValue) {
          $scope.config = fsConfig.loadConfig();
        }
      }
    );


    $scope.onConnect = function() {
      console.log('$scope.onConnect');
    };

    $scope.onDisconnect = function() {
      console.log('$scope.onDisconnect');
    };
  });
'use strict';

/**
 * @ngdoc function
 * @name fsApp.controller:WallCtrl
 * @description
 * # WallCtrl
 * Controller of the fsApp
 * by zorn
 */
angular.module('fsApp')
  .controller('WallController', function($scope, ppSyncService, fsPostHelper) {

    $('.app-header').hide();
    $('.app-footer').hide();

    $scope.posts = [];
    $scope.comments = [];
    $scope.likes = [];

    $scope.loadingStream = true;

    $scope.toggleTimeVar = false;
    $scope.toggleTime = function() {
      $scope.toggleTimeVar = $scope.toggleTimeVar === false ? true : false;
    };

    ppSyncService.fetchChanges().then(function() {
      //console.log(response);
    }, function(error) {
      console.log(error);
    }, function(change) {
      if (change.deleted) {
        fsPostHelper.deletePost($scope.posts, change);
        fsPostHelper.deleteLike($scope.likes, change);
      } else {

        switch (change.doc.type) {
          case 'POST':
            ppSyncService.getInfo().then(function(response) {
              console.log(response);
            });
            $scope.posts.push(change);
            break;
          case 'LIKE':
            fsPostHelper.loadLike($scope.likes, change);
            break;
          case 'COMMENT':
            fsPostHelper.loadComment($scope.comments, change);
            break;
          case 'IMAGE':
            if (!angular.isUndefined(change.doc._attachments)) {
              $scope.posts.push(change);
            }
            break;
        }
      }
    });

    var loadMeta = function(response) {
      for (var i = response.length - 1; i >= 0; i--) {
        switch (response[i].doc.type) {
          case 'LIKE':
            fsPostHelper.loadLike($scope.likes, response[i]);
            break;
          case 'COMMENT':
            fsPostHelper.loadComment($scope.comments, response[i]);
            break;
        }
      }
    };


    var loadDocuments = function(startkey) {
      if (angular.isUndefined(startkey)) {
        startkey = [9999999999999, {}, {}];
      } else {
        startkey = [startkey, {}, {}];
      }


      var limit = 50;


      ppSyncService.getPosts(limit, startkey).then(function(response) {

        for (var i = response.length - 1; i >= 0; i--) {

          $scope.posts.push(response[i]);

          ppSyncService.getRelatedDocuments(response[i].id).then(loadMeta);
        }
        $scope.loadingStream = false;
      });
    };
    loadDocuments();



    $scope.$on('$destroy', function() {
      ppSyncService.cancel();
    });
  });