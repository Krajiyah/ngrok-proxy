const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const { Sequelize, Model, DataTypes } = require('sequelize')
const app = express()
const domain = process.env.DOMAIN
const port = process.env.PORT
const dbUrl = process.env.DATABASE_URL
const sequelize = new Sequelize(dbUrl, {dialect: 'postgres'})
const defaultRootUrl = 'https://google.com'

class Proxy extends Model {}
Proxy.init({
    subdomain: DataTypes.STRING,
    dst: DataTypes.STRING
}, { sequelize, modelName: 'proxy' })

const getDefaultProxyTable = () => {
    const table = {}
    table['1.'+domain] = 'https://bing.com'
    table['2.'+domain] = 'https://yahoo.com'
    table['www.'+domain] = defaultRootUrl
    return table
}
 
const getProxyInfo = async() => {
    const proxies = await Proxy.findAll()
    if (proxies.length == 0) return {router: getDefaultProxyTable(), target: defaultRootUrl}
    return proxies.reduce((info, proxy) => {
        if (proxy.subdomain == 'www') {
            info.target = proxy.dst
        }
        info.router[proxy.subdomain + '.' + domain] = proxy.dst
        return info
    }, {router: {}, target: defaultRootUrl})
}

const updateNgrokUrl = async (subdomain, dst) => {
    const proxy = await Proxy.findOrCreate({where:{subdomain}})
    await proxy.update({dst})
    const info = await getProxyInfo()
    Object.assign(options, info)
}

const refreshInfo = async() => {
    const info = await getProxyInfo()
    Object.assign(options, info)
}

const postHandler = async(req, res) => {
    try {
        await updateNgrokUrl(req.params.subdomain, req.body.url)
        res.send("saved")
    } catch(err) {
        console.error(err)
        res.send('could not save :(')
    }
}

const proxyTable = {}
proxyTable['1.'+domain] = 'https://bing.com'
proxyTable['2.'+domain] = 'https://yahoo.com'

const options = {target: 'https://google.com', router: proxyTable, changeOrigin: true}

;(async() => {
    try {
        await sequelize.sync()
        await refreshInfo()
    } catch(err) {
        console.error(err)
    }
    app.use(createProxyMiddleware(options))
    app.post('/ngrok/:subdomain', postHandler)
    app.listen(port || 3000)
})()