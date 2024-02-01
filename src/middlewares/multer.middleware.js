import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'D:/Web Development/Backend Chai/backend/public/temp')
    },
    filename: function (req, file, cb) {
        // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) 
        // cb(null, file.fieldname + '-' + uniqueSuffix) //These two line provide the unique file name 

        cb(null, file.originalname); //Original Name of file
    }
  })
  
  export const upload = multer({ storage })