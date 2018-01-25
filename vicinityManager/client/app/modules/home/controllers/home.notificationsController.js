"use strict";
angular.module('VicinityManagerApp.controllers')
.controller('notifications',
function ($scope,
          $window,
          $timeout,
          $state,
          notificationsAPIService,
          tokenDecoder,
          itemsAPIService,
          userAccountsHelpers,
          commonHelpers,
          registrationsHelpers,
          Notification) {

  // $scope.me = {};
  $scope.tempNotifs = [];
  $scope.notifs = [];
  $scope.registrations = [];
  $scope.oneNotif = false;
  $scope.zeroNotif = false;
  $scope.newNotifs = false;
  // $scope.numberOfUnread = 0

// ====== Look for new notifications every 5s =======

var promise = {};

$scope.intervalFunction = function(){
  promise = $timeout(function(){
    init();
    $scope.intervalFunction();
  }, 5000);
};

$scope.intervalFunction();

$scope.$on('$destroy', function(){
  $timeout.cancel(promise);
  }
);

// Checking if user is devOps =========================

$scope.isDev = false;
var payload = tokenDecoder.deToken();
var keyword = new RegExp('devOps');
$scope.isDev = keyword.test(payload.roles);

// ====== Getting notifications onLoad (read and unread)

  init();

  function init(){
    $scope.tempNotifs = [];
    $scope.registrations = [];
    notificationsAPIService.getNotificationsOfUser($window.sessionStorage.companyAccountId)
      .then(getNotifs, commonHelpers.errorCallback);
    }

    function getNotifs(response){
      $scope.tempNotifs = response.data.message;
      numberOfUnreadNotifs();
      if($scope.isDev){
        notificationsAPIService.getNotificationsOfRegistration()
          .then(function successCallback(response){
            $scope.registrations = response.data.message;
            $scope.tempNotifs = $scope.tempNotifs.concat($scope.registrations);
            sortNotifs();
            numberOfUnreadNotifs();
            if($scope.notifs.length !== 0 && $scope.newNotifs != $scope.notifs.length){
              Notification.success('You have ' + String($scope.notifs.length) + ' new notifications!');
              $scope.newNotifs = $scope.notifs.length;
            }
          },
          commonHelpers.errorCallback
        );
      }else{
        sortNotifs();
        if($scope.notifs.length !== 0 && $scope.newNotifs != $scope.notifs.length){
          Notification.success('You have ' + String($scope.notifs.length) + ' new notifications!');
          $scope.newNotifs = $scope.notifs.length;
        }
      }
    }

      function updateScopeAttributes(response){ // Need to be hoisted
        var index = 0;
        for (index in $scope.notifs){
          if ($scope.notifs[index]._id.toString() === response.data.message._id.toString()){        //updatne len tu notif., ktory potrebujeme
              $scope.notifs[index]=response.data.message;
          }
        }
      }

    // ========= Other Functions ===============

    function numberOfUnreadNotifs(){ // Need to be hoisted
      $scope.oneNotif = $scope.notifs.length === 1;
      $scope.zeroNotif = $scope.notifs.length === 0;
    }

    $scope.changeIsUnreadAndResponded = function(notifID){   // Need to be call external, no need for hoisting
      notificationsAPIService.changeIsUnreadToFalse(notifID)
        .then(notificationsAPIService.changeStatusToResponded(notifID,'responded'), commonHelpers.errorCallback)
        .then(init(), commonHelpers.errorCallback);
    };

    $scope.changeIsUnread = function(notifID){
      notificationsAPIService.changeIsUnreadToFalse(notifID)
        .then(init(),commonHelpers.errorCallback);
    };

    $scope.seeAll = function(){
      var allNotifs = [];
      retrieveAllNotifs($scope.notifs, allNotifs);
      notificationsAPIService.changeIsUnreadToFalse('0',{ids: allNotifs})
        .then(
          function successCallback(){
            init();
          }, commonHelpers.errorCallback
        );
      $state.go('root.main.myNotifications');
    };

    function retrieveAllNotifs(array, allNotifs){
      for (var index in array){
        allNotifs.push(array[index]._id.toString());
      }
    }

  // Accept / Reject requests ======================

  $scope.acceptNeighbourRequest = function (notifId, friendId){
    userAccountsHelpers.acceptNeighbourRequest(friendId)
    .then(init(), userAccountsHelpers.errorCallback)
    .catch(userAccountsHelpers.errorCallback);
  };

    $scope.rejectNeighbourRequest = function(notifId, friendId) {
      userAccountsHelpers.rejectNeighbourRequest(friendId)
      .then(init(),userAccountsHelpers.errorCallback)
      .catch(userAccountsHelpers.errorCallback);
    };

    // $scope.acceptContract = function(id){
    //   itemsAPIService.acceptContract(id, {})
    //     .then(function(response){
    //       Notification.success("The contract was agreed!");
    //       init();
    //     },
    //       function(error){ Notification.error("Problem accepting contract: " + error); }
    //     );
    //   };
    //
    // $scope.removeContract = function(id){
    //   itemsAPIService.removeContract(id)
    //     .then(function(response){
    //       Notification.success("The contract was cancelled!");
    //       init();
    //     },
    //       function(error){ Notification.error("Problem canceling contract: " + error); }
    //     );
    // };

    $scope.acceptRegistration = function (reg_id, notifId) {
     registrationsHelpers.acceptRegistration(reg_id)
      .then(init(),registrationsHelpers.errorCallback)
      .catch(registrationsHelpers.errorCallback);
    };

    $scope.rejectRegistration = function (reg_id, notifId) {
      registrationsHelpers.rejectRegistration(reg_id)
        .then(init(),registrationsHelpers.errorCallback)
        .catch(registrationsHelpers.errorCallback);
    };

    // ========= Time related functions ===============

    function sortNotifs(){
      $scope.notifs = [];
      angular.forEach($scope.tempNotifs,
        function(n) {
          if(n._id){
            var timestamp = n._id.toString().substring(0,8);
            var date = new Date(parseInt( timestamp, 16 ) * 1000 );
            n.timestamp = moment(date);
          }
          $scope.notifs.push(n);
         }
      );
      $scope.notifs.sort(function(a,b){
        return b.timestamp - a.timestamp;
      });
    }

  }
);
