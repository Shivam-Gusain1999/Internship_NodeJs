import ApiError from "../db/utils/ApiErrors.js";
import asyncHandler from "../db/utils/asyncHandler.js";
import { uploadOnCloudinary } from "../db/utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../db/utils/ApiResponse.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)

    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating tokens"
    )
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, userName, password } = req.body

  if ([fullName, email, userName, password].some(f => !f?.trim())) {
    throw new ApiError(400, "All fields are required")
  }

  const existedUser = await User.findOne({
    $or: [
      { userName: userName.toLowerCase() },
      { email: email.toLowerCase() }
    ]
  })

  if (existedUser) {
    throw new ApiError(409, "User already exists")
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  const coverImageLocalPath = req.files?.coverImage?.[0]?.path

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  if (!avatar?.url) {
    throw new ApiError(400, "Avatar upload failed")
  }

  let coverImage = ""
  if (coverImageLocalPath) {
    const uploadedCover = await uploadOnCloudinary(coverImageLocalPath)
    coverImage = uploadedCover?.secure_url || ""
  }

  let user
  try {
    user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      userName: userName.toLowerCase().trim(),
      password,
      avatar: avatar.url,
      coverImage
    })
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "Username or email already exists")
    }
    throw error
  }

  const createdUser = await User.findById(user._id)
    .select("-password -refreshToken")

  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully")
  )
})





  const loginUser = asyncHandler(async (req, res) => {
    // console.log("STEP 1: Controller hit hua")
    // console.log("BODY ->", req.body)
  const { email, userName, password } = req.body

  if (!email && !userName) {
    throw new ApiError(400, "Email or username is required")
  }

  const user = await User.findOne({
    $or: [
      { email: email?.toLowerCase() },
      { userName: userName?.toLowerCase() }
    ]
  })

  if (!user) {
    throw new ApiError(404, "User does not exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)
  if (!isPasswordValid) {
    throw new ApiError(401, "Password wrong hai")
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    )
})


const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  )

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  }

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request")
  }

  let decoded
  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
  } catch {
    throw new ApiError(401, "Invalid refresh token")
  }

  const user = await User.findById(decoded._id)
  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token expired or reused")
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user._id)

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "Access token refreshed"
      )
    )
})

const updateCurrentUserPassword = asyncHandler(async (req, res)=>{
   console.log("update controller hit hua")
   console.log("body", req.body)
  
    const {oldpassword, newpassword} =  req.body;
   const user = await User.findById(req.user?._id);
   if(!user){
    throw new ApiError(400, "user is not login")
   }

   const isPasswordCorrect= await user.isPasswordCorrect(oldpassword)
   if(!isPasswordCorrect){
      throw new ApiError(400, "old password is incorrect")
   }

   user.password = newpassword
  await user.save({validateBeforeSave : false})

  return res
  .status(200).json(new ApiResponse(200, {}, "password updated successfully"))

})


const getCurrentUser = asyncHandler( async(req, res)=>{
    const user = await User.findById(req.user?._id).select("-password -refreshToken")
    if (!user) {
      throw new ApiError(404, "User not found")
    }
    return res.status(200).json(new ApiResponse(200, user, "current user fetched successfully"))
})


const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body

  // validation
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email
      }
    },
    { new: true }
  ).select("-password -refreshToken")

  if (!user) {
    throw new ApiError(404, "User not found")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "Account details updated successfully"
      )
    )
})

const updateUserAvatar = asyncHandler(async (req, res)=>{
    const avatarLocalPath = req.file?.path
  if(!avatarLocalPath){
      throw new ApiError(400, "avatar photo required")
  }
  const avatar = uploadOnCloudinary(avatarLocalPath)

  if(!avatar){
    throw new ApiError(400, "not uploaded on cloudinary")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {$set : {avatar : avatar.url}
    },
    {new : true}
  ).select("-password -refreshToken")
  return res.status(200).json(new ApiResponse(200, user, "avatar image successfuly uploaded"))

})




const updateCoverPath = asyncHandler(async (req, res)=>{
    const coverImageLocalPath = req.file?.path
  if(!coverImageLocalPath){
      throw new ApiError(400, "coverImage photo required")
  }
  const avatar = uploadOnCloudinary(coverImageLocalPath)

  if(!avatar){
    throw new ApiError(400, "not uploaded on cloudinary")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {$set : {avatar : avatar.url}
    },
    {new : true}
  ).select("-password -refreshToken")
  
  return res.status(200).json(new ApiResponse(200, user, "cover image successfuly uploaded"))

})

const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.query

  if (!userId) {
    throw new ApiError(400, "User ID is required")
  }

  const user = await User.findById(userId).select("-password -refreshToken")

  if (!user) {
    throw new ApiError(404, "User not found")
  }

  return res.status(200).json(new ApiResponse(200, user, "User fetched successfully"))
})



// 

//

//





const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})




const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                         avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateCurrentUserPassword,
  getCurrentUser, 
  updateAccountDetails,
  updateUserAvatar,
  updateCoverPath,
  getUserById,
  getUserChannelProfile,
  getWatchHistory
  
}













