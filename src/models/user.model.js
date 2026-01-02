import mongoose, { Schema } from "mongoose";
import bcrypt, { compare } from 'bcrypt'
import { JsonWebTokenError } from "jsonwebtoken";
import jwt from 'jsonwebtoken'

const userSchema = new mongoose.Schema({
    userName :{
        type : String,
        required : true,
        unique : true,
        trim : true,
        index : true
    },
    email : {
        type : String,
        required : true,
        unique : true,
        trim : true
    },
    fullName : {
        type : String,
        required : true,
        trim : true,
        index : true

    },
    watchHistory : [
        {
        type : Schema.Types.ObjectId,
        ref : "Video"
        }
      ],
    password : {
        type : String,
        required : [true, 'password is required']
    },

    coverPhoto : {
        type : String, // cloudinary use url //
        
    },
    avatar : {
        type : String,
        required : true
    },
    refreshToken : {
        type : String
    }

}, {timestamps : true})


userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next()
    this.password = bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
 return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    jwt.sign({
        _id: user_id,
        userName : this.userName,
        email : this.email,
        fullName : this.fullName

    },
    process.env.ACCESS_TOKEN_SECRET,

    {expiresIn : process.env.ACCESS_TOKEN_EXPIRY}
)
}

userSchema.methods.generateRefreshToken = function (){
        return jwt.sign(
            {
               _id : this.id
        },
            process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    )
}


export const User = mongoose.model('User', userSchema)