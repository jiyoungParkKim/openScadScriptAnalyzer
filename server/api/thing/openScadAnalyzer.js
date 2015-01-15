var requirejs = require('requirejs');

var config = require('../../config/environment');
var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
    //  new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: 'logs.log' })
    ]
  });

requirejs.config({
    baseUrl: config.root + '/node_modules/openscad-openjscad-translator/src',
    paths: {
		lib: config.root + '/node_modules/openscad-openjscad-translator/lib'
	},
    nodeRequire: require
});

requirejs(["async", "path", "fs", "openscad-parser", "Globals", "openscad-parser-support", "lib/underscore"], 
function(async, path, fs, parser, Globals, parser_support) {

//exports.targets = [];


exports.parse = function(file, callback){
	logger.info('Fichier openScadAnalyzer.js | fonction parse --- beginning');
	try{	
		file.isParsed = 0;
		// init
		parser.yy = {};
		if(file.stat.length > 0){
			file.context = {};
			file.stat.splice(0,file.stat.length);
		}
		logger.info('Fichier openScadAnalyzer.js | fonction parse --- Preparse - file.content');
		var openSCADText = Globals.preParse(file.content);
		openSCADText = mergeFiles(openSCADText);// use, include files

		textFile = file.content;

		//array that contains all the sliders
		//contains all parameters in an object
      file.thingParams = {};
      file.thingParams.sliders = [];
      file.thingParams.dropdown = [];
      file.thingParams.imageToSurface = [];
      file.thingParams.imageToArray = [];
      file.thingParams.polygons = [];

      //regexp
      var sliders = /(\w*)\s*=\s*(\d)*;\s*\/\/\s*\[(\d*):(\d*)\]/g; 
      var dropdown = /(\w*)\s*=\s*(\d)*;\s*\/\/\s*\[([\d*|\s|,]*)\]/g;
      var imgToSurface = /(.*)\s*=\s*\"+(.*)\"+;\s*\/\/\s*\[image_surface:(\d*)x(\d*)]/g; 
      var imgToArray = /(.*)\s*=\s*(\[.*\]);\s*\/\/\s*\[image_array:(\d*)x(\d*)]/g; 
      var polygons = /(\w*)\s*=\s*\[\s*(\[.*]\s*]\s*),\[\s*(\[.*]\s*)\s*]\s*];\s*\/\/\s*\[draw_polygon:(\d*)x(\d*)\]/g;

      var m;
      var i = 0;

      while ((m = sliders.exec(textFile)) != null) {
          if (m.index === sliders.lastIndex) {
              sliders.lastIndex++;
          }
          if(m.index){
            file.thingParams.sliders[i] = { name : m[1], min : m[2], def : m[3], max : m[4]};
            i++;
          }
      }

      i = 0;

      while ((m = dropdown.exec(textFile)) != null) {
          if (m.index === dropdown.lastIndex) {
              dropdown.lastIndex++;
          }
          if(m.index){
            file.thingParams.dropdown[i] = { name : m[1], def : m[2], values : JSON.stringify(m[3].split(","))};
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
              name : m[1], 
              file : m[2], 
              width : m[3],
              height : m[4]
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
              name : m[1], 
              points : JSON.stringify(m[2].split(",")), 
              paths : m[3],
              cols : m[4]
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
              name : m[1], 
              array : m[2], 
              rows : m[3],
              width : m[4],
              height : m[5]
            };
            i++;
          }
      }



      //display result
      console.log(file.thingParams);


		logger.info('Fichier openScadAnalyzer.js | fonction parse --- parser.parse');
		var openJSCADResult = parser.parse(openSCADText);
		
		// init parser
		parser.yy.context  = {};
		parser.yy = {};

		logger.info('Fichier openScadAnalyzer.js | fonction parse --- init parser ');
		var context = openJSCADResult.context;

		// Circular reference 
		var cache = [];
		logger.info('Fichier openScadAnalyzer.js | fonction parse --- context contains :  '+context);
		var toto = JSON.stringify(context, function(key, value) {
		    if (typeof value === 'object' && value !== null) {

		        if (cache.indexOf(value) !== -1) {
		            // Circular reference found, discard key
		            return;
		        }
		        // Store value in our collection
		        cache.push(value);
		    }
		    return value;
		});
		cache = null; // Enable garbage collection
		

		context = toto.replace(/\$/gi, "_");
		file.context = JSON.parse(context);
		file.isParsed = 1;// parsig success 
		logger.info('Fichier openScadAnalyzer.js | fonction parse  --- File parsed');
		analyseAllContext(file.context, file, function(err, rtn){
			logger.info('Fichier openScadAnalyzer.js | fonction parse  --- analyseAllContext');
			callback(null, rtn);	
		});
		

	}catch(err){
		console.log(openSCADText);
		console.log(file._id + ' failed' + err);
		file.isParsed = 0;
		logger.info('Fichier openScadAnalyzer.js | fonction parse  --- Parse failed');
		callback(err, file);
	}
}

