let mongoose = require('mongoose');
let uniqueValidator = require('mongoose-unique-validator');
let crypto = require('crypto');
let jwt = require('jsonwebtoken');
let secret = require('../config').secrets;

let UserSchema = new mongoose.Schema({
  username: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true},
  email: {type: String, lowercase: true, unique: true, required: [true, "cant' be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true},
  bio: String,
  image: String,
  hash: String,
  salt: String
}, {timestamps: true});

UserSchema.methods.setPassword = (password) => {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.validPassword = (password) => {
  let hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
};

UserSchema.methods.generateJWT = () => {
  let today = new Date();
  let exp = new Date(today);
  exp.setDate(today.getDate() + 60);

  return jwt.sign({
    id:this._id,
    username: this.username,
    exp: parseInt(exp.getTime()/ 1000),
  }, secret);
};

UserSchema.methods.toAuthJSON = () => {
  return {
    username: this.username,
    email: this.email,
    token: this.generateJWT(),
    bio: this.bio,
    image: this.image
  };
};

UserSchema.plugin(uniqueValidator, {message: 'is already taken. Be more creative!'});

mongoose.model('User', UserSchema);
