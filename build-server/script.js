const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const mime = require('mime-types')
const Redis = require('ioredis')
const publisher = new Redis('rediss://default:AVNS_ZpMogP8H9HevNJ_dxIA@caching-3889ddb-rajiniv444-ecca.d.aivencloud.com:12302')

function publishLog(log) {
    publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }))
}


const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: 'AKIAU6GDYODG4GH2OMUS',
        secretAccessKey: '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',
    },
  });


  


const PROJECT_ID = process.env.PROJECT_ID

async function init() {
    console.log('Executing script.js')
    publishLog('Build Started...')
    const outDirPath = path.join(__dirname, 'output')

    const p = exec(`cd ${outDirPath} && npm install && npm run build`)

    p.stdout.on('data', function (data) {
        console.log(data.toString())
        publishLog(data.toString())
        

    })

    p.stdout.on('error', function (data) {
        console.log('Error', data.toString())
        publishLog(`error: ${data.toString()}`)
        
    })

    p.on('close', async function () {
        console.log('Build Complete')
        publishLog(`Build Complete`)
        const distFolderPath = path.join(__dirname, 'output', 'dist')
        const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true })

       
        for (const file of distFolderContents) {
            const filePath = path.join(distFolderPath, file)
            if (fs.lstatSync(filePath).isDirectory()) continue;

            console.log('uploading', filePath)
            publishLog(`uploading ${file}`)


            const command = new PutObjectCommand({
                Bucket: 'vercel-thanush',
                Key: `__outputs/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath)
            })

            await s3Client.send(command)
            
            console.log('uploaded', filePath)
            publishLog(`uploaded ${file}`)
        }
       
        console.log('Done...')
        publishLog(`Done`)

    })
}

init()