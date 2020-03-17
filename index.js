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
    path: DataTypes.STRING,
    dst: DataTypes.STRING
}, { sequelize, modelName: 'proxy' })

const getDefaultProxyTable = () => {
    const table = {}
    table[domain+'/bing'] = 'https://bing.com'
    table[domain+'/yahoo'] = 'https://yahoo.com'
    return table
}
 
const getProxyInfo = async() => {
    const proxies = await Proxy.findAll()
    if (proxies.length == 0) return {router: getDefaultProxyTable(), target: defaultRootUrl}
    return proxies.reduce((info, proxy) => {
        if (proxy.path == '/') {
            info.target = proxy.dst
        }
        info.router[domain + proxy.path] = proxy.dst
        return info
    }, {router: {}, target: defaultRootUrl})
}

const updateNgrokUrl = async (path, dst) => {
    const proxy = await Proxy.findOrCreate({where:{path}})
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
        await updateNgrokUrl(req.body.path, req.body.url)
        res.send("saved")
    } catch(err) {
        console.error(err)
        res.send('could not save :(')
    }
}

const options = {target: 'https://google.com', router: getDefaultProxyTable(), changeOrigin: true}

;(async() => {
    try {
        await sequelize.sync({force: true})
        await refreshInfo()
    } catch(err) {
        console.error(err)
    }
    app.use('/proxy', createProxyMiddleware(options))
    app.post('/ngrok', postHandler)
    app.listen(port || 3000)
})()