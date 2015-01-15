
'use strict';

angular.module('openScadAnalyzerApp')
  .controller('ThingiverseCtrl', function ($scope, $http, $stateParams, $window, socket, $document) {
    
      $scope.things = [];
      $scope.totalCount = 0 ;
      $scope.currentPage = 1;
      $scope.maxSize = 20;
      
      $scope.myArray = [];
      
      $scope.tag = $stateParams.tag;
      $scope.isScadFile = function(filename){
         return filename.indexOf('scad') > 0;
      };
      $scope.notParsed = function(scad){
        var flag = scad.name.indexOf('scad') > 0 && scad.isParsed === -1;
         return scad.name.indexOf('scad') > 0 && scad.isParsed === -1;
      };

      goPage(1, $stateParams.tag);

      function goPage(page, tag){
        var listUrl;
        
        if(tag){
          listUrl = '/api/thingiverses/list/' + tag + '/' + page;
        }else{
          listUrl = '/api/thingiverses/list/' + page;
        }
        console.log('listUrl ' + listUrl);
        $http.get(listUrl).success(function(things) {
          $scope.things = things.results;
          $scope.totalCount = things.totalCount;

        });
      }

      $scope.setPage = function(pageNo){
        $scope.currentPage = pageNo;
      }

      $scope.pageChanged = function() {
        console.log('Page changed to: ' + $scope.currentPage + '/' + $stateParams.tag);
        goPage($scope.currentPage, $stateParams.tag);
      }

      $scope.isParsed = function(file){
          if(file.isParsed == 1) return file.name + " [Parsed]";
          if(file.isParsed == -1) return file.name + " [Not Parsed]";
          else return file.name + " [Parsing Failed]"
      }
      
      $scope.isCollapsed = true;
      $scope.isCollapsed2 = true;

      $scope.getContent = function(content){        
        return content.replace(/[\n\r]/g, '<br>');
      }
      $scope.getContext = function(context){        
        return JSON.stringify(context, null, 4);
      }

      /* fonction to call parameters with each tab name */
      $scope.getConfigurator = function(file){

        if(file == null)
          return;
        
        //CONFIGURATOR PARSER//
              
        var out = [];

        // get only parameters
        // stop before the first module and remove hidden tab
        var textParams = /^module \w+\(.*?\)/gm
        var textNoHidden = /^\/\*(?:\s)?(?:\[)?(?:\s)?[hH]idden(?:\s)?(?:\])?(?:\s)?\*\//gm

        // split before the first module
        var resultsTextParams = file.split(textParams);
        file = resultsTextParams[0];

        // split before the hidden text
        var resultsTextNoHidden = file.split(textNoHidden);
        file = resultsTextNoHidden[0];

        // split differents tabs, global, cube, ...
        var diffTab = /^\/\*(?:\s)?(?:\[)(?:\s)?(.*)(?:\s)?(?:\])(?:\s)?\*\//gm; 
        var tabs = file.split(diffTab);

        // if there is no tab, use the global tab parameters
        if(tabs.length==1) {
             out.push({ TabName : "Global", Parameters : $scope.getParameters(tabs[0]) });
        }
        // else, get parameters for each tabs
        for(var k = 1 ; k< tabs.length; k += 2) {
            out.push({ TabName : tabs[k], Parameters : $scope.getParameters(tabs[k+1]) });
        }

        //END CONFIGURATOR PARSER// 
        // return the parameters array
        return out;
      }

      /* function to get parameters for a tab */
      $scope.getParameters = function(textFile){

              // defines arrays and json objects
              var file = {};
              file.thingParams = {};
              file.thingParams.affectation = [];
              file.thingParams.sliders = [];
              file.thingParams.dropdown = [];
              file.thingParams.imageToSurface = [];
              file.thingParams.imageToArray = [];
              file.thingParams.polygons = [];

              // regexp to get differents customizables parameters
              // see makerbot customizer docs
              var affectation = /^(?:\/\/\s?(.+)\s+)?(?:^([^\/\/]\w*))(?:\s)?\=(?:\s)?(?:"|')?(?:([-+]?[0-9]*\.?[0-9]+|(?:\w|\s)+))(?:"|')?(?:\s)?;(?: )?(?:\/\/(?:\s))?((?!\[).)*$/gm;
              var sliders = /^(?:\/\/\s?(.+)\s+)?(?:^([^\/\/]\w*))(?:\s)?\=(?:\s)?([-+]?[0-9]*\.?[0-9]+)(?:\s)?;(?:\s)?\/\/(?:\s)?\[([-+]?[0-9]*\.?[0-9]+)\:([-+]?[0-9]*\.?[0-9]+)\]/gm; 
              var dropdown = /^(?:\/\/\s?(.+)\s+)?(?:^([^\/\/]\w*))(?:\s)?\=\s*(?:"|')?(?:([-+]?[0-9]*\.?[0-9]+|(?:\w|\s)+))(?:"|')?;\s*\/\/\s*\[((?:(?:\d+|\w+)?(?:\:)?(?:(?:\w+|\s)+),)(?:(?:\d+|\w+)?(?:\:)?(?:(?:\w+|\s)+)(?:,)?)+)\]/gm;
              var imgToSurface = /^(?:\/\/\s?(.+)\s+)?(?:^([^\/\/]\w*))(?:\s)?\=(?:\s)?(?:(?:"|')((?:\w|\-)+\.\w+)(?:"|'))(?:\s)?;(?:\s)?\/\/(?:\s)?\[image_surface(?:\s)?:(?:\s)?(\d+)x(\d+)\]/gm; 
              var imgToArray = /^(?:\/\/\s?(.+)\s+)?(?:^([^\/\/]\w*))(?:\s)?\=(?:\s)?\[((?:[-+]?[0-9]*\.?[0-9]+|,|\s)+)\](?:\s)?;(?:\s)?\/\/(?:\s)?\[image_array(?:\s)?:(?:\s)?(\d+)x(\d+)\]/gm; 
              var polygons = /^(?:\/\/\s?(.+)\s+)?(?:^([^\/\/]\w*))(?:\s)?\=(?:\s)?\[(?:\s)?(\[.*](?:\s)?](?:\s)?),\[(?:\s)?(\[.*](?:\s)?)(?:\s)?](?:\s)?];(?:\s)?\/\/(?:\s)?\[draw_polygon:(\d+)x(\d+)\]/gm;

              var m;
              var i = 0;

              // block code to get affectations variable
              while ((m = affectation.exec(textFile)) != null) {
                if (m.index === affectation.lastIndex) {

                  affectation.lastIndex++;
                }

                if(m.index){
                  file.thingParams.affectation[i] = {
                    name : m[2].replace(/(\n|\r)/gm,""), 
                    value : m[3],
                    description : m[1]
                  };
                  i++;
                }
              }

              
              i = 0;
              // block code to get sliders variable
              while ((m = sliders.exec(textFile)) != null) {
                if (m.index === sliders.lastIndex) {
                  sliders.lastIndex++;
                }
                if(m.index){
                  file.thingParams.sliders[i] = { 
                    name : m[2].replace(/(\n|\r)/gm,""),
                    min : m[4], 
                    def : m[3], 
                    max : m[5],
                    description : m[1]
                  };
                  i++;
                }
              }

              i = 0;
              // block code to get dropdowns variable
              while ((m = dropdown.exec(textFile)) != null) {
                if (m.index === dropdown.lastIndex) {
                  dropdown.lastIndex++;
                }
                if(m.index){
                  file.thingParams.dropdown[i] = {
                    name : m[2].replace(/(\n|\r)/gm,""),
                    def : m[3],
                    values : m[4].split(","),
                    description : m[1]
                  };
                  i++;
                }
              }

              i = 0;

              // block code to get image to surface variable
              while ((m = imgToSurface.exec(textFile)) != null) {

                if (m.index === imgToSurface.lastIndex) {

                  imgToSurface.lastIndex++;
                }

                if(m.index){
                  file.thingParams.imageToSurface[i] = { 
                    name : m[2].replace(/(\n|\r)/gm,""), 
                    file : m[3], 
                    width : m[4],
                    height : m[5],
                    description : m[1]
                  };
                  i++;
                }

              }

              i = 0;
              // block code to get image to array variable
              while ((m = imgToArray.exec(textFile)) != null) {

                if (m.index === imgToArray.lastIndex) {

                  imgToArray.lastIndex++;
                }

                if(m.index){
                  file.thingParams.imageToArray[i] = { 
                    name : m[2].replace(/(\n|\r)/gm,""), 
                    points : m[3].split(","), 
                    paths : m[4],
                    cols : m[5],
                    description : m[1]
                  };
                  i++;
                }
              }

              i = 0;
              // block code to get polygons variable
              while ((m = polygons.exec(textFile)) != null) {

                if (m.index === polygons.lastIndex) {

                  polygons.lastIndex++;
                }

                if(m.index){
                  file.thingParams.imageToArray[i] = { 
                    name : m[2].replace(/(\n|\r)/gm,""), 
                    array : m[3], 
                    rows : m[4],
                    width : m[5],
                    height : m[6],
                    description : m[1]
                  };
                  i++;
                }
              }

              return file;
        }

      // function to initialize sliders
      $scope.init_sliders = function(){
        $('.lesSliders').slider();
      };

      $scope.viewInNewTab = function(url){
        $window.open(url);
      }

      $scope.getIndex = function(index){
        return (($scope. currentPage - 1)*20) +index+1;
      }
});