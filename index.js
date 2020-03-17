const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const redis = require("redis")
const client = redis.createClient(process.env.REDIS_URL)
const app = express()
const ngrokRedisKey = "ngrok"
const noUrlRoute = "/no_url"
 
const getNgrokUrl = () => new Promise((resolve, reject) => client.get(ngrokRedisKey, (err, value) => err ? reject(err) : resolve(value)))

const updateNgrokUrl = url => {
    client.set(ngrokRedisKey, url)
    options.target = url
    return true
}

const options = {target: noUrlRoute}

;(async() => {
    try {
        options.target = await getNgrokUrl()
    } catch(err) {
        console.error(err)
    }
})()

const myProxy = createProxyMiddleware(options)
app.use(myProxy)
app.get(noUrlRoute, (_, res) => res.send("no url has been set"))
app.post('/ngrok', (req, res) => updateNgrokUrl(req.body.url) && res.send("saved"))
app.listen(process.env.PORT || 3000)