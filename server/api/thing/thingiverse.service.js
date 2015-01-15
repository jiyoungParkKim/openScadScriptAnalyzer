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

var async = require('async');
var socketMsgHelper = require('./socketMsgHelper');
var parser = parsingHelper.newParsingHelper(socketMsgHelper, 'forceParse');
parser.startParsing();

var cliCallback;

var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
    //  new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: 'logs.log' })
    ]
  });

var json2csv = require('json2csv');


exports.setCallback = function(_callback){
	cliCallback = _callback;
}

exports.batch = function(tag, limitCnt, cb){
	logger.info('Fichier thingiverse.service.js | fonction batch ');
	requestHelper.getTotalCntOfThings(tag, function(err, totalPageCnt, totalRemoteThingsCnt){
		logger.info('Fichier thingiverse.service.js | fonction batch - getTotalCntOfThings');
		console.log('totalRemoteThingsCnt : '+ totalRemoteThingsCnt);
		if(err) throw err; 
		dao.findTags(tag, function(err, tags){
			console.log('thingsFromDB.length : '+ tags.length);
			if(limitCnt == undefined){
				limitCnt = -1;
			}
			var dataBag = d.newDataBack(tag, totalRemoteThingsCnt, limitCnt);
			dataBag.init(tags);		

			cb(null, {max:dataBag.totalRemoteThingsCnt, value:dataBag.thingsFromDB.length});// initStatus
			requestHelper.downloadThings(dataBag, 1, totalPageCnt, function(err){
				if(err) return handleError('requestAllThings:downloadThings', err); 
				else createThings(dataBag);
			});
		});
	})
}



/*
---- dataBack ex ----
socket : [object Object]
tag : customizer
totalRemoteThingsCnt : 2079
limitCnt : 5
thingsFromDB : 161
thingsToDownload : 5
maxCnt : 5
---------------------
 */
function createThings(dataBag){
	logger.info('Fichier thingiverse.service.js | fonction createThings(dataBag){');
	//dataBag.toString();
	for(var i = 0 ; i < dataBag.maxCnt ; i ++){
		var thing_id = dataBag.thingsToDownload.pop();
		// download one thing in every 8 seconds
		(function(currentI, currentThingID){
			setTimeout(function () {
				//////////// download target thing and save it ///////////////
	      		createOneThing(dataBag, currentI, currentThingID);	
	      		//////////////////////////////////////////////////////////////
	      	}, currentI * 8000);
		}(i, thing_id));
	}	
}

function createOneThing(dataBag, index, thing_id){
	logger.info('Fichier thingiverse.service.js | fonction createOneThing(dataBag){');
	// 1. download thing json data from remote site
	Thing.getThisFromRemote(thing_id, function(err, thing){
		if(err){
			handleError('createOneThing:Thing.getThisFromRemote', err); 
		}else{
			// save new thing
			
			new Thing(thing).save(function (err, result){
				if(err){
					handleError('createOneThing:Thing(thing).save', err);
				}else{
					
					async.parallel([
						// 1. Tags
						function(callback){
							requestHelper.getRemoteObject(Tag, result.id, result._id, callback);
						},
						// 2. Categories
						function(callback){
							requestHelper.getRemoteObject(Category, result.id, result._id, callback);							
						},
						// 3. Comments
						function(callback){
							requestHelper.getRemoteObject(Comment, result.id, result._id, callback);								
						},
						// 4. Files
						function(callback){
							requestHelper.getRemoteObject(File, result.id, result._id, callback);
						}
					],
					function(err, results){

						Thing.findById(result._id, function(err, thing){

							thing.tags = results[0];
							thing.categories = results[1];
							thing.comments = results[2];
							thing.files = results[3];
							
							var isFinish = false;

							downloadScadFiles(thing.files, thing.id, function(err, rtn){
								if(err){
									handleError('requestHelper:downloadScadFiles', err);
									//utils.sendDownloadgMsg(dataBag.socket, thing_id, 'Failed');
									socketMsgHelper.sendSocketMsg('downloadScad', {thing_id:thing_id, msg:'Failed'});
								}else{
									//utils.sendDownloadgMsg(dataBag.socket, thing_id, 'OK');
									socketMsgHelper.sendSocketMsg('downloadScad', {thing_id:thing_id, msg:'OK'});
									// if(rtn.size < 10000){
									// 	dataBag.parser.addTarget(rtn);
									// }
								}

								thing.save(function(err){
									if(err){
										if(err) handleError('createOneThing:thing.save', err);
									}else{
										print(index + ' : ' + thing.id + ' saved -------------------------------');
										//utils.sendSocketMsg(dataBag.socket, dataBag.totalRemoteThingsCnt, (dataBag.existingThingsCnt + index + 1), thing);
										//utils.sendSocketMsg(dataBag.socket, dataBag.maxCnt, (index + 1), thing);//batch
										// TODO
										socketMsgHelper.sendSocketMsg('batch', {max:dataBag.maxCnt, value:(index + 1), thing:thing});
									}
									
									if(index == dataBag.maxCnt - 1 ){
										
										print('****************************************************');
										print('******************* fini ***************************');
										print('****************************************************');
										//dataBag.parser.isFinished = true;
										if(cliCallback != null){
											cliCallback();
										}
									}
								});


							});

							
						});
					});// async.parallel
				}				
	        });
		}
	})//Thingiverse.getThisFromRemote
}

