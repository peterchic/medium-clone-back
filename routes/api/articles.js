var router = require('express').Router();
var passport = require('passport');
var mongoose = require('mongoose');
var Article = mongoose.model('Article');
var User = mongoose.model('User');
var auth = require('../auth');

router.post('/', auth.required, function(req, res, next){
  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401)}

    let article = new Article(req.body.article)

    article.author = user
    return article.save().then(function(){
      console.log(Article.author)
    return res.json({article: article.toJSONFor(user)});
    })
  }).catch(next)
})

router.param('article', function(req, res, next, slug){
  Article.findOne({slug: slug})
  .populate('author')
  .then(function(article){
    if(!article) {return res.sendStatus(404)}

    req.article = article

    return next()
  }).catch(next)
})

router.get('/:article', auth.optional, function(req, res, next) {
  Promise.all([
    req.payload ? User.findById(req.payload.id) : null,
    req.article.populate('author').execPopulate()
  ]).then(function(results){
    let user = results[0]

    return res.json({article: req.article.toJSONFor(user)})
  }).catch(next)
})

router.put('/:article', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if(req.article.author._id.toString() === req.payload.id.toString()){
      if(typeof req.body.article.title !== 'undefined'){
        req.article.title = req.body.article.title;
      }

      if(typeof req.body.article.description !== 'undefined'){
        req.article.description = req.body.article.description;
      }

      if(typeof req.body.article.body !== 'undefined'){
        req.article.body = req.body.article.body;
      }

      req.article.save().then(function(article){
        return res.json({article: article.toJSONFor(user)});
      }).catch(next);
    } else {
      return res.sendStatus(403);
    }
  });
});

router.delete('/:article', auth.required, function(req, res, next){
  User.findById(req.payload.id).then(function(){
    if(req.artcile.author._id.toString() === req.payload.id.toString()){
      return req.article.remove().then(function(){
        return res.sendStatus(204)
      })
    } else {
      return res.sendStatus(403)
    }
  })
})

module.exports = router;
