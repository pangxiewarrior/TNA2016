(function() {
    'use strict';
    angular
        .module('formioPrizeDrawing', [
            'ngSanitize',
            'ui.router',
            'ui.bootstrap',
            'formio'
        ])
        .config([
            '$stateProvider',
            '$urlRouterProvider',
            'FormioProvider',
            'AppConfig',
            function(
                $stateProvider,
                $urlRouterProvider,
                FormioProvider,
                AppConfig
            ) {
                // Set the base url for formio.
                FormioProvider.setBaseUrl(AppConfig.apiUrl);
                $stateProvider
                    .state('register', {
                        url: '/',
                        templateUrl: 'views/register.html',
                        controller: ['$scope', '$state', '$rootScope', function($scope, $state, $rootScope) {
                            $scope.$on('formSubmission', function(err, submission) {
                                if (!submission) { return; }
                                $state.go('done');
                            });
                        }]
                    })
                    .state('done', {
                        url: '/done',
                        templateUrl: 'views/done.html'
                    })
                    .state('login', {
                        url: '/login',
                        templateUrl: 'views/login.html',
                        controller: ['$scope', '$state', '$rootScope', function($scope, $state, $rootScope) {
                            $scope.$on('formSubmission', function(err, submission) {
                                if (!submission) { return; }
                                $rootScope.isAdmin = true;
                                localStorage.setItem("admin", 1);
                                $rootScope.user = submission;
                                $state.go('drawing');
                            });
                        }]
                    })
                    .state('drawing', {
                        url: '/drawing',
                        templateUrl: 'views/drawing.html',
                        controller: [
                            '$scope',
                            '$http',
                            '$rootScope',
                            '$state',
                            'Formio',
                            function(
                                $scope,
                                $http,
                                $rootScope,
                                $state,
                                Formio
                            ) {
                                if (!$rootScope.user) {
                                    $state.go('register');
                                    return;
                                }
                                $scope.winner = null;
                                $scope.loading = false;
                                $scope.draw = function() {
                                    $scope.loading = true;
                                    var exportUrl = $rootScope.registerForm + '/export?x-jwt-token=' + Formio.getToken();
                                    var delay = 10;
                                    setTimeout(function() {
                                        $http.get(exportUrl).then(function (response) {
                                            $scope.loading = false;
                                            var numEntries = response.data.length;
                                            var pick = Math.floor(Math.random() * numEntries);
                                            $scope.winner = response.data[pick];
                                            localStorage.setItem('winner', $scope.winner.data.email);
                                        });
                                    }, delay);
                                };
                            }
                        ]
                    });

                $urlRouterProvider.otherwise('/');
            }
        ])
        .run([
            '$rootScope',
            'AppConfig',
            'Formio',
            '$state',
            function(
                $rootScope,
                AppConfig,
                Formio,
                $state
            ) {
                $rootScope.user = null;
                $rootScope.adminLoginForm = AppConfig.appUrl + '/' + AppConfig.adminLoginPath;
                $rootScope.registerForm = AppConfig.appUrl + '/' + AppConfig.drawingFormPath;

                // Set the current user if it isn't provided.
                if (!$rootScope.user) {
                    Formio.currentUser().then(function(user) {
                        $rootScope.user = user;
                    });
                }

                var authError = function() {
                    $rootScope.user = null;
                    $state.go('register');
                };

                var logoutError = function() {
                    $rootScope.user = null;
                    $state.go('register');
                };

                $rootScope.$on('formio.sessionExpired', logoutError);
                $rootScope.$on('formio.unauthorized', authError);

                // Logout of form.io and go to login page.
                $rootScope.logout = function() {
                    Formio.logout().then(function() {
                        $rootScope.user = null;
                        $state.go('register');
                    }).catch(logoutError);
                };

                // Determine if a state is active.
                $rootScope.isActive = function(state) {
                    return $state.current.name.indexOf(state) !== -1;
                };
            }
        ]);
})();