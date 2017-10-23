let mongoose = require('mongoose')
let uniqueValidator = require('mongoose-unique-validator')
let slug = require('slug')

let ArticleSchema = new mongoose.Schema({
  slug: {type: String, lowercase: true, unique: true},
  title: String,
  description: String,
  body: String,
  favoritesCount: {type: Number, default: 0},
  tagList: [{ type: String}],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {timestamps: true})

ArticleSchema.plugin(uniqueValidator, {message: 'is already taken'})

ArticleSchema.methods.slugify = function() {
  this.slug = slug(this.title) + '-' + (Math.random() * Math.pow(36, 6) | 0).toString(36)
}

ArticleSchema.pre('validate', function(next){
  if(!this.slug){
    this.slugify()
  }
  next() //what does this next() do?
})

ArticleSchema.methods.toJSONFor = function(user){
  return {
    slug: this.slug,
    title: this.title,
    description: this.description,
    body: this.body,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    tagList: this.tagList,
    favoritesCount: this.favoritesCount,
    author: this.author.toProfileJSONFor(user)
  }
}

mongoose.model('Article', ArticleSchema)