function mergeFiles(openSCADText){
	logger.info('Fichier openScadAnalyzer.js | fonction mergeFiles');
	var lines = openSCADText.split("\n");

	for (var i in lines){
		var line = lines[i];

		lines[i] = line.replace(/include <([^>]*)>;?/, function(match, p1, offset, string) {
			console.log('include match 1 : ' + match);

			var includedModuleText = fs.readFileSync(getLibFile(p1), "UTF8");
			includedModuleText = Globals.preParse(includedModuleText);
			return includedModuleText;
		});

		lines[i] = line.replace(/use <([^>]*)>;?/, function(match, p1, offset, string) {
			console.log('use match 1 : ' + match);
			/*
			match : use <MCAD/fonts.scad>
			p1 : MCAD/fonts.scad
			offset : 0
			string : use <MCAD/fonts.scad>
			*/				
			var usedModuleText = fs.readFileSync(getLibFile(p1), "UTF8");
			usedModuleText = Globals.preParse(usedModuleText);
			var usedModuleResult = parser.parse(usedModuleText);

			parser.yy.context = usedModuleResult.context;
			
			return match;
		});
	}

	return lines.join('\n');
}

/*
	build_plate.scad
	write.scad
	pins.scad

	MCAD/*.scad
	shapes.scad --> MCAD

	MCAD/fonts.scad
 */
function getLibFile(fileName){
	logger.info('Fichier openScadAnalyzer.js | fonction getLibFile');
	var basename = config.root + '/server/api/thing/openscadLib/' + fileName;
	if(fs.existsSync(basename)){
 		console.log('[FOUND] ' +basename);
		return basename;
	}else{
		basename = config.root + '/server/api/thing/openscadLib/' + path.basename(fileName);
		if(fs.existsSync(basename)){
			console.log('[FOUND] ' +basename);
			return basename;
		}
	}
	console.log(basename + ' not found');
	return basename;
}


function analyseAllContext(context, file, callback){
	logger.info('Fichier openScadAnalyzer.js | fonction analyseAllContext  --- Beginning');
	if(context.parentContext == undefined){
		logger.info('Fichier openScadAnalyzer.js | fonction analyseAllContext  ---  end calblback null');
		callback(null, file);
	}else{
		logger.info('Fichier openScadAnalyzer.js | fonction analyseAllContext  ---  call analyseContext');
		file.stat.push(analyseContext(context));
		analyseAllContext(context.parentContext, file, callback);
	}
}

/*

totalFuncCnt
totalModuleCnt
mostComplexFuncArgCnt;
mostComplexModuleArgCnt;

*/

function analyseContext(context){
	logger.info('Fichier openScadAnalyzer.js | fonction analyseContext  ---   beginning');
	var totalModuleCnt = 0;
	var mostComplexModuleArgCnt = 0;
	var totalFuncCnt = 0;
	var mostComplexFuncArgCnt = 0;
	var globalArgCnt = 0;
	
	var modules_p = context.modules_p;
	if(modules_p != undefined){
		if(modules_p.length > 0){
			totalModuleCnt = modules_p.length;
			for(var i = 0 ; i < totalModuleCnt ; i ++){
				var module = modules_p[i];
				var name = module.name;
				var argCnt = module.argexpr.length;
				if(mostComplexModuleArgCnt < argCnt){
					mostComplexModuleArgCnt = argCnt;
				}
				
			}
		}
	}
	
	
	var functions_p = context.functions_p;
	if(functions_p != undefined){
		for(key in functions_p){
			totalFuncCnt++;
			var f = functions_p[key];
			//console.log(f.argnames)
			if(mostComplexFuncArgCnt < f.argnames.length){
				mostComplexFuncArgCnt = f.argnames.length;
			}
		}
	}
	

	var vars = context.vars;	
	if(functions_p != undefined){
		for(key in vars){
			globalArgCnt++;
		}
	}
	logger.info('Fichier openScadAnalyzer.js | fonction analyseContext  ---   totalModuleCnt ' + totalModuleCnt + ' \n mostComplexModuleArgCnt' + mostComplexModuleArgCnt+ ' \n totalFuncCnt' + totalFuncCnt+ ' \n mostComplexFuncArgCnt' + mostComplexFuncArgCnt + ' \n globalArgCnt' + globalArgCnt + ' \n ');
	logger.info('Fichier openScadAnalyzer.js | fonction analyseContext  ---   end with result');

	return {
		totalModuleCnt : totalModuleCnt, 
		mostComplexModuleArgCnt : mostComplexModuleArgCnt,
		totalFuncCnt : totalFuncCnt,
		mostComplexFuncArgCnt : mostComplexFuncArgCnt,
		globalArgCnt : globalArgCnt
	}
}

});