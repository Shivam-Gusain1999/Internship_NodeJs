import { text } from "express";
import mongoose, { Schema } from "mongoose";
import { User } from "./user.model";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const subscriptionSchema = new mongoose.Schema({

subscriber :{
    type : Schema.Types.ObjectId,
    ref: "User"
},

channel : {
    type : Schema.Types.ObjectId,
    ref : "User"
}

}, {timestamps : true})

subscriptionSchema.plugin(mongooseAggregatePaginate)

export const Subscription = mongoose.model(Subscription, subscriptionSchema);