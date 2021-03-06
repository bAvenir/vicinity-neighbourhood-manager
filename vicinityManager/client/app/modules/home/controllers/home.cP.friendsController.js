'use strict';
angular.module('VicinityManagerApp.controllers')
.controller('cPfriendsController',
function ($scope, $stateParams, commonHelpers, userAccountAPIService, $window) {

  // ====== Triggers window resize to avoid bug =======
  commonHelpers.triggerResize();

  $scope.friends = [];
  $scope.loaded = false;

  userAccountAPIService.getUserAccounts($stateParams.companyAccountId, 1)
    .then(
      function successCallback(response) {
        $scope.friends = response.data.message;
        $scope.loaded = true;
      },
      function errorCallback(response){}
    );

  }
);
