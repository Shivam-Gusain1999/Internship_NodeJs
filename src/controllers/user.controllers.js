import asyncHandler from "../db/utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res)=> {
    res.status(200).json({
        message: 'working properly'
    })
})

export {registerUser}