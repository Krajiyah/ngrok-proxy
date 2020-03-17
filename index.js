const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const redis = require("redis")
const client = redis.createClient(process.env.REDIS_URL)
const app = express()
const ngrokRedisKey = "ngrok"
const noUrlRoute = "https://google.com"
 
const getNgrokUrl = () => new Promise((resolve, reject) => client.get(ngrokRedisKey, (err, value) => err ? reject(err) : resolve(value)))

const updateNgrokUrl = url => {
    client.set(ngrokRedisKey, url)
    options.target = url
    return true
}

const customRouter = function(req) {
    return 'https://www.example.org'; // protocol + host
}

const options = {target: noUrlRoute, router: customRouter, changeOrigin: true}

;(async() => {
    try {
        options.target = (await getNgrokUrl()) || noUrlRoute
    } catch(err) {
        console.error(err)
    }
    const myProxy = createProxyMiddleware(options)
    app.use(myProxy)
    app.post('/ngrok', (req, res) => updateNgrokUrl(req.body.url) && res.send("saved"))
    app.listen(process.env.PORT || 3000)
})()