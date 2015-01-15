var utils = require('./thingiverseUtils');
var scadAnalyzer = require('./openScadAnalyzer');
var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
    //  new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: 'logs.log' })
    ]
  });

function ParsingHelper(socketMsgHelper, job){

	var self = this;

	self.cliCallback;
	this.setCliCallback = function(_callback){
		self.cliCallback = _callback;
	}

	self.lock = false;
	self.isFinished = false;
	
	var targets = [];

	this.addTarget = function(file){
		targets.push(file);
		console.log('[PARSING TARGET ADDED] ' + file.name + ' : ' + file.id);
	}

	this.parse = function(){
		logger.info('Fichier ParsingHelper.js | fonction parse');
		self.lock = true;
		var file = targets.pop();
		console.log('[PARSING] ' + file.name + ' : ' + file.id);
		scadAnalyzer.parse(file, function(err, rtn){
			logger.info('Fichier ParsingHelper.js | fonction scadAnalyzer.parse');
			if(err){
				self.lock = false;
				console.log(err)
				socketMsgHelper.sendSocketMsg(job, {thing_id:file._thing.id, file_id:file.id, msg:'Failed'});
				file.isParsed = 0;// failed

				if(file.isParsed === 0){
					file.isParsed = 2; // failed twice
				}

				file.save(function(err, rtn){
					if   (err) return handleErr('ParsingHelper', err);
					return "failed"
				});
			}else{
				self.lock = false;
				socketMsgHelper.sendSocketMsg(job, {thing_id:file._thing.id, file_id:file.id, msg:'OK'});
				file.isParsed = 1;// success
				file.save(function(err, rtn){
					if   (err) return handleErr('ParsingHelper', err);
					return "success"
				})						
			}

		});// parsing
	};



	var interval;
	var counter = 0;
	this.startParsing = function(){
		logger.info('Fichier ParsingHelper.js | fonction startParsing');
		if(!self.lock){
			self.interval = setInterval( function() {

				if(!self.lock && targets.length > 0){
					self.parse();
				}

				if(self.cliCallback != undefined && targets.length == 0){
					clearInterval(self.interval);
					self.cliCallback();
				}
				
					// if(targets.length == 0){
					// 	counter++;
					// }else{
					// 	counter = 0;
					// 	self.parse();
					// }		
					// console.log(targets.length + ' files are left');
					// if(self.isFinished && counter > 10){
					// 	clearInterval(self.interval);
					// 	console.log(self.interval);
					// 	console.log('stoped parser');
					// }
					// if(counter > 5){
					// 	clearInterval(self.interval);
					// 	console.log(self.interval);
					// 	console.log('stoped parser');
					// }
							
			}, 5000);
		}else{
			console.log('Should wait the previous parser\'s ending.');
		}
	};
	// this.stopParsing = function(){
	// 	var interval2 = setInterval( function() {
	// 		if(targets.length == 0){
	// 			clearInterval(self.interval);
	// 			clearInterval(interval2);
	// 			console.log('stoped parser');
	// 		}
	// 	}, 1000);
	// };
}

exports.newParsingHelper = function(socketMsgHelper, job){
	logger.info('Fichier ParsingHelper.js | fonction newParsingHelper');
	return new ParsingHelper(socketMsgHelper, job);
}



function print(msg){
	console.log(msg);
}
function handleErr(title, err){
	console.log('!!! ERR --------------------\n '+ title + ' : ' + err + '\n------------------------');
}

