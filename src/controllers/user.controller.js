import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //1. Get user details from frontend
  //2. Validation -> Not Empty 
  //3. Check if user alredy exits -> email or username 
  //4. Check for image , avatar image 
  //5. Upload them to cloudinary
  //6. Create user object -> Create entry in DB 
  //7. Remove password & refresh token filed from responce 
  //8. Check for user creation
  //9. Return reponse else error

  const {username, email, fullName, password} = req.body;//1

  if([username, email, fullName, password].map((field)=>field===""?true:false)){ //2
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = User.findOne({ $or:[{username}, {email}]});//3
  if(existedUser){
    throw new ApiError(409, "User with email or username already exits");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;//4
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar File is required");
  }

  const avatar = uploadOnCloudinary(avatarLocalPath); //5
  const coverImage = uploadOnCloudinary(coverImageLocalPath);

  const user = await User.create({//6
    username:username.toLowerCase(),
    email,
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url||"",
    password
  })

  const createdUser = await User.findById(user._id).select(//7
    "-password -refreshToken"
  )

  if(!createdUser){//8
    throw new ApiError(500, "Something went Wrong While Registration")
  }

  return res.status(201).json(//9
    new ApiResponse(200, createdUser, "User registered successfully")
  )

});

export { registerUser };
