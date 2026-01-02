import express from "express";
import cookieParser from "cookie-parser";

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    crdentials: true
}
))

app.use(express.json({limit : "16kb"}))

app.use(express.urlencoded({extended : true,
    limit : "16kb"
}))

app.use(express.static("Public"))

app.use(cookieParser())






export default app;