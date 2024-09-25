const express = require('express')
const { generateSlug } = require('random-word-slugs')
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs')
const { Server } = require('socket.io')
const Redis = require('ioredis')
const cors  =require('cors')



const app = express()
const PORT = 9000

app.use(cors())

const subscriber = new Redis('rediss://default:AVNS_ZpMogP8H9HevNJ_dxIA@caching-3889ddb-rajiniv444-ecca.d.aivencloud.com:12302')

const io = new Server({ cors: '*' })

io.on('connection', socket => {
    socket.on('subscribe', channel => {
        socket.join(channel)
        socket.emit('message', `Joined ${channel}`)
    })
})

io.listen(9002, () => socket.emit('message'))

const ecsClient = new ECSClient({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: 'AKIAU6GDYODG4GH2OMUS',
        secretAccessKey: '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'
    }
})

const config = {
    CLUSTER: 'arn:aws:ecs:ap-south-1:339712962765:cluster/builder-cluster1',
    TASK: 'arn:aws:ecs:ap-south-1:339712962765:task-definition/builder-task:1'
}

app.use(express.json())

app.post('/project', async (req, res) => {
    const { gitURL, slug } = req.body
    const projectSlug = slug ? slug : generateSlug()

    // Spin the container
    const command = new RunTaskCommand({
        cluster: config.CLUSTER,
        taskDefinition: config.TASK,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                assignPublicIp: 'ENABLED',
                subnets: ['subnet-0310281c38b04cc98', 'subnet-05d09da6975d4a4f3', 'subnet-09645c370854ef9b6'],
                securityGroups: ['sg-0c46cfa3d7a7815ec']
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: 'Builder-image',
                    environment: [
                        { name: 'GIT_REPOSITORY__URL', value: gitURL },
                        { name: 'PROJECT_ID', value: projectSlug }
                    ]
                }
            ]
        }
    })

    await ecsClient.send(command);

    return res.json({ status: 'queued', data: { projectSlug, url: `http://${projectSlug}.localhost:8000` } })

})

async function initRedisSubscribe() {
    console.log('Subscribed to logs....')
    subscriber.psubscribe('logs:*')
    subscriber.on('pmessage', (pattern, channel, message) => {
        io.to(channel).emit('message', message)
    })
}


initRedisSubscribe()

app.listen(PORT, () => console.log(`API Server Running..${PORT}`))