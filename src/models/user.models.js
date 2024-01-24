import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt, { hash } from "bcrypt"

const userSchema = new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        index:true,
        trim:true 
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true 
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String, //cloudnary url
        required:true
    },
    coverImage:{
        type:String //cloudnary url
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
    ], 
    password:{
        type:String,
        required:[true, "Password is required"]
    },
    refreshToken:{
        type:String
    }
    
}, {timestamps:true});

userSchema.pre("save", async function (next){
    if(!this.isModified("pasword")) return next(); //if password is not midified 
    this.password = bcrypt.hash(this.password, 10); // Encrypt the password
    next();
})

userSchema.methods.isPasswordCorrect(async function(password){//it is a custom method
    return bcrypt.compare(password, this.password); //compare the stored password and entered password, at the time of logged in
})

userSchema.methods.generateAccessToken(function(){ //Generate Access Token
    return jwt.sign({
        _id:this._id,
        email:this.email,
        fullName:this.fullName,
        username:this.username
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    })
})

userSchema.methods.generateRefreshToken(function(){
    jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
})

export const User = mongoose.model("User", userSchema);