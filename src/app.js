import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}));

app.use(express.json({limit:"16kb"})); //get data in json format
app.use(express.urlencoded({extended:true, limit:"16kb"}));//get data in url format
app.use(express.static("public")); //store static data
app.use(cookieParser()); //for cookies Parser 


// routers import
import userRouter from "./routes/user.routes.js"

//router declaration
app.use("/api/v1/users", userRouter);

// http://localhost:8000/api/v1/users/register

export  {app};