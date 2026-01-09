import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import ApiError from "../db/utils/ApiErrors.js";
import asyncHandler from "../db/utils/asyncHandler.js";
import { ApiResponse } from "../db/utils/ApiResponse.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
   
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
  
    const {videoId} = req.params;
    const {content} = req.body;
    const {userId} = req.user?._id

    if(!videoId){
            throw new ApiError(400, "videoId is required")
    }

    if(!content || content.trim()){
            throw new ApiError(400, "content is required")
    }
   
      const video = await Video.findById(videoId)
      if(!video){
        throw new ApiError(400, "video is required")
      }

      Comment.create({
        content : content?.trim(),
        video : video?.id,
        owner : user_id

      })


    Comment.create({

    })

 

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
