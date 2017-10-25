var router = require('express').Router();
var passport = require('passport');
var mongoose = require('mongoose');
var Article = mongoose.model('Article');
var Comment = mongoose.model('Comment');
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

// how to favorite an article
router.post('/:article/favorite', auth.required, function(req,res, next) {
  let articleId = req.article._id

  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401)}

    return user.favorite(articleId).then(function(){
      return req.article.updateFavoriteCount().then(function(article){
        return res.json({article: article.toJSONFor(user)})
      })
    })
  }).catch(next)
})

router.delete('/:article/favorite', auth.required, function(req, res, next){
  let articleId = req.article._id

  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401)}

    return user.unfavorite(articleId).then(function(){
      return req.article.updateFavoriteCount().then(function(article){
        return res.json({article: article.toJSONFor(user)})
      })
    })
  }).catch(next)
})

router.post('/:article/comments', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if(!user){return res.sendStatus(401)}

    let comment = new Comment(req.body.comment)
    comment.article = req.article
    comment.author = user

    return comment.save().then(function(){
      req.article.comments.push(comment)

      return req.article.save().then(function(article) {
        res.json({comment: comment.toJSONFor(user)})
      })
    })
  }).catch(next)
})

router.get('/:article/comments', auth.optional, function(req, res, next){
  Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(function(user){
    return req.article.populate({
      path: 'comments',
      populate: {
        path: 'author'
      },
      options: {
        sort: {
          createdAt: 'desc'
        }
      }
    }).execPopulate().then(function(article) {
      return res.json({comments: req.article.comments.map(function(comment){
        return comment.toJSONFor(user);
      })});
    });
  }).catch(next);
});

//before we can create DELETE route, we'll need a router param milldeware for resolvin /:comment in our URL ?? research this
router.param('comment', function(req, res, next, id){
  Comment.findById(id).then(function(comment){
    if (!comment) { return res.sendStatus(404)}
    req.comment = comment

    return next()
  }).catch(next)
})

router.delete('/:article/comments/:comment', auth.required, function(req, res, next){
  if(req.comment.author.toString() === req.payload.id.toString()){
    req.article.comments.remove(req.comment._id)
    req.article.save()
      .then(Comment.find({_id: req.comment._id}).remove().exec())
      .then(function(){
        res.sendStatus(204)
      })
  } else {
    res.sendStatus(403)
  }
})

router.get('/', auth.optional, function(req, res, next) {
  let query = {}
  let limit = 20
  let offset = 0

  if(typeof req.query.limit !== 'undefined'){
    limit = req.query.limit
  }

  if(typeof req.query.offset !== 'underined'){
    offset = req.query.offset
  }

  if(typeof req.query.tag !== 'undefined'){
    query.tagList = {"$in" : [req.query.tag]}
  }

  Promise.all([
    req.query.author ? User.findOne({username: req.query.author}) : null,
    req.query.favorited ? User.findOne({username: req.query.favorited}) : null
  ]).then(function(results){
    let author = results[0]
    let favoriter = results[1]

    if(author){
      query.author = author._id //where is author._id coming from?
    }

    if(favoriter){
      query._id = {$in: favoriter.favorites}
    } else if(req.query.favorited){
      query._id = {$in: []}
    }

    return Promise.all([
      Article.find(query)
        .limit(Number(limit))
        .skip(Number(offset))
        .sort({createdAt: 'desc'})
        .populate('author')
        .exec(),
      Article.count(query).exec(),
      //When the user is signed out, we use null as the last value in the array of promises passed to Promise.all(), which will resolve the last value to null in the array passed to our .then handler. ****RESEARCH****
      req.payload ? User.findById(req.payload.id) : null,
    ]).then(function(results){
      let articles = results[0]
      let articlesCount = results[1]
      let user = results[2]

      return res.json({
        articles: articles.map(function(article){
          return article.toJSONFor(user)
        }),
        articlesCount: articlesCount
      })
    })
  }).catch(next)
})

router.get('/feed', auth.required, function(req, res, next){
  let limit = 20
  let offset = 0

  if(typeof req.query.limit !== 'undefined'){
    limit = req.query.limit
  }

  if(typeof req.query.offset !== 'undefined'){
    offset = req.query.offset
  }

  User.findById(req.payload.id).then(function(user){
    if (!user) {return res.sendStatus(401)}

    Promise.all([
      Article.find({ author: {$in: user.following}})
        .limit(Number(limit))
        .skip(Number(offset))
        .populate('author')
        .exec(),
      Article.count({ author: {$in: user.following}})
    ]).then(function(results){
      let articles = results[0]
      let articlesCount = results[1]

      return res.json({
        articles: articles.map(function(article){
          return article.toJSONFor(user)
        }),
        articlesCount: articlesCount
      })
    }).catch(next)
  })
})

module.exports = router;