function downloadScadFiles(files, thing_id, callback){
	logger.info('Fichier thingiverse.service.js | fonction downloadScadFiles');
	_.each(files, function(_id){
		
		File
		.findById(_id)
		.populate('_thing', 'id') // only return the things id
		.exec(function(err, file){
			
			if(utils.endsWith(file.name, 'scad')){
				file.downloadAndSave(callback);
			}
		});

	});
}

////////////////////////////////////////////////////////////////////////////////////
function isNumber(n) { return /^-?[\d.]+(?:e-?\d+)?$/.test(n); } 

exports.list = function(tag, page, callback){
	logger.info('Fichier thingiverse.service.js | fonction list');
	console.log('tag ' + tag)
	var skip = (page - 1 )* 20 ;
  	var opts = {skip : skip, limit : 20, sort:{modified:-1}};
  	if(isNumber(tag)){
  		var filter = {id:tag};
		var pops = 'tags categories files comments';
	  	Thing.findPaginated( filter, opts, pops, callback);// Thing
  	}else if(tag){
		var filter = { name: new RegExp('^'+tag+'$', "i") };
		var pops = '_thing';
		Tag.findPaginated(filter, opts, pops, function(err, rtns){
			print("totalCount : "+ rtns.totalCount);
			print("results.length : "+ rtns.results.length);
			
			var totalCount = rtns.totalCount;
			
			var inQuery = [];
			for(var i in rtns.results){
				var thing = rtns.results[i]._thing.id;
				inQuery.push(thing);
			}

			Thing.find().sort({modified:-1}).populate('tags categories files comments').where('id').in(inQuery).exec(function(err, rtn){
				var data = {
						totalCount:totalCount,
						results:rtn
				};
				callback(null, data);
			});
			//callback(null, rtns);
		});
	}else{
		var filter = {};
		var pops = 'tags categories files comments';
	  	Thing.findPaginated( filter, opts, pops, callback);// Thing
	}
};

exports.listByState = function(nbResults, state, callback){
	logger.info('Fichier thingiverse.service.js | fonction listByState');
	
	var pops = '_thing';
	var defaults = {skip : 0, limit : 50};

	if(isNumber(nbResults)){
		var opts = {limit : nbResults};
	}
	opts = _.extend({}, defaults, opts);

	if(state == 2 || state == 1) {
		var filter = {'isParsed': state};
	}

	filter = _.extend({}, filter);

	var cntQry = File.find(filter);
	var qry = File.find(filter).populate(pops);

	if (opts.fields) {
		qry = qry.select(opts.fields);
	}

	if (opts.sort) {
		qry = qry.sort(opts.sort);
	}

  qry = qry.limit(opts.limit).skip(opts.skip);

  async.parallel(
    [
      function (callback) {
        cntQry.count(callback);
      },
      function (callback) {
        qry.exec(callback);
      }
    ],
    function (err, results) {
      if (err) return callback(err);
      var count = 0, ret = [];

      _.each(results, function (r) {

        if (typeof(r) == 'number') {
          count = r;
        } else if (typeof(r) != 'number') {
          ret = r;
        }
      });

      callback(null, {totalCount : count, results : ret});
    }
  );

  return qry;

};

exports.stat = function(callback){
	logger.info('Fichier thingiverse.service.js | fonction stat');
	async.parallel([
		function(callback){
			File.find({name:/scad/, $or: [{isParsed:0, isParsed:2}]}).count().exec(callback);
		},
		function(callback){
			File.find({name:/scad/, isParsed:1}).count().exec(callback);
		},
		function(callback){
			File.find({name:/scad/, isParsed:-1}).count().exec(callback);
		},
		function(callback){
			File.find({name:/scad/}).count().exec(callback);
		},
	],
	function(err, results){
		if(err) throw err;
		console.log('results' + results);
		var data = {notParsed:results[2],
		            parsed:results[1],
		            failed:results[0],
		        	total:results[3]}
		callback(null, data);
	});
};

