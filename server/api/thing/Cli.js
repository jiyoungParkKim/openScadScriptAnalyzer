var cliSupport = require('./Commandline');
var requestHelper = require('./requestHelper');
var readline = require('readline'),
    rl = readline.createInterface(process.stdin, process.stdout),
    r2;

/*var promptText = "Please select one\n"+
				"   1. Download things\n"+
				"   2. List parsed scad files\n"+
				"   3. List failed scad files\n"+
				"   4. List by tag\n"+
				"   5. Generate global statistics\n"+
				"   6. Generate specific file statistics\n"+
				"   7. Parse scad files\n"+
				"   8. Parse failed files\n"+
				"   9. Parse one scad file\n"+
				"  10. Test statistics\n\n";

rl.setPrompt(promptText);
rl.prompt();
rl.setPrompt("> ");
rl.prompt();*/

rl.write("Please select one\n"+
		"   1. Download things\n"+
		"   2. List parsed scad files\n"+
		"   3. List failed scad files\n"+
		"   4. List by tag\n"+
		"   5. Generate global statistics\n"+
		"   6. Generate specific file statistics\n"+
		"   7. Parse scad files\n"+
		"   8. Parse failed files\n"+
		"   9. Parse one scad file\n"+
		"  10. Test statistics\n"+
		"  11. Test extractor\n");

rl.setPrompt("> ");
rl.prompt();
rl.on('line', function(line) {
	rl.close();
	r2 = readline.createInterface(process.stdin, process.stdout);
	r2.on('close', function() {
		console.log('Have a great day!');
		process.exit(0);
	});
    switch(parseInt(line)) {
    case 0:
    	cliSupport.closeDB();
    break;
   	// Download things from Thingiverse
   	// Need an access token
    case 1:
    	// Ask for access token
		checkme(function(){
			// Ask for limit size and tag
			getParams(r2, ['Tag','Limit'], function(prompts, data){
				cliSupport.batch(data[prompts[0]], data[prompts[1]], function(){
					cliSupport.closeDB();
					r2.close();
				});
			});
		});
		break;
    case 2:
    	getParams(r2, ['Limit'], function(prompts, data){
			cliSupport.listByState(data[prompts[0]], 1, function(files){
				for(index in files.results){
					print('#' + files.results[index].id + '\t' + files.results[index].name);
				}
				print('Total parsed scad : ' + files.totalCount);
				r2.close();
			});
		});
      	break;
    case 3:
    	getParams(r2, ['Limit'], function(prompts, data){
			cliSupport.listByState(data[prompts[0]], 2, function(files){
				for(index in files.results){
					print('#' + files.results[index].id + '\t' + files.results[index].name);
				}
				print('Total failed scad : ' + files.totalCount);
				r2.close();
			});
		});
      	break;
    case 4:
		getParams(r2, ['Tag','Page'], function(prompts, data){
			cliSupport.list(data[prompts[0]], data[prompts[1]], function(things){
				for(index in things.results){
					print('thing : ' + things.results[index].name);
				}
				print('totalCount : ' + things.totalCount);
				r2.close();
			});
		});
      	break;
	case 5:
		cliSupport.generateGlobalStatistics(0, 0, function(){
			r2.close();
		});
      	break;
	case 6:
		getParams(r2, ['IdThing'], function(prompts, data){
			cliSupport.list(data[prompts[0]],1, function(things){
				for(index in things.results[0].files) {
					if(things.results[0].files[index].isParsed == 1) {
						cliSupport.generateGlobalStatistics(things.results[0].id, things.results[0].files[index].id, function(){
							r2.close();
						});
					}
				}
				
			});
		});
		break;
	case 7:
    	cliSupport.parseNotParsedFiles(-1, function(){
    		cliSupport.closeDB();
    		r2.close();
    	});
		break;
	case 8:
    	cliSupport.parseNotParsedFiles(0, function(){
    		cliSupport.closeDB();
    		r2.close();
    	});
		break;
	case 9:
		r2.question('target _id?', function(_id) {
	    	cliSupport.parseOneScad(_id, function(){
	    		r2.close();
	    	});
		});
		break;
	case 10:
		var variable;
		getFile(r2,function(success, data){	
			
			//si une erreur s'est produite
			if(!success){
				print("Invalid file".red);
				r2.close();
			}else{

				//get user file
				var file = JSON.parse(data);

				//get corresponding thing
				cliSupport.list(file.id,1, function(things){

					if(things.totalCount == 0){
						print("No thing found".red);
						r2.close();
					}else{						

						//running test
						cliSupport.testStats(things.results[0],file, function(){
							r2.close();
						});

					}

				});
			}
			
		});
      	break;

	case 11:
		var variable;
		getFile(r2,function(success, data){	
			
			//si une erreur s'est produite
			if(!success){
				print("Invalid file".red);
				r2.close();
			}else{

				//get user file
				var testFile = JSON.parse(data);

				//get corresponding thing
				cliSupport.list(testFile.id,1, function(things){

					if(things.totalCount == 0){
						print("No thing found".red);
						r2.close();
					}else{		
	
						var file = null;

						//loof for .scad file
						for (var i = 0; i < things.results[0].files.length; i++) {
							if(things.results[0].files[i].isParsed === 1){
								file = things.results[0].files[i].content;
								break;
							}
						};

						if(file != null){
							//running test
							cliSupport.testExtractor(file,testFile, function(){
								r2.close();
							});

						}else{
							print("This thing is not parsed".yellow);
							r2.close();
						}

					}

				});
			}
			
		});
      	break;

    default:
     	break; 
  }
  //rl.prompt();
}).on('close', function() {
  //console.log('Have a great day!');
  //process.exit(0);
});


