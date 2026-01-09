import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";


const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}
))

app.use(express.json({limit : "16kb"}))

app.use(express.urlencoded({extended : true,
    limit : "16kb"
}))

app.use(express.static("Public"))

app.use(cookieParser())


import userRouter from './routes/user.routes.js';
import commentRouter from "./routes/comment.routes.js"


app.use("/api/v1/users", userRouter)

app.use("/api/v1/comments", commentRouter)



export default app;