//////////////////////////////////////////////////////////////////////////////////
exports.reparse = function(mode, limit, filesize, callback){
	logger.info('Fichier thingiverse.service.js | fonction reparse');
	var query;
	if(mode === 'parseAllFailedFiles'){
		query = {name:/scad/, isParsed : 0, size : {$lt:filesize}};// 0 == failed
	}else if(mode === 'parseNotParsedFiles'){
		query = {name:/scad/, isParsed : -1, size : {$lt:filesize}};// -1 == not parsed
	}
	// collect targets
	File
	.find(query)
	.populate('_thing', 'id') // only return the things id
	.limit(limit)
	.exec(function(err, files){
		if(err){callback(err, null)}
		else
			callback(null, files);
			for(var i = 0 ; i < files.length ; i ++){
				parser.addTarget(files[i]);
			}
	});
}

exports.parseOneScad = function(callback){
	logger.info('Fichier thingiverse.service.js | fonction parseOneScad');
	File.findById(_id, function(err, file){
		if(err) callback(err, null);
		else
			if(file != null){
				//print(file.name + ' : ' + file.size)
				scadAnalyzer.parse(file, function(err, file){
					if(err) errHandler(_id + ' : ' + err);
					else{
						//print(file.stat)				
						file.save(function(err){
							if(err) errHandler(_id + ' : ' + err);
							callback(null, file.stat);
						});
					}				
				});//scadAnalyzer
			}else{callback({data:null}, null);}		
	})//findById
}

exports.distinctIncludedFiles = function(regExp, callback){
	logger.info('Fichier thingiverse.service.js | fonction distinctIncludedFiles');

	File.find({content:regExp}, function(err, files){
		if(err) callback(err, null);
		else
			var target = [];
			for(i in files){	
				var file = files[i];

				var lines = (file.content).split("\n");

				for (var i in lines){
					var line = lines[i];
					if(regExp.test(line)){
						//console.log(line)
						var obj = {id:file._id, name:file.name, line:line};
						target.push(obj);
					}
				}
			}
			var newTarget = _.uniq(target);
			callback(null, newTarget);
	});// find
}

/* Function export statistics at csv format */
exports.generateGlobalStatistics = function(idThing, idFile, callback) {
	logger.info('Fichier thingiverse.service.js | fonction generateGlobalStatistics');
	var pops = '_thing';
	if(idThing == 0) {
		var filter = {'isParsed': 1};
		var nameFile = 'tests/statisticsThings.csv';
	} else {
		var filter = {'isParsed': 1, 'id': idFile};
		var nameFile = 'tests/'+ idThing + '.csv';
	}
	filter = _.extend({}, filter);
	var defaults = {skip : 0};
	var fields = {fields : 'stat id'};
	var opts = _.extend({}, defaults, fields);
	var qry = File.find(filter).populate(pops);
	qry = qry.select(opts.fields);
	qry = qry.skip(opts.skip);
	async.parallel(
	[
		function (callback) {
			qry.exec(callback);
		}
	],
	function (err, results) {
		if (err) return callback(err);
		var count = 0;
		var arrayForCsv = [];
		_.each(results, function (r) {
			if (typeof(r) != 'number') {
				for(var i=0; i < r.length; i++ ){
					for(var j=0; j <r[i].stat.length; j++ ){
						//print(r[i].stat[j]);
						var lineForCsv = {};
						if(j==0) {
							lineForCsv['id'] = r[i].id;
						} else {
							lineForCsv['id'] = "";
						}			
						lineForCsv['globalArgCnt']  		= r[i].stat[j].globalArgCnt;
						lineForCsv['mostComplexFuncArgCnt'] = r[i].stat[j].mostComplexFuncArgCnt;
						lineForCsv['totalFuncCnt'] 			= r[i].stat[j].totalFuncCnt;
						lineForCsv['mostComplexModuleArgCnt'] = r[i].stat[j].mostComplexModuleArgCnt;
						lineForCsv['totalModuleCnt'] 		= r[i].stat[j].totalModuleCnt;
						//print(lineForCsv);
						arrayForCsv.push( lineForCsv);
					}
					
				}
			}
		});
		convertJson2Csv(arrayForCsv, nameFile, function() {
			callback();
		});
	});
}
//////////////////////////////////////////////////////////////////////////////////

function toObject(arr) {
  var rv = {};
  for (var i = 0; i < arr.length; ++i)
    if (arr[i] !== undefined) rv[i] = arr[i];
  return rv;
}

function print(msg){
	console.log(msg);
}

function handleError(title, err){
	console.log('!!! ' + title + ' : ' + err);
}

function convertJson2Csv(dataJson, nameFile, callback){
	//print(dataJson);
	json2csv({data: dataJson, fields: ['id', 'globalArgCnt', 'mostComplexFuncArgCnt', 'totalFuncCnt', 'mostComplexModuleArgCnt', 'totalModuleCnt']}, function(err, csv) {
		if (err) console.log(err);
		//console.log(csv);
		var fs = require('fs');
		fs.writeFile(nameFile, replaceAll("\"\"", "", csv), function(err) {
		if (err) throw err;
		console.log('file ' + nameFile + ' saved');
		callback();
		});
	});

}

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}