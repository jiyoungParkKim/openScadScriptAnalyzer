/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /things              ->  index
 * POST    /things              ->  create
 * GET     /things/:id          ->  show
 * PUT     /things/:id          ->  update
 * DELETE  /things/:id          ->  destroy
 */
 'use strict';

 var _ = require('lodash');
 var requestHelper = require('./requestHelper');
 var thingiverseService = thingiverseService = require('./thingiverse.service');

 var winston = require('winston');
 var logger = new (winston.Logger)({
  transports: [
    //  new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: 'logs.log' })
    ]
  });

 exports.getAccessToken = function (req, res) {
  requestHelper.getAccessToken(function(flag){
    logger.info('Fichier thingiverse.controller.js | fonction getAccessToken');
    console.log('flag ' + flag);
    return res.json(201, {hasAccessToken:flag});
  });
}

exports.checkme = function(req, res){
  requestHelper.checkme(req.body.token, function(err, me){
    logger.info('Fichier thingiverse.controller.js | fonction checkme');
    if(err) { return handleError(res, err); }
    return res.json(201, me);
  });
}


// Get list of thingiverses
exports.batch = function(req, res) {
  var tag = req.params.tag;
  var limite = req.params.limite;
  if(limite == null)
    limite = -1;

  thingiverseService.batch(tag, limite, function(err, obj){
    logger.info('Fichier thingiverse.controller.js | fonction batch');
    if(err) { return handleError(res, err); }
    return res.json(200, obj);
  });  
};


exports.list = function(req, res){
  thingiverseService.list(req.params.tag, req.params.page, function(err, things){
    logger.info('Fichier thingiverse.controller.js | fonction list');

    var file = "";

    if(things.results.length == 1){

      for(var index = 0 ; index < things.results[0].files.length ; index ++){

        if(things.results[0].files[index].name.indexOf(".scad") != -1){
          file = things.results[0].files[index].content;
        }
      }

      var out = [];

      // Ne récupérer que la partie qui concerne les paramètres (ie : au dessus du premier module)

      var textParams = /^module \w+\(.*?\)/gm
      var textNoHidden = /^\/\*(?:\s)?(?:\[)?(?:\s)?[hH]idden(?:\s)?(?:\])?(?:\s)?\*\//gm

      var resultsTextParams = file.split(textParams);
      file = resultsTextParams[0];

      var resultsTextNoHidden = file.split(textNoHidden);
      file = resultsTextNoHidden[0];


      //console.log(file);

      var diffTab = /^\/\*(?:\s)?(?:\[)(?:\s)?(.*)(?:\s)?(?:\])(?:\s)?\*\//gm; 

      var tabs = file.split(diffTab);

      console.log(tabs.length);

      var i;

      if(tabs.length==1) {
           out.push({ TabName : "Global", Parameters : getParameters(tabs[0]) });
      }

      for(i = 1 ; i< tabs.length; i += 2) {
          out.push({ TabName : tabs[i], Parameters : getParameters(tabs[i+1]) });
      }

      console.log(JSON.stringify(out,null,4));
    }else{
      console.log("too many things");
    }

    if(err) { return handleError(res, err); }
    return res.json(200, things);
  })
}

exports.stat = function(req, res){
  thingiverseService.stat(function(err, data){
    logger.info('Fichier thingiverse.controller.js | fonction stat');
    if(err) { return handleError(res, err); }
    return res.json(200, data);
  })
}

exports.reparse = function(req, res){
  var mode = req.params.mode;
  var limite = req.params.limite;
  var filesize = req.params.filesize;

  thingiverseService.reparse(mode, limite, filesize, function(err, data){
    logger.info('Fichier thingiverse.controller.js | fonction reparse');
    if(err) { return handleError(res, err); }
    return res.json(200, data);
  })
}

exports.parseOneScad = function(req, res){
  thingiverseService.parseOneScad(function(err, data){
    logger.info('Fichier thingiverse.controller.js | fonction parseOneScad');
    if(err) { return handleError(res, err); }
    return res.json(200, data);
  })
}

