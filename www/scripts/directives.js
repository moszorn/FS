'use strict';

angular.module('fsApp')
  .directive('fsAdminDebug', function() {
    return {
      restrict: 'E',
      templateUrl: 'views/partials/adminDebug.html',
      controller: 'AdminDebugController'
    };
  });
'use strict';

angular.module('fsApp')
  .directive('fsFooter', function() {
    return {
      restrict: 'E',
      templateUrl: 'views/partials/footer.html'
    };
  });
'use strict';

angular.module('fsApp')
  .directive('fsHeader', function() {
    return {
      restrict: 'E',
      templateUrl: 'views/partials/header.html'
    };
  });
'use strict';

angular.module('fsApp')
	.directive('fsMaxHeight', function() {
		return {
			restrict: 'A',
			link: function(scope, element) {
				var newHeight = window.innerHeight - 48 - 33;
				element.height(newHeight);
			}
		};
	});
'use strict';

angular.module('fsApp')
  .directive('fsMashupImage', function() {
    return {
      restrict: 'AE',
      template: ' ',
      scope: {
        posting: '=posting',
        couch: '=couch',
        db: '=db',
        images: '=images',
        cache: '=cache'
      },
      link: function(scope, element) {
        /* global $ */
        if (scope.posting.doc._attachments) {
          var imgEl = angular.element('<img id="' + scope.posting.id + '"/>'),
            img = scope.couch + '/' + scope.posting.id + '/image';
          if (scope.cache) {

            ImgCache.isCached(img, function(path, success) {
              var target = $('img#' + scope.posting.id);
              if (success) {

                element.html('<img src="' + img + '" id="' + scope.posting.id + '"/>');

                ImgCache.useCachedFile(target);

              } else {
                element.html('<img src="' + img + '" id="' + scope.posting.id + '"/>');

                ImgCache.cacheFile(img, function() {
                  ImgCache.useCachedFile(target);
                }, function() {

                });
              }
            });
          } else {
            if (scope.posting.temp_img) {
              element.append(imgEl.attr('src', scope.posting.temp_img));
            } else {
              element.append(imgEl.attr('src', img));
            }
          }
        } else {
          element.remove();
        }
      }
    };
  });
'use strict';

angular.module('fsApp')
  .directive('fsMashupItem', function($timeout) {
    return {
      restrict: 'AE',
      link: function(scope, element) {
        /* global $ */
        if (scope.$last) {
          $timeout(function() {
            scope.$emit('MashupImagesLoaded');
          });
        }
        $(element).click(function() {
          $(this).toggleClass('highlight');
          $('.mashup_wrapper').isotope('layout');
        });
      }
    };
  });
'use strict';

angular.module('fsApp')
	.directive('fsNewCommentForm', function() {
		return {
			restrict: 'E',
			scope: {
				postId: '=postId'
			},
			templateUrl: 'views/partials/newComment.html',
			controller: 'NewCommentController'
		};
	});
'use strict';

angular.module('fsApp')
	.directive('fsPostComments', function() {
		return {
			restrict: 'E',
			templateUrl: 'views/partials/postComments.html'
};
	});
'use strict';

angular.module('fsApp')
	.directive('fsPostFormatted', function($filter) {
		var hashtag = function(text) {
			return text.replace(/(^|\s)(#[a-zA-ZöüäÖÜÄß\-\d-]+)/gi, function(t) {
				return ' ' + t.link('#/hashtag/' + t.replace('#', '').trim()).trim();
			});
		};

		return {
			restrict: 'E',
			scope: {
				message: '=message'
			},
			link: function(scope) {
				if (!angular.isUndefined(scope.message)) {
					scope.message = $filter('linky')(scope.message);
					scope.message = hashtag(scope.message);
				}
			},
			template: '<p ng-bind-html="message"></p>'
		};
	});
'use strict';

angular.module('fsApp')
	.directive('fsPostImage', function(ppSyncService) {
		return {
			restrict: 'AE',
			link: function(scope, element, attrs) {
				// 若有附件從local載入
				if (!angular.isUndefined(scope.post.doc._attachments)) {

					ppSyncService.getAttachment(scope.post.id, 'image').then(function(response) {
						var reader = new FileReader();

						reader.onload = function(e) {
							scope.loadedImage = e.target.result;
							element.attr('src', scope.loadedImage);

							if (attrs.crop === 'true') {

								scope.$watch(function() {
									return element.height();
								}, function(value) {
									//scope.height = element.height();
									if (value > 200 && attrs.crop === 'true') {
										var margin = (value - 200) / 2;
										element.css('margin-top', -margin);
									}
								});
							}
						};

						reader.readAsDataURL(response);
					});
				}
			}
		};
	});
'use strict';


angular.module('fsApp')
	.directive('fsPostMeta', function() {
		return {
			restrict: 'E',
			templateUrl: 'views/partials/postMeta.html',
			controller: 'PostMetaController'
		};
	});
'use strict';

angular.module('fsApp')
	.directive('fsNewPostActions', function() {
		return {
			restrict: 'E',
			templateUrl: 'views/partials/newPostActions.html',
			controller: 'PostActionsController'
		};
	});
'use strict';

angular.module('fsApp')
	.directive('fsNewCodecatchActions', function() {
		return {
			restrict: 'E',
			templateUrl: 'views/partials/newCodecatchActions.html',
			controller: 'CodecatchActionsController'
		};
	});
'use strict';

angular.module('fsApp')
	.directive('fsPostVideo', function() {
		return {
			restrict: 'AE',
			template: ' ',
			scope: {
				posting: '=posting',
				couch: '=couch',
				db: '=db',
				images: '=images',
				cache: '=cache'
			},
			link: function(scope, element) {
				if (scope.posting.doc._attachments && scope.posting.doc.video) {
					angular.forEach(scope.posting.doc._attachments, function(row, key) {
						element.html('<video width="320" height="240" controls>' + '<source src="' + scope.couch + '/' + scope.posting.id + '/' + key + '" type="' + row.content_type + '">' + 'Your browser does not support the video tag.' + '</video>');
					});

				}
			}
		};
	});
'use strict';

angular.module('fsApp')
	.directive('fsPostFulltime', function() {
		/* global moment */
		var time = function(time) {
			time = moment.unix(time / 1000).format('LLL');
			return time;
		};

		return {
			restrict: 'E',
			scope: {
				time: '=time'
			},
			link: function(scope) {
				scope.fsPostFulltime = time(scope.time);
			},
			template: '<span ng-bind="fsPostFulltime"></span>'
		};
	});
'use strict';

angular.module('fsApp')
  .directive('fsHashtagSearch', function() {
    return {
      restrict: 'E',
      templateUrl: 'views/partials/hashtagSearch.html'
    };
  });