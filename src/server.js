import dotenv from 'dotenv'
import  {connectDB}  from './db/index.js'

dotenv.config({
    path: './env'
})


// /* second method 
//        ......
//          ..
// */
     
connectDB()
.then(()=>{
     app.listen(process.env.PORT || 3002, () => {
        console.log(`Server is running on local host ${process.env.PORT}`)
     
     })
})
.catch((err)=>{
console.log('db connection failed ', err)
})




// const serverStart = async()=>{

//     try {
//         await connectDB()
//         app.listen(process.env.PORT, ()=>{
//                 console.log(`server is running on ${process.env.PORT}`)
//         })
//     } catch (error) {
//         console.log('db connection failed', error)
//     }
// }
// serverStart();




