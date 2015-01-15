process.env.NODE_ENV = "development";

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var dao = require('./thingiverse.dao');
var requestHelper = require('./requestHelper');

var d = require('./DataBag');
var parsingHelper = require('./parsingHelper');
var utils = require('./thingiverseUtils');

var Thing = mongoose.model('Thing');
var Tag = mongoose.model('Tag');
var Category = mongoose.model('Category');
var Comment = mongoose.model('Comment');
var File = mongoose.model('File');

var scadAnalyzer = require('./openScadAnalyzer');
var async = require('async');

var service = require('./thingiverse.service');

var devDB = 'mongodb://148.60.11.195:27017/openscadanalyzer-dev';
var currentDB = devDB;

var socketMsgHelper = require('./socketMsgHelper');
socketMsgHelper.register(getSocket());


require('colors')
var jsdiff = require('diff');

exports.list = function(tag, page, callback){
	doSomethingInDB(currentDB, function(){
		service.list(tag, 1, function(err, things){
			closeDB();
			callback(things);
		});
	});//doSomethingInDB
};

/* List things
If state = 0, list parsed scad files
Else, list failed scad files
*/
exports.listByState = function(nbResults, state, callback){
	doSomethingInDB(currentDB, function(){
		service.listByState(nbResults, state, function(err, things){
			closeDB();
			callback(things);
		});
	});//doSomethingInDB
};

exports.generateGlobalStatistics = function(idThing, idFile, callback){
	doSomethingInDB(currentDB, function(){
		service.generateGlobalStatistics(idThing, idFile, function(err){
			closeDB();
			callback();
		});
	});//doSomethingInDB
}

exports.batch = function(tag, limitCnt, cb){
	doSomethingInDB(currentDB, function(){
		service.setCallback(cb);
		service.batch(tag, limitCnt, function(err, rtn){
			print(rtn);
		});//service.batchLimited
	});//doSomethingInDB
};

exports.statistics = function(cb){
	doSomethingInDB(currentDB, function(){		
		service.stat(function(err, data){
			console.log(data);
			closeDB();
			cb();
		})
	});
};

exports.parseNotParsedFiles = function(mode, cb){
	
	doSomethingInDB(currentDB, function(){
		File
		.find({name:/scad/, isParsed : mode, size : {$lt:10000}})
		.populate('_thing', 'id') // only return the things id
		.exec(function(err, files){

			var parser = parsingHelper.newParsingHelper(socketMsgHelper, 'forceParse');

			parser.setCliCallback(cb);
			
			if(files.length == 0){
				print('target not found');
				cb();
			}else{
				for(var i = 0 ; i < files.length ; i ++){
					parser.addTarget(files[i]);
				}		
			}
			parser.startParsing();
		});
	});
};

exports.parseOneScad = function(_id, cb){
	doSomethingInDB(currentDB, function(){

		File.findById(_id, function(err, file){
			if(err) errHandler(err);
			if(file != null){
				print(file.name + ' : ' + file.size)
				scadAnalyzer.parse(file, function(err, file){
					if(err) {
						errHandler(_id + ' : ' + err);
						cb();
					}
					else{
									
						file.save(function(err){
							if(err) errHandler(_id + ' : ' + err);
							print(file.stat);
							closeDB();
							cb();
						});
					}				
				});//scadAnalyzer
			}else{print(_id + ' is null')}
		})//findById
	});//doSomethingInDB
};

//distinctIncludedFiles(/use <([^>]*)>;?/);
//distinctIncludedFiles(/include <([^>]*)>;?/);
exports.distinctIncludedFiles = function(regExp, cb){
	doSomethingInDB(currentDB, function(){
		//var regExp = /use <([^>]*)>;?/; <-- catch use tag
		//var regExp = /include <([^>]*)>;?/;	<-- catch include tag
		File.find({content:regExp}, function(err, files){
								
			var target = [];
			for(i in files){	
				var file = files[i];

				var lines = (file.content).split("\n");

				for (var i in lines){
					var line = lines[i];
					if(regExp.test(line)){
						var obj = {id:file._id, name:file.name, line:line};
						target.push(obj);
					}
				}
			}
			var newTarget = _.uniq(target);
			console.log(newTarget);
			//////////////////////////////////////////////
			closeDB();
			//////////////////////////////////////////////
			cb();
		});// find
	});	
};

