import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
// import {isPasswordCorrect} from '../models/user.models.js'

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

  const { username, email, fullName, password } = req.body;//1
  // console.log("req.body: ", req.body);

  if ([username, email, fullName, password].some((field) => field?.trim() === "")) { //2
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });//3
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exits");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;//4
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  // console.log("req.files: ", req.files);
  //if user doesn't upload CoverImage
  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }


  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath); //5
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar File is required");
  }

  const user = await User.create({//6
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password
  })



  const createdUser = await User.findById(user._id).select(//7
    "-password -refreshToken"
  )
  // console.log("createdUser: ", createdUser);

  if (!createdUser) {//8
    throw new ApiError(500, "Something went Wrong While Registration")
  }

  return res.status(201).json(//9
    new ApiResponse(200, createdUser, "User registered successfully")
  )

});

//For LoggedIn User
const generateAccesssAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBefore: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating referesh and access token")
  }
}

const logginUser = asyncHandler(async (req, res) => {
  //1. Get the data from req.body
  //2. username or email
  //3. Find the user
  //4. Password Check
  //5. Access & refresh Token
  //6. Send cookie

  const { username, email, password } = req.body; //1

  // console.log("req.body: ",req.body); 

  if (!email && !username) {//2
    throw new ApiError(400, "Invalid Credential");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] }); //3
  if (!user) {
    throw new ApiError(404, "User does not exits");
  }

  // console.log("User: ", user);
  
  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
   throw new ApiError(401, "Invalid user credentials")
   }

  const { accessToken, refreshToken } = await generateAccesssAndRefreshTokens(user._id);//5

  const loggedInUser = await User.findById(user._id).select("-passowrd -refreshToken");

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "User logged in successfully."
      )
    )
})

const logOutUser = asyncHandler(async (req, res)=>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{refreshToken:undefined}
    },
    {
      new:true
    }
  )
  const options = {
    httpOnly: true,
    secure: true
  }
  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged Out"))
  
})

const refreshAccessToken = asyncHandler(async(req, res)=>{
  const incomingRefreshToken = req.cookie.refreshToken || req.body?.refreshToken;

  if(!incomingRefreshToken){
    throw new ApiError(401, "Unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_ACCESS_TOKEN);

    const user = await User.findById(decodedToken?._id);

    if(!user){
      throw new ApiError(401, "Invalid Refresh Token")
    }

    if(incomingRefreshToken!==user?.refreshToken){
      throw new ApiError(400, "Refresh Token is expired or used")
    }

    const {accessToken, newRefreshToken} = generateAccesssAndRefreshTokens(user._id);

    const options = {
      httpOnly:true,
      secure:true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {accessToken, refreshToken : newRefreshToken},
        "Access Token Refreshed"
      )
    )
    


  } catch (error) {
    ApiError(400, error?.message || "Invalid refresh token");
  }
})

const changeCurrentPassword = asyncHandler(async (req, res)=>{

  const {oldPassword, newPassword, confirmPassword} = req.body;

  if(!(newPassword===confirmPassword)){
    throw new ApiError(400, "confirm password is not same");
  }
  
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if(!isPasswordCorrect){
    throw new ApiError(400, "Old Password is invalid");
  }

  user.password = newPassword;

  user.save({validateBefore:false});

  return res
  .status(200)
  .json( new ApiResponse(200, {}, "Password changed Successfull"));
})

const getCurrentUser = asyncHandler(async (req, res)=>{
  return res
  .status(200)
  .json(200, req.user, "fetched user successfully");
})

const updateAccountDetails = asyncHandler (async(req, res)=>{
  const {fullName, email} = req.body;

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName:fullName, // onother way "$set:{fullName, email}"
        email:email 
      }
    },
    { new:true }
  ).select("-password")
  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updated Successfully"))

})

const updateUserAvatar = asyncHandler(async(req, res)=>{
  const avatarLocalPath = req.file?.path;

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = uploadOnCloudinary(avatarLocalPath);

  if(!avatar){
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{avatar:avatar.url}
    },
    {new:true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Avatar updated successfully"))

})

const updateUserCoverImage = asyncHandler(async(req, res)=>{
  const coverImageLocalPath = req.file?.path;

  if(!coverImageLocalPath){
    throw new ApiError(400, "CoverImage file is missing");
  }

  const coverImage = uploadOnCloudinary(coverImageLocalPath);

  if(!coverImage){
    throw new ApiError(400, "Error while uploading CoverImage");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{coverImage:coverImage.url}
    },
    {new:true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "CoverImage updated successfully"))

})



export { registerUser, logginUser, logOutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage };
