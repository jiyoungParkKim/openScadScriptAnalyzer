'use strict';

angular.module('openScadAnalyzerApp')
  .controller('MainCtrl', function ($scope, $rootScope, $http, socket) {
    //winston.log('info',"controller.js");

    // $scope.awesomeThings = [];

    // $http.get('/api/things').success(function(awesomeThings) {
    //   $scope.awesomeThings = awesomeThings;
    //   socket.syncUpdates('thing', $scope.awesomeThings);
    // });

    // $scope.addThing = function() {
    //   if($scope.newThing === '') {
    //     return;
    //   }
    //   $http.post('/api/things', { name: $scope.newThing });
    //   $scope.newThing = '';
    // };

    // $scope.deleteThing = function(thing) {
    //   $http.delete('/api/things/' + thing._id);
    // };

    // $scope.$on('$destroy', function () {
    //   socket.unsyncUpdates('thing');
    // });

    $scope.data = {};
    $http.get('/api/thingiverses/stat').success(function(data) {
      //logger.info('main.controller.js');
      $scope.data = data;
      $scope.parsed = (data.parsed/data.total)*100;
      $scope.failed = (data.failed/data.total)*100;
      $scope.notParsed = (data.notParsed/data.total)*100;

      $scope.pieData = [
        [0,$scope.parsed,"#AA8888"], 
        [$scope.parsed,$scope.parsed + $scope.failed,"#88BB88"], 
        [$scope.parsed + $scope.failed,100,"#8888CC"]
      ];
      //socket.syncUpdates('thing', $scope.awesomeThings);
      var colorArray = ["#AA8888", "#88BB88", "#8888CC"];
      $scope.colorFunction = function() {
        return function(d, i) {
            return colorArray[i];
          };
      }

      $scope.exampleData = [{
        key: "parsed",
        y: $scope.data.parsed
      }, {
        key: "failed",
        y: $scope.data.failed
      }, {
        key: "notParsed",
        y: $scope.data.notParsed
      }];

    });

    $scope.exampleData = [
      { key: "One", y: 5 },
      { key: "Two", y: 2 },
      { key: "Three", y: 9 },
      { key: "Four", y: 7 },
      { key: "Five", y: 4 },
      { key: "Six", y: 3 },
      { key: "Seven", y: 9 }
    ];

    var colorArray = ['#7FFFD4', '#E9967A', '#EE82EE', '#FF6666', '#FF3333', '#FF6666', '#FFE6E6'];
    $scope.colorFunction = function() {
      return function(d, i) {
        return colorArray[i];
      };
    };

    $scope.xFunction = function() {
      return function(d) {
        return d.key;
      };
    }
    $scope.yFunction = function() {
      return function(d) {
        return d.y;
      };
    }

    $scope.descriptionFunction = function() {
      return function(d) {
        return d.key;
      }
    }

  });