/*

var promptText = "Please select one\n1. list by tag\n2. batch\n3. statistics\n"+
				 "4. find scad files which have 'use' keyword\n5. find scad files which have 'include' keyword\n" +
				 "6. parse scad files\n7. parse failed files\n8. parse one scad file\n\9. extract scad files\n";

rl.setPrompt(promptText);
rl.prompt();

rl.on('line', function(line) {
    switch(parseInt(line)) {
    case 1:
		getParams(rl, ['Tag','Page'], function(prompts, data){
			cliSupport.list(data[prompts[0]], data[prompts[1]], function(things){
				for(index in things.results){
					print('thing : ' + things.results[index].name);
				}
				print('totalCount : ' + things.totalCount);
				rl.close();
			});
		});
      	break;
    case 2:
    	checkme(function(){
			getParams(rl, ['Tag','Limit'], function(prompts, data){
				cliSupport.batch(data[prompts[0]], data[prompts[1]], function(){
					cliSupport.closeDB();
					rl.close();
				});
			});
		});
		break;
    case 3:
    	cliSupport.statistics(function(){
    		rl.close();
    	});
		break;
	case 4:
    	cliSupport.distinctIncludedFiles(/use <([^>]*)>;?/, function(){
    		rl.close();
    	});
		break;
	case 5:
    	cliSupport.distinctIncludedFiles(/include <([^>]*)>;?/, function(){
    		rl.close();
    	});
		break;
	case 6:
    	cliSupport.parseNotParsedFiles(-1, function(){
    		cliSupport.closeDB();
    		rl.close();
    	});
		break;
	case 7:
    	cliSupport.parseNotParsedFiles(0, function(){
    		cliSupport.closeDB();
    		rl.close();
    	});
		break;
	case 8:
		rl.question('target _id?', function(_id) {
	    	cliSupport.parseOneScad(_id, function(){
	    		rl.close();
	    	});
		});
		break;
	case 9:
		
		rl.question('mode? (1 : extract parsed scad files , 0 : extract parsing failed files)', function(mode){
			if(mode < 0 || mode > 1){
			  console.log('Saisir 0 ou 1');
			  rl.prompt();
			}else{
			  cliSupport.extractScadFiles(mode, function(){
				rl.close();
			  });
			}
		});
		break;
	case 10:
    		cliSupport.closeDB();
    		break;
    	default:
     	break;
    
  }
  rl.prompt();
}).on('close', function() {
  console.log('Have a great day!');
  process.exit(0);
});*/

function checkme(callback){
	r2.question('Access Token > ', function(token) {
		requestHelper.checkme(token, function(err, me){
			if(err) {
				checkme(callback);
			}else{
				print('Hello ' + me.full_name)
				requestHelper.setAccessToken(token);
				callback();
			}
		});
	});
}


function getParams(r2, prompts, callback){
	var p = 0,
	data = {};
	var get = function() {
		  	r2.setPrompt(prompts[p] + '> ');
		  	r2.prompt();  
			p++
		};
	get();
	r2.on('line', function(line) {

	  	data[prompts[p - 1]] = line;
	  	//print(data[prompts[p - 1]]);
		if(p === prompts.length) {
			return callback(prompts,data);
		}else{
			get();
		}
	});
}

function getFile(r2,callback){
	
	var fs = require("fs");
  	r2.setPrompt("Filename > ");
  	r2.prompt();  

	r2.on('line', function(line) {
		var content = "";
		print("Open "+'server/api/thing/test/'+	line);

		fs.readFile('server/api/thing/test/'+	line, function (err, data) {

		    if (err) 
		    	return callback(false, err);
			else 
				return callback(true, data.toString());	

		});

	});
}


function print(msg){
	console.log(msg);
}






