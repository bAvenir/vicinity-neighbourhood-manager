'use strict';
angular.module('VicinityManagerApp.controllers').
  controller('allRegistrationsController',
  function ($scope,
            commonHelpers,
            $window,
            registrationsAPIService,
            notificationsAPIService,
            Notification) {

// Initialize variables and get initial resources

// ====== Triggers window resize to avoid bug =======
    commonHelpers.triggerResize();

    $scope.loadedPage = false;
    $scope.regisList = [];
    $scope.rev = false;
    $scope.myOrderBy = 'companyName';

    init();

    function init(){
    registrationsAPIService.getAll()
      .then(
        function successCallback(response){
          $scope.regisList = response.data.message;
          $scope.loadedPage = true;
        },
        function errorCallback(response){}
      );
    }

// Functions

  $scope.verifyAction = function(id){
  registrationsAPIService.putOne(id,{status: "pending" })
  .then(function(response){
    Notification.success("Verification mail was sent to the company!");
    $scope.status = 'pending';
    init();
  })
  .catch(function(err){
    errorCallback(err);
  });
  };

  $scope.declineAction = function(id){
  registrationsAPIService.putOne(id,{status: "declined" })
    .then(function(response){
      Notification.success("Company was rejected!");
      $scope.status = 'declined';
      init();
    })
    .catch(function(err){
      errorCallback(err);
    });
  };

  $scope.orderByMe = function(x) {
    if($scope.myOrderBy === x){
      $scope.rev=!($scope.rev);
    }
    $scope.myOrderBy = x;
  };

  $scope.onSort = function(order){
    $scope.rev = order;
  };

  function errorCallback(err){
    Notification.error("Something went wrong..." + JSON.stringify(err));
  }

});