exports.extractScadFiles = function(mode, cb){
	
	doSomethingInDB(currentDB, function(){
		File
		.find({name:/scad/, isParsed : mode})
		.exec(function(err, files){
			if(err){
				console.log(err);
				closeDB();
			}else{
				var cnt = files.length;
				if(cnt > 0){

					var fs = require('fs');
					var path = require('path');
					var config = require('../../config/environment');
					var scadRoot = path.join(config.root, 'scadRoot');

					if(!fs.existsSync(scadRoot)){
						fs.mkdirSync(scadRoot);
					}

					if(mode == 0){
						scadRoot += "/ParsingFailed";
					}else if(mode == 1){
						scadRoot += "/ParsingOK";
					}

					if(!fs.existsSync(scadRoot)){
						fs.mkdirSync(scadRoot);
					}

					for(var i = 0 ; i < cnt ; i ++){
						var file = files[i];
						var filePath = scadRoot + "/" + file.name;
						console.log("file : " + filePath);
						if(!fs.existsSync(filePath)){
							var data = file.content;
							fs.writeFileSync(filePath, data);
						}
					}
				}
			}
			cb();
		});
	});
};

exports.testStats = function(thing, file ,callback){

	var valid = true;

	print('Thing Name : ' + thing.name);
	
	var stats = null;

	//search for parsed scad file
	for( index in thing.files){
		if(thing.files[index].isParsed == 1){
			stats = thing.files[index].stat;
			break;
		}
	}

	if(stats == null){
		print("This thing is not parsed yet".yellow)
	}else{

		var generatedstats = stats;
		var userParameters = file.stats;

		//compare objects
		var diff = jsdiff.diffJson(generatedstats, userParameters);

		diff.forEach(function(part){
		  // green for additions, red for deletions
		  // grey for common parts
		  var color = part.added ? 'green' :
		    part.removed ? 'red' : 'grey';
		  	print(part.value[color]);
			
			if(part.added || part.removed){
				valid = false;
			}
		});

		if(!valid){
			var col = 'red';
			print('Test failed'.red);
		}else{
			print('Test passed'.green);
		}
	
	}
	callback();

};

exports.testExtractor = function(file, testFile ,callback){

	var valid = true;

	//CONFIGURATOR PARSER//
          
    var out = [];

    // Ne récupérer que la partie qui concerne les paramètres (ie : au dessus du premier module)

    var textParams = /^module \w+\(.*?\)/gm
    var textNoHidden = /^\/\*(?:\s)?(?:\[)?(?:\s)?[hH]idden(?:\s)?(?:\])?(?:\s)?\*\//gm

    var resultsTextParams = file.split(textParams);
    file = resultsTextParams[0];

    var resultsTextNoHidden = file.split(textNoHidden);
    file = resultsTextNoHidden[0];

    var diffTab = /^\/\*(?:\s)?(?:\[)(?:\s)?(.*)(?:\s)?(?:\])(?:\s)?\*\//gm; 

    var tabs = file.split(diffTab);


    if(tabs.length==1) {
         out.push({ TabName : "Global", Parameters : getParameters(tabs[0]) });
    }

    for(var k = 1 ; k< tabs.length; k += 2) {
        out.push({ TabName : tabs[k], Parameters : getParameters(tabs[k+1]) });
    } 
    
	var Parameters = out;	
	var userParameters = testFile.Parameters;

	if(Parameters == null ){
		print("This thing is not parsed yet".yellow)
	}else{


		//compare objects
		var diff = jsdiff.diffJson(Parameters, userParameters);

		diff.forEach(function(part){
		  // green for additions, red for deletions
		  // grey for common parts
		  var color = part.added ? 'green' :
		    part.removed ? 'red' : 'grey';
		  	print(part.value[color]);
			
			if(part.added || part.removed){
				valid = false;
			}
		});

		if(!valid){
			var col = 'red';
			print('Test failed'.red);
		}else{
			print('Test passed'.green);
		}
	
	}

	callback();
};


//////////////////////////////////////////////////////////////////////////////////////
function closeDB(){
	mongoose.connection.close();
	//print('connection closed');
}
exports.closeDB = function(){
	mongoose.connection.close();
	//print('connection closed');
}
function doSomethingInDB(dburi, outerCallback){
	mongoose.connect(dburi);
	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function callback () {
		try {
			// after doing , you should close the connection!!!!
			//console.log('connection opened')
			outerCallback();

		}catch (e) {
			print(e);
			closeDB();
		}	
	});
}

function errHandler(err){
	console.log(err);	
	closeDB();
	return;
}

function print(msg){
	console.log(msg);
}

function getSocket(){
	return {
		emit: function(channel, info){
			console.log(channel, JSON.stringify(info));
		}
	}
}


function getParameters(textFile){

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



function handleErr(title, err){
	console.log('!!! ERR --------------------\n '+ title + ' : ' + err + '\n------------------------');
}

function parsingErr(err){
	console.log('!!! PARSING ERR --------------------\n '+ err + '\n------------------------');
}
