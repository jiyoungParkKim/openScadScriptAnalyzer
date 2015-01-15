'use strict';

var express = require('express');
var controller = require('./thingiverse.controller');
var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
    //  new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: 'logs.log' })
    ]
  });
var router = express.Router();

// router.get('/', controller.index);
// router.get('/:id', controller.show);
// router.post('/', controller.create);
// router.put('/:id', controller.update);
// router.patch('/:id', controller.update);
// router.delete('/:id', controller.destroy);

router.post('/checkme', controller.checkme);
router.get('/getAccessToken', controller.getAccessToken);


router.get('/batch/:tag', controller.batch);
router.get('/batch/:tag/:limite', controller.batch);
router.get('/list/:page', controller.list);
router.get('/list/:tag/:page', controller.list);
router.get('/stat', controller.stat);

router.get('/reparse/:mode/:limite/:filesize', controller.reparse);

router.get('/parseOneScad', controller.parseOneScad);
router.get('/getComplexScadListWithUseKey', controller.getComplexScadListWithUseKey);
router.get('/getComplexScadListWithIncludeKey', controller.getComplexScadListWithIncludeKey);
module.exports = router;