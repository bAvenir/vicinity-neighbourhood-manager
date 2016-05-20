angular.module('VicinityManagerApp.controllers').
controller('companyAccountController', function($scope, $window, userAccountAPIService, AuthenticationService) {
  $scope.name = {};
  $scope.avatar = {};
  // $scope.occupation = {};
  // $scope.organisation = {};
  $scope.companyAccountId = {};
  n=0;


  userAccountAPIService.getUserAccountProfile($window.sessionStorage.companyAccountId).success(function (response) {

    $scope.name = response.message.organisation;
    $scope.avatar = response.message.avatar;
    $scope.companyAccountId = response.message._id;
    // $scope.occupation = response.message.accountOf.occupation;
    // $scope.organisation = response.message.accountOf.organisation;
    // $scope.userAccountId = response.message._id;
  });
});