let router = require('express').Router();
let mongoose = require('mongoose')
let User = mongoose.model('User')
let auth = require('../auth')

router.param('username', function(req, res, next, username){
  User.findOne({username: username}).then(function(user){
    if(!user) { return res.sendStatus(404)}

    req.profile = user

    return next()
  }).catch(next)
})

router.get('/:username', auth.optional, function(req,res,next){
  if(req.payload){
    User.findById(req.payload.id).then(function(user){
      if(!user){ return res.json({profile: req.profile.toProfileJSONFor(false)})}

      return res.json({profile: req.profile.toProfileJSONFor(user)})
    })
  } else {
    return res.json({profile: req.profile.toProfileJSONFor(false)})
  }
})

module.exports = router
