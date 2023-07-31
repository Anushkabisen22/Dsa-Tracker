require('dotenv').config();
const express=require('express');
const bodyParser=require('body-parser');
const ejs=require('ejs');
const mongoose=require('mongoose');

const passport=require('passport');
const passportLocalMongoose=require('passport-local-mongoose');
const session=require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy; 
const findOrCreate=require('mongoose-findorcreate');

const app=express();
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(session({
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect(process.env.URL);

const reviewSchema=new mongoose.Schema({
  name:String,
  designation:String,
  comment:String
})
const quesSchema=new mongoose.Schema({
  question:String,
  url:String,
  check:String
})
const Ques=mongoose.model("Ques",quesSchema);
const Review=mongoose.model('Review',reviewSchema);
let c;
Ques.find()
    .exec()
    .then((results)=>{
        c=results;
    })
const dataSchema=new mongoose.Schema({
    username:{
      type:String,
      default:"new user"
    },
    password:{
      type:String,
    },
    googleId:String,
    review:reviewSchema,
    ques:{
      type:[quesSchema],
      default:function(){
        Ques.find()
        .exec()
        .then((results)=>{
            c=results;
        })
        return c; 
      }
    }
    
})
dataSchema.plugin(passportLocalMongoose);
dataSchema.plugin(findOrCreate);
const Data=mongoose.model("Data",dataSchema);
passport.use(Data.createStrategy());
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });
  passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/track",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    Data.findOrCreate({ googleId: profile.id, username:profile.displayName}, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get('/',function(req,res){
  Data.find({review:{$ne:null}})
  .exec()
  .then((results) => {
       if(results.length>3){
        let x=[results[results.length-1],results[results.length-2],results[results.length-3]]
        res.render('index',{list:x});
       }
       else{
        res.render('index',{list:results});
       }
       
  })
})
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);
app.get('/auth/google/track', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/people');
});
app.get('/review',function(req,res){
  res.render('review');
})
app.post('/review',function(req,res){
  let a=req.body.name;
  let b=req.body.desig;
  let c=req.body.comment;
  let d=req.user.id;
  let doc=new Review({
    name:a,
    designation:b,
    comment:c
  })
  Data.updateOne({ _id: d }, { review:doc})
.then((result) => {
  res.redirect('/people');
})
})
app.get("/people",function(req,res){
    console.log(req.user.id);
    if(req.isAuthenticated()){
      Data.find({_id:req.user.id})
      .exec()
      .then((results) => {
        // console.log(results[0].ques);
        res.render('people',{name:req.user.username ,item:results[0].ques});
      })
  }
  else{
      res.redirect('/login');
  }
})
app.post('/delete',function(req,res){
  Data.updateOne({_id:req.user.id,ques:{$elemMatch:{_id:req.body.id}}},{$set:{"ques.$.check":'d'}})
  .exec()
  .then((result)=>{
    console.log(result);
    res.redirect('/people');
  })

})
app.post('/register',function(req,res){
    Data.register({username:req.body.username},req.body.password,function(err,user){
     if(err){
         res.redirect('/register');
     }
     else{
         passport.authenticate('local')(req,res,function(){
             res.redirect('/people');
         })
     }
    })
})
app.get('/logout', function(req, res){
  req.logout(function(err) {
    if (err) {
      console.error(err);
      return res.redirect('/'); 
    }
    res.redirect('/'); 
  });
});
app.post('/login',function(req,res){
    const doc=new Data({
        username:req.body.username,
        password:req.body.password
    })
    req.login(doc,function(err){
             if(err){
                console.log(err);
             }
             else{
                passport.authenticate('local')(req,res,function(){
                    res.redirect('/people');
                })
             }
    })
})
app.get('/login',function(req,res){
     res.render('login');
})
app.get('/register',function(req,res){
    res.render('register');
})
app.listen(3000,function(req,res){
    console.log("done");
})
