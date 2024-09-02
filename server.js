const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const jwt=require("jsonwebtoken")
const cors=require("cors");
const {v4 : uuidv4} =require("uuid");
const bcrypt=require("bcrypt")
const databasePath = path.join(__dirname, "storage.db");

const app = express();
app.use(cors())
app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(7000, () =>
      console.log("Server Running at http://localhost:7000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();


const authenticateToken=async (request,response,next)=>{
     const {username,password}=request.body;
     const userQuery=`select * from Users where username= '${username}';`;
    const dbuser =await database.get(userQuery)
    
    if (dbuser===undefined){
      response.send({"msg":"user doesn't exist","ok":"false"})
    }
    else if (await bcrypt.compare(password,dbuser.password)===false){
        response.send({"msg":"password doesn't matched","ok":"false"})
    }
    else{
       const payload={username}
      const token= jwt.sign(payload,"my_secret_token")
      request.role=dbuser.role;
     request.token=token;
     next();
    }
    
}


app.post("/login",authenticateToken,(request,response)=>{
    response.send({"ok":"true","token":request.token,"msg":"login successful","role":request.role})
 
})

app.post("/signup", async (request,response)=>{
  const data=request.body
  const {username,password,role,gradeorSubject}=data
  const hashedpassword= await bcrypt.hash(password,10)
  const userQuery=`select * from Users where username= '${username}';`;
  const dbuser =await database.get(userQuery)

  if(dbuser!==undefined){
    response.send({"ok":"false","msg":"Username Already Exists"})
  }
  else{
       let uniqueId=uuidv4();
       const adduserQuery=`INSERT INTO Users (user_id,username,password,role) values(
      '${uniqueId}',
      '${username}',
      '${hashedpassword}',
       '${role}'
       );`;

       const newUser=await database.run(adduserQuery)
       const lastID=newUser.lastID;
       let addQuery;
       if (role==="teacher"){
          addQuery=`INSERT INTO Teachers(teacher_id,name,subject,user_id) VALUES('${uuidv4()}','${username}','${gradeorSubject}','${uniqueId}');`;
       }
       else{
        addQuery=`INSERT INTO Students(student_id,name,grade,user_id) VALUES('${uuidv4()}','${username}','${gradeorSubject}','${uniqueId}');`;
       }
       
       const newresponse=await database.run(addQuery);
       console.log(newresponse.lastID)
      response.send({"ok":"true","msg":"User successfully created","lastID":'${lastID}'})
      }
  
})

app.get("/",async (request,response)=>{
  let {role,username}=request.query
  let addQuery;
       if (role==="teacher"){
          addQuery=`SELECT * FROM TEACHERS;`;
       }
       else{
          addQuery=`SELECT * FROM STUDENTS;`;
       }
  let userQuery=`SELECT username FROM USERS where username='${username}';`;
  const user=await database.get(userQuery)     
 
  const usersdetails=await database.all(addQuery)
  const alldata={"users":usersdetails,"user":user}
  console.log(alldata)
  response.send(alldata);
})