// const generateAccessAndRefereshTokens = async(userId) =>{
//     try {
//         const user = await User.findById(userId)
//         const accessToken = user.generateAccessToken()
//         const refreshToken = user.generateRefreshToken()

//         user.refreshToken = refreshToken
//         await user.save({ validateBeforeSave: false })

//         return {accessToken, refreshToken}


//     } catch (error) {
//         throw new ApiError(500, "Something went wrong while generating referesh and access token")
//     }
// }





// const registerUser = asyncHandler(async (req, res) => {

//   const { fullName, email, userName, password } = req.body;

//   console.log(fullName, email, userName, password); 

//   if ([fullName, email, userName, password].some(
//       field => !field || field.trim() === ""
//   )) {
//     throw new ApiError(400, "All fields are required");
//   }

//   const existedUser = await User.findOne({
//     $or:[{ userName }, {email}]
//   })
//   if(existedUser){
//     throw new ApiError(409, 'user is already exist')
//   }

//   const avatarLocalPath = req.files?.avatar[0]?.path;

//   // console.log("avatar file upload hue");
  
//   // const coverImageLocalPath = req.files?.coverImage[0]?.path ?? null

//   let coverImageLocalPath;

// if (
//   req.files &&
//   Array.isArray(req.files.coverImage) &&
//   req.files.coverImage.length > 0
// ) {
//   coverImageLocalPath = req.files.coverImage[0].path;
// }


//   // console.log("cover file upload hue")

//   if(!avatarLocalPath){
//         throw new ApiError(404, 'avatarLocal file is required')
//   }

//  const avatar =  await uploadOnCloudinary(avatarLocalPath)
// //  console.log("kuch to dikkt hai part 1")
//  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
// //  console.log("part 2 error")

//  if(!avatar) {
//     throw new ApiError(400, "avatar file ke jarurt hai required")
//  }
//    const user = await User.create({
//         fullName,
//         avatar : avatar.url,
//         coverImage : coverImage?.secure_url || "",
//         email,
//         password,
//         userName : userName.toLowerCase()
//     })



//  const createdUser = await User.findById(user._id).select( "-password -refreshToken" )
//     if(!createdUser){
//      throw new ApiError(500, "something went wrong creating the registering user")
// }


// return res.status(201).json(
//     new ApiResponse(201, createdUser, "user register successfully")
// )

// });


// const loginUser = asyncHandler(async (req, res) =>{
//     // req body -> data
//     // username or email
//     //find the user
//     //password check
//     //access and referesh token
//        //send cookie

//     const {email, username, password} = req.body
//     console.log(email);

//     if (!username && !email) {
//         throw new ApiError(400, "username or email is required")
//     }


//     const user = await User.findOne({
//         $or: [{username}, {email}]
//     })

//     if (!user) {
//         throw new ApiError(404, "User does not exist")
//     }

//    const isPasswordValid = await user.isPasswordCorrect(password)

//    if (!isPasswordValid) {
//     throw new ApiError(401, "Invalid user credentials")
//     }

//    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

//     const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res
//     .status(200)
//     .cookie("accessToken", accessToken, options)
//     .cookie("refreshToken", refreshToken, options)
//     .json(
//         new ApiResponse(
//             200, 
//             {
//                 user: loggedInUser, accessToken, refreshToken
//             },
//             "User logged In Successfully"
//         )
//     )

// })

// const logoutUser = asyncHandler(async(req, res) => {
//     await User.findByIdAndUpdate(
//         req.user._id,
//         {
//             $unset: {
//                 refreshToken: 1 // this removes the field from document
//             }
//         },
//         {
//             new: true
//         }
//     )

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res
//     .status(200)
//     .clearCookie("accessToken", options)
//     .clearCookie("refreshToken", options)
//     .json(new ApiResponse(200, {}, "User logged Out"))
// })

// const refreshAccessToken = asyncHandler(async (req, res) => {
//     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

//     if (!incomingRefreshToken) {
//         throw new ApiError(401, "unauthorized request")
//     }

//     try {
//         const decodedToken = jwt.verify(
//             incomingRefreshToken,
//             process.env.REFRESH_TOKEN_SECRET
//         )
    
//         const user = await User.findById(decodedToken?._id)
    
//         if (!user) {
//             throw new ApiError(401, "Invalid refresh token")
//         }
    
//         if (incomingRefreshToken !== user?.refreshToken) {
//             throw new ApiError(401, "Refresh token is expired or used")
            
//         }
    
//         const options = {
//             httpOnly: true,
//             secure: true
//         }
    
//         const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
//         return res
//         .status(200)
//         .cookie("accessToken", accessToken, options)
//         .cookie("refreshToken", newRefreshToken, options)
//         .json(
//             new ApiResponse(
//                 200, 
//                 {accessToken, refreshToken: newRefreshToken},
//                 "Access token refreshed"
//             )
//         )
//     } catch (error) {
//         throw new ApiError(401, error?.message || "Invalid refresh token")
//     }

// })




// export { registerUser, loginUser, logoutUser };
