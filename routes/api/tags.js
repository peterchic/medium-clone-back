let router = require('express').Router()
let mongoose = require('mongoose')
let Article = mongoose.model('Article')

//this might not be putting the tags in order depending on how often they're used?
router.get('/', function(req, res, next) {
  Article.find().distinct('tagList').then(function(tags){
    return res.json({tags: tags});
  }).catch(next);
});

module.exports = router
