'use strict';

angular.module('openScadAnalyzerApp')
.config(function ($stateProvider) {
	//winston.log('info',"main.js");
	$stateProvider
	.state('main', {
		url: '/',
		templateUrl: 'app/main/main.html',
		controller: 'MainCtrl'
	});
});