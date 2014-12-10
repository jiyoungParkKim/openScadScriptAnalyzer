OpenScadScriptAnalyzer
===
OpenScadScripAnalyzer is an app runtime based on nodejs. You can download things(scad files) from [www.thingiverse.com](www.thingiverse.com) and parse them with OpenScadScriptAnalyzer. This project is published on the [Docker](https://www.docker.com/) also.

##How to install ?

### Install Dependencies

* [Git](http://git-scm.com/) 
* [NodeJS](http://nodejs.org/) 
* [Npm](https://www.npmjs.org/) 
* [Bower](http://bower.io/)

### Install application

#### Using Git
Clone OpenScadScriptAnalyzer project and install it.

	$ git clone https://github.com/jiyoungParkKim/openScadScriptAnalyzer.git
	$ cd openScadScriptAnalyzer/
	$ sudo npm install
	$ bower install

**Database**
The project uses a mongo database to store the parsed things.
You can use [MongoDB](http://www.mongodb.org/) to host your database.
The database config file is in :

	server/config/environment/development.js

You may use our pre-filled database with this uri :
	
	148.60.11.195:27017/openscadanalyzer-dev

Or a docker database : see Docker section.

To launch the application, move to the project folder and run :

	$ npm start

#### Using [Docker](https://docs.docker.com/)
You can use Docker to simply run the application.

Pull the project and start the container

	$ sudo docker pull jiyoungparkkim/openscadscript-analyzer:0.1
	$ sudo docker run --name web -d -p 9000:9000 --link db:db jiyoungparkkim/openscadscript-analyzer:0.1
#####If you have already mongo installed, you may have to stop it.

Pull the database and start the container

	$ sudo docker pull jiyoungparkkim/mongodb_base:0.1
	$ sudo docker run -d -p 27017:27017 --name mongodb jiyoungparkkim/mongodb_base:0.1 mongod

##How to use it?

OpenscadAnalyzer offers a web interface that allow you to parse things extracted from [www.thingiverse.com](www.thingiverse.com).
A thing has a .scad file that contains a program to print this 3D object with a 3D printer.

There are 4 tabs in the interface :

* **Home** : Show a chart showing the number of downloaded, parsed and failled things
* [**Customizerble Things**](/doc/main.png) : List things by tags ( default : customizer)
* [**Download Things**](/doc/main2.png) : Allows yout to download more things. You need an access token to do this. Follow [this tutorial](http://www.thingiverse.com/developers/getting-started) to get one.
* [**Parse Things**](/doc/main3.png) : Parse a number of Things to extract data such as number of variables, functions, the depth of the file...

##How it works?

### Architecture

This project is separated in 2 sides :
* When you go on localhost:9000 on your browser that concern the **client side** of the repository
* When you write "npm start", that concern the **server side** of the repository.


### Project structure 


    openScadAnalyzer
     ├─ client             : client side - AngularJS
       ├─ app
         ├─ main           : main page (statistics)
         ├─ thingiverse    : main fonctions (batch jobs)
       ├─ components
         ├─ navbar         : menu
         ├─ socket         : socket.io client side conf
     ├─ server             : server side - Node.JS
       ├─ api
         ├─ thing          : main fonctions of server side
           ├─ model        : database models (mongoose(http://mongoosejs.com/) tech)
           ├─ openscadLib  : openscad libraries
       ├─ config           : server configurations
         ├─ environment    
           ├─ development.js : dev mode conf
           ├─ production.js  : production mode conf
         ├─ express.js     : express server conf
         ├─ socketio.js    : socket.io server side conf
       ├─ app.js           : main page ← entry point
       ├─ routes.js        : page routing conf 
      ├─ bower.json        : client side dependencies ( used by AngularJS)
      ├─ package.json      : server side dependencies ( used by Node.js)

### Client side

![Client schema](/doc/client.jpg "Client schema")

./client/app.js will load all the requirement for running the client side. 

1. browser’s requests will reach the index.html.
2. index.html call the controller ./client/app/main/main.controller.js.
3. the controller will send a GET request on localhost:9000/api/thingiverses/{param}

Here is the client architecture :

    ├─ app
      ├─ main				: Home page folder
      ├─ thingiverse			: Others page folder (contains views & controllers)
        ├─ batch.html           	: Download things page template
        ├─ parse.html           	: Parse things page template
        ├─ thingiverse.html     	: Thing list page template
        ├─ tingiverse.js        	: Routing conf of thingiverse module
        ├─ thingiverse.batch.controller.js   		: Controller of batch.html
        ├─ thingiverse.controller.js         		: Controller of main.html
        ├─ thingiverse.forceParsing.controller.js 	: Controller of parse.html
        ├─ tingiverse.service.js 	: Service class of thingiverse.controller.js
      ├─ app.js                  	: Angular module configulation client side
    ├─ components                	: Common components (navbar, modal)
    ├─ socket				: Client socket configuration

### Server side 

![Serveur schema](/doc/server.jpg "Serveur schema")

All the routes with /api/thingervses/ wiil reach the server side.

When you write the command “npm start”,  the first file launched will be ./server/app.js.
* app.js will load all the requirement to run the server side :
  * loading  index.js file and other routes 
    example : For the {param} “stat”, the route is :
    <code>router.get(‘/stat’, controller.stat)</code>
    That means the stat processing code is writen on controller.stat().
* Most files concerning the server side are stored in server/api/thing
* The controller of the server side is server/api/thing/thingiverse.controller.js
* The controller will require the service layer : server/api/thing/thingiverse.service.js. 

Here is the server architecture :

    ├─ api
      ├─ thing
        ├─ model			: Models JS folder (Category/Comment/File/Pagination/Tag/Thing)
        ├─ Commandline.js         	: Helper class for node execution in the client env (see TO DO list)
        ├─ DataBag.js             	: Helper class for thingiverse.service.js
        ├─ index.js               	: rounting conf
        ├─ openSadAnalyzer.js     	: Helper class for parsing - parse scadfiles(using openscad-openjscad-translator module) and make statistics data 
        ├─ parsingHelper.js       	: Helper class for parsing - save the result of parsing in the db
        ├─ requestHelper.js       	: Helper class for http request
        ├─ socketMsgHelper.js     	: Helper class for socket.io
        ├─ thingiverse.controller.js  	: Web controller contains actions functions
        ├─ thingiverse.dao.js         	: Data access class
        ├─ thingiverse.service.js     	: Download things from Thingiverse
        ├─ thigiveseUtils.js          	: Utils
        
# To do

* Implement a command line interface that is able to  :
  * Download things from the Thingiverse API
  * List :
    * Successfully parsed scads 
    * Fail scads + stacktrace
  * Generate a CSV containing :
    * A .scad file statistics
    * All scads statistics
* Write a test case for the statistic module
* Try to figure out while some files fail to parse
* Implement a parameter extractor for each thing (web and console interface)
* Implement a configurator (web and console interface)
 
## Bugs & known issues

* Some scad files aren't correctly parsed.
* Bower isn't executed after npm post-installation
* Some scad statistics are false (and the 2 last columns are empty)

## FAQ

### What is the project licence ?
 
 This project has a double open source licence : 
* [Apache Software License 2.0 ("ASL")](http://www.apache.org/licenses/LICENSE-2.0)
* [jOOQ License and Maintenance Agreement ("jOOQ License")](http://www.jooq.org/legal/licensing)
See the licence file

### What are the used technologies ?

* [**GIT :**](http://git-scm.com/) is a distributed revision control system
* [**MongoDB :**](http://www.mongodb.org/) is an open-source document and NoSQL database. Written in C++
* [**Docker :**](https://www.docker.com/whatisdocker/) is an open platform for developers and sysadmins to build, ship, and run distributed applications
* [**Bower :**](http://bower.io/) manage your front-end dependencies
* [**Npm :**](https://www.npmjs.org/) is a command-line utility for interacting with said repository that aids in package installation, version management, and dependency management
* [**Grunt :**](http://gruntjs.com/) Automating front-end and JavaScript workflow tasks 
* [**Node :**](http://nodejs.org/) is an open source, cross-platform runtime environment for server-side and networking applications
* [**Angular :**](https://angularjs.org/)  This project is made with * ['angular-fullstack'](https://github.com/DaftMonk/generator-angular-fullstack) generator of [Yeoman](http://yeoman.io)

### How can I have a token access ?

To download things from thingiverse.com you need to have a access token from the developer site.
Follow [this tutorial](http://www.thingiverse.com/developers/getting-started) to get your access token.

### Can I use Docker only to host the database ?

Yes of course.
Just run <code>$ sudo docker run -d -p 27017:27017 --name mongodb jiyoungparkkim/mongodb_base:0.1 mongod</code> and 
edit the database adress in <code>server/config/environment/development.js</code> to localhost:27017/openscadanalyzer-dev


