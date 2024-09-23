const {exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const {PutObjectCommand, S3Client} = require('@aws-sdk/client-s3')
const mime = require('mime-types')

const S3Client = new S3Client({
    region:'ap-south-1',
    Credential:{
        accessKeyid:'AKIAU6GDYODG55CEGDAT',
        secretAccessKey:'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'
    }
})

const PROJECT_ID = process.env.PROJECT_ID
async function init() {
    console.log("Executing Script.js")
    const outDirPath = path.join(__dirname,'output')
    const p = exec(`cd ${outDirPath} && npm install npm run build`)

   p.stdout.on("data",function (data){
    console.log(data.toString())

   })

   p.stdout.on('error',function(data){
    console.log('Error',data.toString())
   })

   p.on('close',async function(){
      console.log("build Complete")

      const distFolderpath = path.join(__dirname,'output','dist')

      const distFoldercontent = fs.readdirSync(distFolderpath,{recursive:true})

      console.log("uploading",filepath)


      for(const filepath of distFoldercontent){
        if(fs.lstatSync(filepath).isDirectory) continue;

            const command = new PutObjectCommand({
                Bucket:'',
                Key:`__outputs/${PROJECT_ID}/${filepath}`,Body:fs.createReadStream(filepath),
                ContentType: mime.lookup(filepath)
            })

            await S3Client.send(command)
            console.log("uploaded",filepath)
      }

      console.log("Done....")
   }) 
}

init()