exports.getComplexScadListWithUseKey = function(req, res){
  logger.info('Fichier thingiverse.controller.js | fonction getComplexScadListWithUseKey');
  getScadListWithKey(/use <([^>]*)>;?/);
}

exports.getComplexScadListWithIncludeKey = function(req, res){
  logger.info('Fichier thingiverse.controller.js | fonction getComplexScadListWithIncludeKey');
  getScadListWithKey(/include <([^>]*)>;?/);
}

function getComplexScadList(regExp){
  thingiverseService.distinctIncludedFiles(regExp, function(err, data){
    logger.info('Fichier thingiverse.controller.js | fonction getComplexScadList');
    if(err) { return handleError(res, err); }
    return res.json(200, data);
  })
}

function handleError(res, err) {
  logger.info('Fichier thingiverse.controller.js | fonction handleError');
  return res.send(500, err);
}

function getParameters(textFile){

      //console.log(textFile);

      var file = {};
      file.thingParams = {};
      file.thingParams.affectation = [];
      file.thingParams.sliders = [];
      file.thingParams.dropdown = [];
      file.thingParams.imageToSurface = [];
      file.thingParams.imageToArray = [];
      file.thingParams.polygons = [];

      //regexp
      var affectation = /^(?:\/\/\s?(.+)\s+)?(?:^([^\/\/]\w*))(?:\s)?\=(?:\s)?(?:"|')?(?:([-+]?[0-9]*\.?[0-9]+|(?:\w|\s)+))(?:"|')?(?:\s)?;(?: )?(?:\/\/(?:\s))?((?!\[).)*$/gm;
      var sliders = /^(?:\/\/\s?(.+)\s+)?(?:^([^\/\/]\w*))(?:\s)?\=(?:\s)?([-+]?[0-9]*\.?[0-9]+)(?:\s)?;(?:\s)?\/\/(?:\s)?\[([-+]?[0-9]*\.?[0-9]+)\:([-+]?[0-9]*\.?[0-9]+)\]/gm; 
      var dropdown = /^(?:\/\/\s?(.+)\s+)?(?:^([^\/\/]\w*))(?:\s)?\=\s*(?:"|')?(?:([-+]?[0-9]*\.?[0-9]+|(?:\w|\s)+))(?:"|')?;\s*\/\/\s*\[((?:(?:\d+|\w+)?(?:\:)?(?:(?:\w+|\s)+),)(?:(?:\d+|\w+)?(?:\:)?(?:(?:\w+|\s)+)(?:,)?)+)\]/gm;
      var imgToSurface = /^(?:\/\/\s?(.+)\s+)?(?:^([^\/\/]\w*))(?:\s)?\=(?:\s)?(?:(?:"|')((?:\w|\-)+\.\w+)(?:"|'))(?:\s)?;(?:\s)?\/\/(?:\s)?\[image_surface(?:\s)?:(?:\s)?(\d+)x(\d+)\]/gm; 
      var imgToArray = /^(?:\/\/\s?(.+)\s+)?(?:^([^\/\/]\w*))(?:\s)?\=(?:\s)?\[((?:[-+]?[0-9]*\.?[0-9]+|,|\s)+)\](?:\s)?;(?:\s)?\/\/(?:\s)?\[image_array(?:\s)?:(?:\s)?(\d+)x(\d+)\]/gm; 
      var polygons = /^(?:\/\/\s?(.+)\s+)?(?:^([^\/\/]\w*))(?:\s)?\=(?:\s)?\[(?:\s)?(\[.*](?:\s)?](?:\s)?),\[(?:\s)?(\[.*](?:\s)?)(?:\s)?](?:\s)?];(?:\s)?\/\/(?:\s)?\[draw_polygon:(\d+)x(\d+)\]/gm;

      var m;
      var i = 0;

      
      //console.log(textFile);

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