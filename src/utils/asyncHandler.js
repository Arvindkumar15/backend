//Promise
const asyncHandler=(requestHandler)=>{
    return (req, res, next)=>{
        Promise.resolve(requestHandler(req, res, next)).catch((err)=>next(err));
    }
}
export {asyncHandler}






/*
//try&catch Method

// const asyncHandler=()=>{}//1
// const asyncHandler=(fun)=>()=>{}//2
// const asyncHandler = (fun) = () =>{} //3 => 2 & 3 are same

const asyncHandler=(fun)=async (req, res, next)=>{
    try {
        await fun(req, res, next)
        
    } catch (error) {
        res.status(err.code || 500).json({
            success:false,
            message:err.message
        })
    }
}

*/